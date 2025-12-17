import { supabase } from './supabaseClient';
import { Patient } from '../types';

const CACHE_KEY = 'recmed_data_cache';

// Helper para ler dados locais
const getLocalData = (): Patient[] => {
  try {
    const data = localStorage.getItem(CACHE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

// Helper para salvar dados locais
const setLocalData = (data: Patient[]) => {
  localStorage.setItem(CACHE_KEY, JSON.stringify(data));
};

export const getPatients = async (): Promise<Patient[]> => {
  try {
    // 1. Busca dados da nuvem (Supabase)
    const { data, error } = await supabase
      .from('patients')
      .select('data');
    
    if (error) throw error;
    
    const cloudPatients = data ? data.map((row: any) => row.data) as Patient[] : [];
    
    // 2. Sincronização Automática (Upload de dados criados offline)
    // Se o usuário criou pacientes enquanto a chave estava errada ou offline,
    // esses pacientes existem no 'localStorage' mas não no 'cloudPatients'.
    // Vamos identificá-los e subir para a nuvem agora.
    
    const localPatients = getLocalData();
    const cloudIds = new Set(cloudPatients.map(p => p.id));
    
    // Encontra pacientes que estão no local mas não na nuvem
    const unsyncedPatients = localPatients.filter(p => !cloudIds.has(p.id));

    if (unsyncedPatients.length > 0) {
      console.log(`Detectados ${unsyncedPatients.length} pacientes não sincronizados. Enviando para nuvem...`);
      
      // Envia cada um para o Supabase
      // Usamos Promise.all para enviar em paralelo
      await Promise.all(unsyncedPatients.map(p => 
        supabase.from('patients').upsert({ id: p.id, data: p })
      ));
      
      // Combina as listas para o usuário ver tudo imediatamente
      const combinedPatients = [...cloudPatients, ...unsyncedPatients];
      
      // Atualiza o cache local com a lista completa
      setLocalData(combinedPatients);
      return combinedPatients;
    }

    // Se não há pendências, a nuvem é a fonte da verdade
    setLocalData(cloudPatients);
    return cloudPatients;

  } catch (err: any) {
    console.warn('Falha na conexão com nuvem, usando cache local:', err);
    
    // Fallback: Se a nuvem falhar, usa os dados locais
    const localData = getLocalData();
    if (localData.length > 0) {
      return localData; 
    }
    
    // Tratamento de erro robusto
    const msg = err.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
    
    // Se for erro de rede, retorna vazio para não quebrar a UI
    if (msg.includes('Failed to fetch')) {
        return [];
    }

    throw new Error(msg);
  }
};

export const savePatient = async (patient: Patient) => {
  // 1. Salva Localmente Primeiro (Optimistic UI)
  const current = getLocalData();
  const index = current.findIndex(p => p.id === patient.id);
  
  if (index >= 0) {
    current[index] = patient;
  } else {
    current.unshift(patient);
  }
  setLocalData(current);

  // 2. Tenta Salvar na Nuvem
  try {
    const { error } = await supabase
      .from('patients')
      .upsert({ id: patient.id, data: patient });

    if (error) throw error;
  } catch (err: any) {
    console.error('Erro ao salvar na nuvem:', err);
    // Não lança erro fatal, pois já salvou localmente. 
    // Opcional: Lançar erro para UI mostrar aviso "Não sincronizado"
    throw new Error('Salvo no dispositivo. Sincronização pendente.');
  }
};

export const deletePatient = async (id: string) => {
  // 1. Remove Localmente Primeiro
  const current = getLocalData();
  const updated = current.filter(p => p.id !== id);
  setLocalData(updated);

  // 2. Tenta Remover da Nuvem
  try {
    const { error } = await supabase
      .from('patients')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (err: any) {
    console.error('Erro ao excluir da nuvem:', err);
    throw new Error('Excluído apenas do dispositivo. Sincronização pendente.');
  }
};