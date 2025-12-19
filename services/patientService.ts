
import { supabase } from './supabaseClient';
import { Patient } from '../types';

const CACHE_KEY = 'recmed_data_cache';

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
    // Ordena por data de modificação para manter consistência no cache
    const sorted = [...data].sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0));
    localStorage.setItem(CACHE_KEY, JSON.stringify(sorted));
  } catch (e) {
    console.warn("Local storage full, cleaning old data...");
    // Se estourar o espaço, removemos dados pesados (imagens) dos registros mais antigos
    const lean = data.map((p, i) => i > 10 ? { ...p, imaging: [] } : p);
    localStorage.setItem(CACHE_KEY, JSON.stringify(lean.slice(0, 50)));
  }
};

/**
 * BUSCA PACIENTES (GET)
 * Força a busca na nuvem e limpa o cache local se a nuvem responder.
 */
export const getPatients = async (): Promise<Patient[]> => {
  try {
    console.log("Sincronizando com a nuvem...");
    const { data: cloudRows, error } = await supabase
      .from('patients')
      .select('data');
    
    if (error) throw error;
    
    const cloudPatients = cloudRows ? cloudRows.map((row: any) => row.data) as Patient[] : [];
    const localPatients = getLocalData();
    
    // Se não há nada na nuvem, mas há local, vamos tentar subir o local
    if (cloudPatients.length === 0 && localPatients.length > 0) {
      console.log("Nuvem vazia, enviando dados locais...");
      for (const p of localPatients) {
        await supabase.from('patients').upsert({ id: p.id, data: p });
      }
      return localPatients;
    }

    // Estratégia de Merge: Nuvem é a verdade absoluta, a menos que o local tenha um timestamp superior
    const finalMap = new Map<string, Patient>();

    // Primeiro, confiamos na nuvem
    cloudPatients.forEach(p => finalMap.set(p.id, p));

    // Segundo, verificamos se existe algo local que ainda não subiu (timestamp maior)
    localPatients.forEach(lp => {
      const cp = finalMap.get(lp.id);
      if (!cp || (lp.lastModified || 0) > (cp.lastModified || 0)) {
        finalMap.set(lp.id, lp);
        // Tenta subir esse dado local "órfão" em background
        supabase.from('patients').upsert({ id: lp.id, data: lp }).then(({error}) => {
          if(!error) console.log(`Paciente ${lp.firstName} sincronizado em background.`);
        });
      }
    });

    const finalPatients = Array.from(finalMap.values())
      .filter(p => p && p.id && p.firstName)
      .sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0));

    setLocalData(finalPatients);
    return finalPatients;
  } catch (err: any) {
    console.error('Falha na conexão. Usando modo offline.', err);
    return getLocalData();
  }
};

/**
 * SALVA PACIENTE (POST/PUT)
 */
export const savePatient = async (patient: Patient) => {
  const now = Date.now();
  const updatedPatient = { ...patient, lastModified: now };

  // 1. Atualiza Local (Imediato)
  const currentLocal = getLocalData();
  const others = currentLocal.filter(p => p.id !== patient.id);
  const newList = [updatedPatient, ...others];
  setLocalData(newList);

  // 2. Envia para Nuvem (Obrigatório)
  try {
    // Antes de salvar, tentamos recuperar imagens da nuvem caso estejamos salvando de um dispositivo 
    // que limpou o cache de imagens para economizar espaço
    const { data: existing } = await supabase
      .from('patients')
      .select('data')
      .eq('id', patient.id)
      .maybeSingle();

    let dataToUpload = { ...updatedPatient };

    if (existing?.data) {
      const cloudData = existing.data as Patient;
      // Preserva imagens da nuvem se o local estiver vazio (otimização de cache)
      dataToUpload.imaging = (updatedPatient.imaging || []).map(img => {
        if (!img.attachmentData) {
          const cloudImg = cloudData.imaging?.find(ci => ci.id === img.id);
          if (cloudImg?.attachmentData) return cloudImg;
        }
        return img;
      });
    }

    const { error } = await supabase
      .from('patients')
      .upsert({ 
        id: patient.id, 
        data: dataToUpload,
        last_modified_at: new Date().toISOString() // Coluna auxiliar para o Supabase
      }, { onConflict: 'id' });

    if (error) throw error;
    console.log("Dados enviados para a nuvem com sucesso!");
  } catch (err: any) {
    console.error("Erro ao subir para nuvem. O dado está apenas local.", err);
    throw new Error("Erro de conexão. Alteração salva apenas neste aparelho.");
  }
};

export const deletePatient = async (id: string) => {
  const current = getLocalData();
  setLocalData(current.filter(p => p.id !== id));
  try {
    await supabase.from('patients').delete().eq('id', id);
  } catch (err) {}
};

export const subscribeToChanges = (callback: () => void) => {
  const channel = supabase
    .channel('public:patients')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'patients' }, (payload) => {
      console.log('Mudança detectada na nuvem via Realtime!');
      callback();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
