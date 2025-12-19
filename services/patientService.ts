
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
 */
const setLocalData = (data: Patient[]) => {
  const sorted = [...data].sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0));
  
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(sorted));
  } catch (e) {
    console.warn("Local storage quota exceeded. Applying 'Thin Cache' strategy...");
    
    // Strip heavy image data from ALL patients for the local cache
    const thinData = sorted.map(p => ({
      ...p,
      imaging: (p.imaging || []).map(img => ({ ...img, attachmentData: undefined }))
    }));

    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(thinData));
    } catch (innerE) {
      try {
        // Extreme thinning: keep only basic info for top 20 patients
        const ultraThinData = thinData.slice(0, 20).map(p => ({
          id: p.id,
          firstName: p.firstName,
          lastName: p.lastName,
          bed: p.bed,
          hospital: p.hospital,
          lastModified: p.lastModified,
          admissionDate: p.admissionDate
        }));
        localStorage.setItem(CACHE_KEY, JSON.stringify(ultraThinData));
      } catch (finalE) {
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
    const { data: cloudRows, error } = await supabase
      .from('patients')
      .select('data');
    
    if (error) throw error;
    
    const cloudPatients = cloudRows ? cloudRows.map((row: any) => row.data) as Patient[] : [];
    const localPatients = getLocalData();
    
    // Merge Logic: Cloud is the primary truth.
    const finalMap = new Map<string, Patient>();

    // 1. Load cloud data
    cloudPatients.forEach(p => {
      if (p && p.id) finalMap.set(p.id, p);
    });

    // 2. Check for local changes not yet in cloud
    localPatients.forEach(lp => {
      if (!lp || !lp.id) return;
      const cp = finalMap.get(lp.id);
      if (!cp || (lp.lastModified || 0) > (cp.lastModified || 0)) {
        finalMap.set(lp.id, lp);
        
        // Background sync: Supabase builders don't have .catch() directly. 
        // We use .then() with both callbacks or wrap in Promise.resolve().
        supabase
          .from('patients')
          .upsert({ id: lp.id, data: lp })
          .then(
            ({ error: syncError }) => {
              if (syncError) console.error(`Background sync failed for ${lp.id}:`, syncError);
            },
            (err) => console.error(`Background sync exception for ${lp.id}:`, err)
          );
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
    const { data: existing, error: fetchError } = await supabase
      .from('patients')
      .select('data')
      .eq('id', patient.id)
      .maybeSingle();

    if (fetchError) console.warn("Could not fetch existing patient for merge", fetchError);

    let dataToUpload = { ...updatedPatient };

    if (existing?.data) {
      const cloudData = existing.data as Patient;
      // Rehydrate image data from cloud if local copy is thinned (null/undefined attachmentData)
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
  } catch (err: any) {
    console.error("Cloud sync failed:", err);
    throw new Error("Alteração salva apenas localmente. Verifique sua conexão.");
  }
};

export const deletePatient = async (id: string) => {
  const current = getLocalData();
  setLocalData(current.filter(p => p.id !== id));
  
  try {
    const { error } = await supabase.from('patients').delete().eq('id', id);
    if (error) throw error;
  } catch (err) {
    console.error("Error deleting from cloud:", err);
  }
};

export const subscribeToChanges = (callback: () => void) => {
  const channel = supabase
    .channel('db-changes-all')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'patients' }, () => {
      callback();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
