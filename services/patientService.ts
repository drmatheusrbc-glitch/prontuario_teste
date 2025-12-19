
import { supabase } from './supabaseClient';
import { Patient } from '../types';

const CACHE_KEY = 'recmed_data_cache';

/**
 * Gets data from local storage safely.
 */
const getLocalData = (): Patient[] => {
  try {
    const data = localStorage.getItem(CACHE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Error reading from local storage:", e);
    return [];
  }
};

/**
 * Saves data to local storage with aggressive compression/thinning if quota is exceeded.
 * Medical images (base64) are the primary cause of quota issues.
 */
const setLocalData = (data: Patient[]) => {
  const sorted = [...data].sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0));
  
  try {
    // Attempt 1: Store everything
    localStorage.setItem(CACHE_KEY, JSON.stringify(sorted));
  } catch (e) {
    console.warn("Local storage quota exceeded. Applying 'Thin Cache' strategy...");
    
    // Attempt 2: Strip ALL heavy image data from the cache (Cloud remains the source of truth for images)
    const thinData = sorted.map(p => ({
      ...p,
      imaging: (p.imaging || []).map(img => ({ ...img, attachmentData: undefined }))
    }));

    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(thinData));
    } catch (innerE) {
      // Attempt 3: If still failing, store only the 30 most recent patients without images
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(thinData.slice(0, 30)));
      } catch (finalE) {
        // Last resort: Clear it. Sync will recover from Cloud on next load.
        localStorage.removeItem(CACHE_KEY);
      }
    }
  }
};

/**
 * BUSCA PACIENTES (GET)
 * Prioritizes Cloud data and updates local cache.
 */
export const getPatients = async (): Promise<Patient[]> => {
  try {
    console.log("Fetching fresh data from cloud...");
    const { data: cloudRows, error } = await supabase
      .from('patients')
      .select('data');
    
    if (error) throw error;
    
    const cloudPatients = cloudRows ? cloudRows.map((row: any) => row.data) as Patient[] : [];
    const localPatients = getLocalData();
    
    // If cloud is empty but local has data, push local to cloud (initial sync or migration)
    if (cloudPatients.length === 0 && localPatients.length > 0) {
      for (const p of localPatients) {
        await supabase.from('patients').upsert({ id: p.id, data: p });
      }
      return localPatients;
    }

    // Merge Logic: Cloud is the primary truth.
    // Local data is only preferred if its lastModified timestamp is strictly GREATER than the cloud version.
    const finalMap = new Map<string, Patient>();

    // 1. Load cloud data
    cloudPatients.forEach(p => finalMap.set(p.id, p));

    // 2. Check for local changes not yet in cloud
    localPatients.forEach(lp => {
      const cp = finalMap.get(lp.id);
      if (!cp || (lp.lastModified || 0) > (cp.lastModified || 0)) {
        finalMap.set(lp.id, lp);
        // Sync local-only or newer-local changes to cloud in background
        supabase.from('patients').upsert({ id: lp.id, data: lp }).catch(err => console.error("Background sync failed", err));
      }
    });

    const finalPatients = Array.from(finalMap.values())
      .filter(p => p && p.id && p.firstName)
      .sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0));

    setLocalData(finalPatients);
    return finalPatients;
  } catch (err: any) {
    console.error('Cloud fetch failed. Operating in Offline Mode.', err);
    return getLocalData();
  }
};

/**
 * SALVA PACIENTE (POST/PUT)
 * Ensures data is saved locally first, then attempts cloud sync with image preservation.
 */
export const savePatient = async (patient: Patient) => {
  const now = Date.now();
  const updatedPatient = { ...patient, lastModified: now };

  // 1. Update local cache immediately (Optimistic UI)
  const currentLocal = getLocalData();
  const filtered = currentLocal.filter(p => p.id !== patient.id);
  setLocalData([updatedPatient, ...filtered]);

  // 2. Persist to Cloud
  try {
    // Critical: If the local object has 'undefined' image data (due to cache thinning),
    // we MUST merge with existing cloud data to avoid deleting images on the server.
    const { data: existing } = await supabase
      .from('patients')
      .select('data')
      .eq('id', patient.id)
      .maybeSingle();

    let dataToUpload = { ...updatedPatient };

    if (existing?.data) {
      const cloudData = existing.data as Patient;
      // Rehydrate image data from cloud if local copy is thinned
      dataToUpload.imaging = (updatedPatient.imaging || []).map(localImg => {
        if (!localImg.attachmentData) {
          const cloudImg = cloudData.imaging?.find(ci => ci.id === localImg.id);
          if (cloudImg?.attachmentData) return cloudImg;
        }
        return localImg;
      });
    }

    const { error } = await supabase
      .from('patients')
      .upsert({ 
        id: patient.id, 
        data: dataToUpload,
        last_modified_at: new Date().toISOString() 
      }, { onConflict: 'id' });

    if (error) throw error;
    console.log("Cloud sync successful for patient:", patient.id);
  } catch (err: any) {
    console.error("Cloud sync failed. Data is only saved on this device.", err);
    throw new Error("Alteração salva apenas localmente. Verifique sua conexão.");
  }
};

export const deletePatient = async (id: string) => {
  // Update local
  const current = getLocalData();
  setLocalData(current.filter(p => p.id !== id));
  
  // Update cloud
  try {
    const { error } = await supabase.from('patients').delete().eq('id', id);
    if (error) throw error;
  } catch (err) {
    console.error("Error deleting from cloud:", err);
  }
};

/**
 * Real-time subscription to cloud changes.
 */
export const subscribeToChanges = (callback: () => void) => {
  const channel = supabase
    .channel('db-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'patients' }, (payload) => {
      console.log('Real-time update received from cloud!');
      callback();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
