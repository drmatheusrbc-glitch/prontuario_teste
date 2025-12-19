
import { supabase } from './supabaseClient';
import { Patient } from '../types';

const CACHE_KEY = 'recmed_data_cache';

/**
 * Recupera dados do cache local.
 */
const getLocalData = (): Patient[] => {
  try {
    const data = localStorage.getItem(CACHE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

/**
 * Salva no cache local com limpeza agressiva se necessário.
 */
const setLocalData = (data: Patient[]) => {
  // Ordena para garantir que os mais recentes fiquem no topo antes de salvar
  const sorted = [...data].sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0));
  
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(sorted));
  } catch (e) {
    console.warn("Storage cheio. Limpando imagens do cache...");
    // Remove imagens (base64) para salvar espaço no navegador
    const thinData = sorted.map(p => ({
      ...p,
      imaging: (p.imaging || []).map(img => ({ ...img, attachmentData: undefined }))
    }));
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(thinData.slice(0, 50)));
    } catch (err) {
      localStorage.removeItem(CACHE_KEY);
    }
  }
};

/**
 * BUSCA PACIENTES (GET)
 * A nuvem é a verdade absoluta. Se houver conexão, os dados da nuvem 
 * substituem os locais obrigatoriamente.
 */
export const getPatients = async (): Promise<Patient[]> => {
  try {
    // 1. Tenta buscar na nuvem
    const { data: cloudRows, error } = await supabase
      .from('patients')
      .select('data');
    
    if (error) throw error;
    
    // 2. Transforma dados da nuvem
    const cloudPatients = cloudRows ? cloudRows.map((row: any) => row.data) as Patient[] : [];
    
    // 3. Pega dados locais para conferir se há algum paciente NOVO criado offline
    const localPatients = getLocalData();
    
    // 4. Lógica de Mesclagem Segura:
    // Começamos com os dados da nuvem como base (Verdade Absoluta)
    const finalMap = new Map<string, Patient>();
    cloudPatients.forEach(p => {
      if (p && p.id) finalMap.set(p.id, p);
    });

    // 5. Adicionamos apenas pacientes locais que NÃO existem na nuvem 
    // (Ex: paciente cadastrado no celular enquanto estava sem sinal)
    localPatients.forEach(lp => {
      if (lp && lp.id && !finalMap.has(lp.id)) {
        finalMap.set(lp.id, lp);
      }
    });

    const finalPatients = Array.from(finalMap.values())
      .filter(p => p && p.id && p.firstName)
      .sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0));

    // 6. Atualiza o cache local com a nova verdade
    setLocalData(finalPatients);
    
    return finalPatients;
  } catch (err: any) {
    console.error('Sem conexão com a nuvem. Usando cache local.', err);
    // Se a nuvem falhar, usamos o que temos guardado no aparelho
    return getLocalData();
  }
};

/**
 * SALVA PACIENTE (POST/PUT)
 * Salva localmente primeiro (UX rápida) e depois empurra para a nuvem.
 */
export const savePatient = async (patient: Patient) => {
  // Criamos um novo timestamp de modificação
  const now = Date.now();
  const updatedPatient = { ...patient, lastModified: now };

  // 1. Atualiza cache local imediatamente
  const currentLocal = getLocalData();
  const filtered = currentLocal.filter(p => p.id !== patient.id);
  setLocalData([updatedPatient, ...filtered]);

  // 2. Persiste na Nuvem
  try {
    // Recupera dados existentes para não apagar imagens que podem estar só na nuvem
    const { data: existing } = await supabase
      .from('patients')
      .select('data')
      .eq('id', patient.id)
      .maybeSingle();

    let dataToUpload = { ...updatedPatient };

    if (existing?.data) {
      const cloudData = existing.data as Patient;
      // Se o objeto local não tem os bytes da imagem (cache thinned), 
      // recuperamos da nuvem para o upload ser completo.
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
    console.log("Sincronizado com a nuvem!");
  } catch (err: any) {
    console.error("Falha ao salvar na nuvem:", err);
    throw new Error("Salvo apenas neste dispositivo. Conecte-se à internet para sincronizar.");
  }
};

export const deletePatient = async (id: string) => {
  const current = getLocalData();
  setLocalData(current.filter(p => p.id !== id));
  
  try {
    await supabase.from('patients').delete().eq('id', id);
  } catch (err) {
    console.error("Erro ao excluir na nuvem:", err);
  }
};

export const subscribeToChanges = (callback: () => void) => {
  const channel = supabase
    .channel('db-changes-v2')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'patients' }, (payload) => {
      // Pequeno delay para garantir que o banco processou o commit
      setTimeout(() => callback(), 500);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
