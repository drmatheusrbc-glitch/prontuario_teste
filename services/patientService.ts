
import { supabase } from './supabaseClient';
import { Patient } from '../types';

const CACHE_KEY = 'recmed_data_cache';

const isQuotaExceeded = (e: any) => {
  return (
    e &&
    (
      e.code === 22 ||
      e.code === 1014 ||
      e.name === 'QuotaExceededError' ||
      e.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    )
  );
};

const getLocalData = (): Patient[] => {
  try {
    const data = localStorage.getItem(CACHE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

const setLocalData = (data: Patient[]) => {
  try {
    // Ordenar por modificação antes de salvar no cache para que os recentes sobrevivam a limpezas de cota
    const sorted = [...data].sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0));
    localStorage.setItem(CACHE_KEY, JSON.stringify(sorted));
  } catch (e: any) {
    if (isQuotaExceeded(e)) {
      try {
        const leanData = data.map(p => ({
          ...p,
          imaging: (p.imaging || []).map(img => ({
            ...img,
            attachmentData: undefined, 
            description: img.description.includes('(Imagem indisponível offline)') 
              ? img.description 
              : img.description + ' (Imagem indisponível offline)'
          }))
        })).sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0));
        localStorage.setItem(CACHE_KEY, JSON.stringify(leanData));
      } catch (retryError) {
         if (isQuotaExceeded(retryError)) {
            try {
               const veryLean = data.map(p => ({ ...p, imaging: [], evolutions: p.evolutions.slice(0, 5) }))
                .sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0))
                .slice(0, 30);
               localStorage.removeItem(CACHE_KEY);
               localStorage.setItem(CACHE_KEY, JSON.stringify(veryLean));
            } catch (finalError) {
               localStorage.removeItem(CACHE_KEY);
            }
         }
      }
    }
  }
};

export const getPatients = async (): Promise<Patient[]> => {
  try {
    const { data: cloudRows, error } = await supabase
      .from('patients')
      .select('data');
    
    if (error) throw error;
    
    const cloudPatients = cloudRows ? cloudRows.map((row: any) => row.data) as Patient[] : [];
    const localPatients = getLocalData();
    
    // Merge inteligente:
    // 1. Criar um mapa de todos os IDs conhecidos
    const allPatientsMap = new Map<string, Patient>();
    
    // Adicionar locais primeiro
    localPatients.forEach(p => allPatientsMap.set(p.id, p));
    
    // Sobrescrever com os da nuvem se a nuvem for mais recente ou se o local não tiver timestamp
    cloudPatients.forEach(cp => {
      const lp = allPatientsMap.get(cp.id);
      if (!lp || (cp.lastModified || 0) >= (lp.lastModified || 0)) {
        allPatientsMap.set(cp.id, cp);
      }
    });

    const finalPatients = Array.from(allPatientsMap.values())
      .filter(p => p.firstName) // Garantir que não pegamos objetos vazios
      .sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0));

    // Sincronizar de volta para a nuvem qualquer coisa que seja mais recente localmente (raro, mas possível)
    const localNewer = localPatients.filter(lp => {
      const cp = cloudPatients.find(c => c.id === lp.id);
      return !cp || (lp.lastModified || 0) > (cp.lastModified || 0);
    });

    if (localNewer.length > 0) {
      await Promise.all(localNewer.map(p => 
        supabase.from('patients').upsert({ id: p.id, data: p })
      ));
    }

    setLocalData(finalPatients);
    return finalPatients;
  } catch (err: any) {
    const localData = getLocalData();
    if (localData.length > 0) return localData; 
    throw err;
  }
};

export const savePatient = async (patient: Patient) => {
  const now = Date.now();
  const updatedPatient = { ...patient, lastModified: now };

  // 1. Local
  const current = getLocalData();
  const filtered = current.filter(p => p.id !== patient.id);
  const updatedList = [updatedPatient, ...filtered];
  setLocalData(updatedList);

  // 2. Nuvem
  try {
    const { data: cloudEntry } = await supabase
      .from('patients')
      .select('data')
      .eq('id', patient.id)
      .single();

    let finalToUpload = { ...updatedPatient };

    if (cloudEntry && cloudEntry.data) {
      const cloudPatient = cloudEntry.data as Patient;
      
      // Restaurar imagens se o local for "lean"
      finalToUpload.imaging = (updatedPatient.imaging || []).map(localImg => {
        const cloudImg = cloudPatient.imaging?.find(ci => ci.id === localImg.id);
        if (!localImg.attachmentData && cloudImg && cloudImg.attachmentData) {
          return { ...localImg, attachmentData: cloudImg.attachmentData };
        }
        return localImg;
      });
    }

    const { error } = await supabase
      .from('patients')
      .upsert({ id: patient.id, data: finalToUpload });

    if (error) throw error;
  } catch (err: any) {
    console.error('Cloud save failed, kept locally:', err);
    throw new Error('Salvo no dispositivo. Erro ao subir para nuvem.');
  }
};

export const deletePatient = async (id: string) => {
  const current = getLocalData();
  setLocalData(current.filter(p => p.id !== id));

  try {
    await supabase.from('patients').delete().eq('id', id);
  } catch (err) {}
};
