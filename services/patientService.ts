
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
    const sorted = [...data].sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0));
    localStorage.setItem(CACHE_KEY, JSON.stringify(sorted));
  } catch (e: any) {
    if (isQuotaExceeded(e)) {
      try {
        const leanData = data.map(p => ({
          ...p,
          imaging: (p.imaging || []).map(img => ({ ...img, attachmentData: undefined }))
        })).sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0)).slice(0, 50);
        localStorage.setItem(CACHE_KEY, JSON.stringify(leanData));
      } catch (err) {
        localStorage.removeItem(CACHE_KEY);
      }
    }
  }
};

/**
 * BUSCA PACIENTES (GET)
 * Prioriza baixar tudo da nuvem. Se falhar, usa o local.
 */
export const getPatients = async (): Promise<Patient[]> => {
  try {
    const { data: cloudRows, error } = await supabase
      .from('patients')
      .select('data')
      .order('id', { ascending: false }); // Apenas para garantir consistência
    
    if (error) throw error;
    
    const cloudPatients = cloudRows ? cloudRows.map((row: any) => row.data) as Patient[] : [];
    const localPatients = getLocalData();
    
    // Mapa final para merge
    const finalMap = new Map<string, Patient>();

    // 1. Carrega o que está na nuvem (Nuvem é a verdade)
    cloudPatients.forEach(p => finalMap.set(p.id, p));

    // 2. Verifica se tem algo local que é MAIS NOVO que a nuvem (e ainda não subiu)
    localPatients.forEach(lp => {
      const cp = finalMap.get(lp.id);
      if (!cp || (lp.lastModified || 0) > (cp.lastModified || 0)) {
        finalMap.set(lp.id, lp);
        // Se o local for mais novo, tenta subir ele agora mesmo para não perder
        supabase.from('patients').upsert({ id: lp.id, data: lp }).then(({error}) => {
           if(error) console.warn("Sincronização em background falhou para", lp.id);
        });
      }
    });

    const finalPatients = Array.from(finalMap.values())
      .filter(p => p && p.id && p.firstName)
      .sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0));

    setLocalData(finalPatients);
    return finalPatients;
  } catch (err: any) {
    console.error('Erro ao buscar da nuvem, usando cache local:', err);
    return getLocalData();
  }
};

/**
 * SALVA PACIENTE (POST/PUT)
 * Salva local imediatamente e tenta subir para nuvem.
 */
export const savePatient = async (patient: Patient) => {
  const now = Date.now();
  const updatedPatient = { ...patient, lastModified: now };

  // 1. Atualiza Local imediatamente (UX rápida)
  const currentLocal = getLocalData();
  const others = currentLocal.filter(p => p.id !== patient.id);
  setLocalData([updatedPatient, ...others]);

  // 2. Tenta salvar na Nuvem
  try {
    // Busca a versão da nuvem para preservar imagens se o local estiver "limpo" (cache lean)
    const { data: cloudEntry } = await supabase
      .from('patients')
      .select('data')
      .eq('id', patient.id)
      .maybeSingle();

    let toUpload = { ...updatedPatient };

    if (cloudEntry && cloudEntry.data) {
      const cloudPatient = cloudEntry.data as Patient;
      // Recupera imagens da nuvem se o local for uma versão sem imagens (cache logic)
      toUpload.imaging = (updatedPatient.imaging || []).map(localImg => {
        const cloudImg = cloudPatient.imaging?.find(ci => ci.id === localImg.id);
        if (!localImg.attachmentData && cloudImg?.attachmentData) {
          return { ...localImg, attachmentData: cloudImg.attachmentData };
        }
        return localImg;
      });
    }

    const { error } = await supabase
      .from('patients')
      .upsert({ id: patient.id, data: toUpload }, { onConflict: 'id' });

    if (error) {
      console.error("Supabase Upsert Error:", error);
      throw error;
    }
    
    console.log("Sincronizado com a nuvem com sucesso!");
  } catch (err: any) {
    console.error('Erro de rede. O dado ficou apenas neste dispositivo por enquanto.', err);
    throw new Error('Salvo apenas localmente (sem internet ou erro no servidor).');
  }
};

export const deletePatient = async (id: string) => {
  const current = getLocalData();
  setLocalData(current.filter(p => p.id !== id));

  try {
    await supabase.from('patients').delete().eq('id', id);
  } catch (err) {
    console.error("Erro ao deletar da nuvem:", err);
  }
};

/**
 * ESCUTA MUDANÇAS EM TEMPO REAL
 */
export const subscribeToChanges = (callback: () => void) => {
  const channel = supabase
    .channel('schema-db-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'patients' },
      () => {
        console.log('Mudança detectada na nuvem! Atualizando...');
        callback();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
