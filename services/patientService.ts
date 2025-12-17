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
    // Tenta buscar da nuvem
    const { data, error } = await supabase
      .from('patients')
      .select('data');
    
    if (error) throw error;
    
    if (data) {
      const patients = data.map((row: any) => row.data) as Patient[];
      // Sucesso: Atualiza cache local
      setLocalData(patients);
      return patients;
    }
    return [];

  } catch (err: any) {
    console.warn('Falha na conexão com nuvem, usando cache local:', err);
    
    // Fallback: Retorna dados locais se existirem
    const localData = getLocalData();
    if (localData.length > 0) {
      return localData; // Retorna dados locais silenciosamente ou com aviso na UI
    }
    
    // Se não tem dados locais e falhou a nuvem, lança erro para avisar o usuário
    // Convertemos o erro para string para evitar [object Object]
    const msg = err.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
    
    // Se for erro de fetch (rede), retornamos array vazio para o app abrir em modo offline limpo
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
    // Lança erro amigável para a UI mostrar o aviso amarelo, mas os dados estão salvos localmente
    throw new Error('Salvo apenas no dispositivo (Sem sincronização)');
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
    throw new Error('Excluído apenas do dispositivo (Sem sincronização)');
  }
};