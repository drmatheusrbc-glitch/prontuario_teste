import { supabase } from './supabaseClient';
import { Patient } from '../types';

const CACHE_KEY = 'recmed_data_cache';

// Helper para identificar erro de cota de forma robusta
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

// Helper para ler dados locais
const getLocalData = (): Patient[] => {
  try {
    const data = localStorage.getItem(CACHE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.warn('Erro ao ler cache local:', e);
    return [];
  }
};

// Helper para salvar dados locais com tratamento de cota multinível
const setLocalData = (data: Patient[]) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (e: any) {
    // Verifica se o erro é de cota excedida
    if (isQuotaExceeded(e)) {
      console.warn('LocalStorage cheio. Tentando salvar versão otimizada...');
      
      try {
        // Nível 1: Remover apenas imagens (que são pesadas em Base64)
        const leanData = data.map(p => ({
          ...p,
          imaging: (p.imaging || []).map(img => ({
            ...img,
            attachmentData: undefined, // Remove o binário da imagem
            description: img.description + ' (Imagem indisponível offline)'
          }))
        }));
        
        localStorage.setItem(CACHE_KEY, JSON.stringify(leanData));
        console.log('Cache salvo: Versão sem imagens.');
      } catch (retryError) {
         if (isQuotaExceeded(retryError)) {
            // Nível 2: Se ainda falhar, manter apenas os 20 pacientes mais recentes sem imagens
            // Isso previne o loop de erro e garante que o médico possa trabalhar com os casos atuais
            try {
               const leanData = data.map(p => ({
                 ...p,
                 imaging: (p.imaging || []).map(img => ({
                   ...img,
                   attachmentData: undefined, 
                   description: img.description + ' (Imagem indisponível offline)'
                 }))
               })).slice(0, 20); 

               // Tenta remover o antigo antes de salvar o novo para liberar espaço imediato
               localStorage.removeItem(CACHE_KEY);
               localStorage.setItem(CACHE_KEY, JSON.stringify(leanData));
               console.log('Cache salvo: Versão reduzida (20 recentes).');
            } catch (finalError) {
               console.error('Falha crítica: Não foi possível salvar cache offline mesmo reduzido.', finalError);
               // Último recurso: Limpa o cache para evitar estado corrompido, mas não crasha a app
               try { localStorage.removeItem(CACHE_KEY); } catch(cleanupErr) {}
            }
         } else {
            console.error('Erro ao tentar salvar versão otimizada:', retryError);
         }
      }
    } else {
      console.error('Erro desconhecido ao salvar no localStorage:', e);
    }
  }
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
    const localPatients = getLocalData();
    const cloudIds = new Set(cloudPatients.map(p => p.id));
    
    // Encontra pacientes que estão no local mas não na nuvem
    // Filtra apenas pacientes que realmente têm dados válidos
    const unsyncedPatients = localPatients.filter(p => !cloudIds.has(p.id) && p.firstName);

    if (unsyncedPatients.length > 0) {
      console.log(`Detectados ${unsyncedPatients.length} pacientes não sincronizados. Enviando para nuvem...`);
      
      // Envia cada um para o Supabase
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
  
  // Atualiza lista local e Move para o TOPO (Importante para a estratégia de cache funcionar)
  if (index >= 0) {
    current.splice(index, 1);
    current.unshift(patient);
  } else {
    current.unshift(patient);
  }
  
  // Tenta salvar no cache local (com tratamento de erro interno para cota)
  setLocalData(current);

  // 2. Tenta Salvar na Nuvem
  try {
    const { error } = await supabase
      .from('patients')
      .upsert({ id: patient.id, data: patient });

    if (error) throw error;
  } catch (err: any) {
    console.error('Erro ao salvar na nuvem:', err);
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