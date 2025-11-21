import { supabase } from './supabaseClient';
import { Patient } from '../types';

export const getPatients = async (): Promise<Patient[]> => {
  const { data, error } = await supabase
    .from('patients')
    .select('data');
  
  if (error) {
    console.error('Error fetching patients:', error);
    throw error;
  }
  
  return data.map((row: any) => row.data) as Patient[];
};

export const savePatient = async (patient: Patient) => {
  // We store the whole patient object in the 'data' JSONB column
  const { error } = await supabase
    .from('patients')
    .upsert({ id: patient.id, data: patient });

  if (error) {
    console.error('Error saving patient:', error);
    throw error;
  }
};

export const deletePatient = async (id: string) => {
  const { error } = await supabase
    .from('patients')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting patient:', error);
    throw error;
  }
};
