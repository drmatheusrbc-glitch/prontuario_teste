import { supabase } from './supabaseClient';
import { Patient, ImagingExam } from '../types';

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
    if (isQuotaExceeded(e)) {
      console.warn('LocalStorage cheio. Tentando salvar versão otimizada...');
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
        }));
        localStorage.setItem(CACHE_KEY, JSON.stringify(leanData));
      } catch (retryError) {
         if (isQuotaExceeded(retryError)) {
            try {
               const leanData = data.map(p => ({
                 ...p,
                 imaging: (p.imaging || []).map(img => ({
                   ...img,
                   attachmentData: undefined
                 }))
               })).slice(0, 20); 
               localStorage.removeItem(CACHE_KEY);
               localStorage.setItem(CACHE_KEY, JSON.stringify(leanData));
            } catch (finalError) {
               try { localStorage.removeItem(CACHE_KEY); } catch(cleanupErr) {}
            }
         }
      }
    }
  }
};

export const getPatients = async (): Promise<Patient[]> => {
  try {
    const { data, error } = await supabase
      .from('patients')
      .select('data');
    
    if (error) throw error;
    
    const cloudPatients = data ? data.map((row: any) => row.data) as Patient[] : [];
    const localPatients = getLocalData();
    const cloudIds = new Set(cloudPatients.map(p => p.id));
    const unsyncedPatients = localPatients.filter(p => !cloudIds.has(p.id) && p.firstName);

    if (unsyncedPatients.length > 0) {
      await Promise.all(unsyncedPatients.map(p => 
        supabase.from('patients').upsert({ id: p.id, data: p })
      ));
      const combinedPatients = [...cloudPatients, ...unsyncedPatients];
      setLocalData(combinedPatients);
      return combinedPatients;
    }

    setLocalData(cloudPatients);
    return cloudPatients;
  } catch (err: any) {
    const localData = getLocalData();
    if (localData.length > 0) return localData; 
    throw err;
  }
};

export const savePatient = async (patient: Patient) => {
  // 1. Atualização Otimista no Cache Local
  const current = getLocalData();
  const index = current.findIndex(p => p.id === patient.id);
  
  if (index >= 0) {
    current.splice(index, 1);
    current.unshift(patient);
  } else {
    current.unshift(patient);
  }
  setLocalData(current);

  // 2. Salvamento Inteligente na Nuvem (Evita deletar imagens pesadas se o dispositivo local não as tiver)
  try {
    // Primeiro, pegamos a versão atual que está na nuvem
    const { data: cloudEntry } = await supabase
      .from('patients')
      .select('data')
      .eq('id', patient.id)
      .single();

    let finalPatientToUpload = { ...patient };

    if (cloudEntry && cloudEntry.data) {
      const cloudPatient = cloudEntry.data as Patient;
      
      // Mesclamos as imagens: se a versão local está sem o dado binário (Base64) 
      // mas a nuvem tem, nós restauramos o dado da nuvem antes de subir
      finalPatientToUpload.imaging = (patient.imaging || []).map(localImg => {
        const cloudImg = cloudPatient.imaging?.find(ci => ci.id === localImg.id);
        
        // Se local não tem os dados da imagem mas a nuvem tem, preserva o da nuvem
        if (!localImg.attachmentData && cloudImg && cloudImg.attachmentData) {
          return { ...localImg, attachmentData: cloudImg.attachmentData };
        }
        return localImg;
      });
    }

    const { error } = await supabase
      .from('patients')
      .upsert({ id: patient.id, data: finalPatientToUpload });

    if (error) throw error;
  } catch (err: any) {
    console.error('Erro ao sincronizar com nuvem:', err);
    throw new Error('Salvo localmente. Sincronização falhou.');
  }
};

export const deletePatient = async (id: string) => {
  const current = getLocalData();
  const updated = current.filter(p => p.id !== id);
  setLocalData(updated);

  try {
    const { error } = await supabase
      .from('patients')
      .delete()
      .eq('id', id);
    if (error) throw error;
  } catch (err: any) {
    throw new Error('Excluido apenas localmente.');
  }
};