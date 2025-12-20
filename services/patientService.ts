
import { supabase } from './supabaseClient';
import { Patient } from '../types';

const CACHE_KEY = 'recmed_data_cache_v3';

const getLocalData = (): Patient[] => {
  try {
    const data = localStorage.getItem(CACHE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

const setLocalData = (data: Patient[]) => {
  const sorted = [...data].sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0));
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(sorted));
  } catch (e) {
    const thinData = sorted.map(p => ({ ...p, imaging: [] }));
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(thinData.slice(0, 20))); } catch(err) {}
  }
};

export const getPatients = async (): Promise<Patient[]> => {
  try {
    const { data: cloudRows, error } = await supabase
      .from('patients')
      .select('data');
    
    if (error) {
      console.error("Erro Supabase (getPatients):", error);
      throw error;
    }
    
    const cloudPatients = cloudRows ? cloudRows.map((row: any) => row.data) as Patient[] : [];
    setLocalData(cloudPatients);
    return cloudPatients.sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0));
  } catch (err: any) {
    console.warn('Operando em modo Offline ou Tabela não encontrada.');
    return getLocalData();
  }
};

export const savePatient = async (patient: Patient) => {
  try {
    // Tenta buscar a versão atual na nuvem
    const { data: existing, error: fetchError } = await supabase
      .from('patients')
      .select('data')
      .eq('id', patient.id)
      .maybeSingle();

    if (fetchError) {
      console.warn("Aviso: Falha ao conferir versão na nuvem. Tentando salvar mesmo assim.");
    }

    const cloudData = existing?.data as Patient | undefined;
    
    // Detecção de conflito (apenas se conseguimos ler a nuvem)
    if (cloudData && cloudData.version > (patient.version || 0)) {
      throw new Error("CONFLITO: Este paciente foi alterado em outro dispositivo. Atualize a página.");
    }

    const nextVersion = (patient.version || 0) + 1;
    const now = Date.now();
    const patientToSave = { 
      ...patient, 
      version: nextVersion, 
      lastModified: now 
    };

    // Upsert na nuvem
    const { error: upsertError } = await supabase
      .from('patients')
      .upsert({ 
        id: patient.id, 
        data: patientToSave,
        last_modified_at: new Date().toISOString() 
      }, { onConflict: 'id' });

    if (upsertError) {
      console.error("Erro Supabase (upsert):", upsertError);
      throw new Error(`Falha ao salvar na nuvem: ${upsertError.message}. Verifique se a tabela 'patients' existe no SQL Editor.`);
    }

    // Atualiza local apenas após sucesso na nuvem
    const currentLocal = getLocalData();
    const updatedLocal = [patientToSave, ...currentLocal.filter(p => p.id !== patient.id)];
    setLocalData(updatedLocal);

    return patientToSave;
  } catch (err: any) {
    console.error("Erro detalhado no salvamento:", err);
    throw err;
  }
};

export const deletePatient = async (id: string) => {
  const current = getLocalData();
  setLocalData(current.filter(p => p.id !== id));
  try {
    await supabase.from('patients').delete().eq('id', id);
  } catch (err) {
    console.error("Erro ao deletar:", err);
  }
};

export const subscribeToChanges = (callback: () => void) => {
  const channel = supabase
    .channel('realtime-sync-v3')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'patients' }, () => {
      callback();
    })
    .subscribe();

  return () => { supabase.removeChannel(channel); };
};
