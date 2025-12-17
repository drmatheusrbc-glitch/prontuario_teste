import { supabase } from './supabaseClient';
import { Patient } from '../types';

export const getPatients = async (): Promise<Patient[]> => {
  try {
    const { data, error } = await supabase
      .from('patients')
      .select('data');
    
    if (error) {
      console.error('Supabase error fetching patients:', error);
      // Ensure we have a string message
      const errorMessage = error.message || JSON.stringify(error);
      throw new Error(errorMessage);
    }
    
    if (!data) return [];
    
    return data.map((row: any) => row.data) as Patient[];
  } catch (err: any) {
    console.error('Unexpected error in getPatients:', err);
    // Wrap unknown errors
    throw new Error(err.message || String(err) || 'Falha desconhecida na conexão');
  }
};

export const savePatient = async (patient: Patient) => {
  try {
    // We store the whole patient object in the 'data' JSONB column
    const { error } = await supabase
      .from('patients')
      .upsert({ id: patient.id, data: patient });

    if (error) {
      console.error('Supabase error saving patient:', error);
      const errorMessage = error.message || JSON.stringify(error);
      throw new Error(errorMessage);
    }
  } catch (err: any) {
    console.error('Unexpected error in savePatient:', err);
    throw new Error(err.message || String(err) || 'Falha ao salvar');
  }
};

export const deletePatient = async (id: string) => {
  try {
    const { error } = await supabase
      .from('patients')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase error deleting patient:', error);
      const errorMessage = error.message || JSON.stringify(error);
      throw new Error(errorMessage);
    }
  } catch (err: any) {
    console.error('Unexpected error in deletePatient:', err);
    throw new Error(err.message || String(err) || 'Falha ao excluir');
  }
};