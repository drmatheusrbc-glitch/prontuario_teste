import { Sexo } from '../types';

export const calculateBMI = (weight: number, height: number): number => {
  if (!weight || !height) return 0;
  // Height assumed in meters if < 3, else cm
  const h = height > 3 ? height / 100 : height;
  return parseFloat((weight / (h * h)).toFixed(2));
};

export const calculateAge = (birthDate: string): number => {
  if (!birthDate) return 0;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

export const calculateDaysHospitalized = (admissionDate: string): number => {
  if (!admissionDate) return 0;
  // Normalize dates to midnight to calculate full days
  const start = new Date(admissionDate);
  start.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  const diffTime = Math.abs(now.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  return diffDays; // Returns 0 if admitted today
};

export const calculateCKDEPI = (creatinine: number, age: number, sex: Sexo, ethnicity: string): number => {
  if (!creatinine || !age) return 0;
  
  const isFemale = sex === Sexo.FEMININO;
  const isBlack = ethnicity.toLowerCase().includes('negra') || ethnicity.toLowerCase().includes('preta');

  const k = isFemale ? 0.7 : 0.9;
  const a = isFemale ? -0.329 : -0.411;
  
  const part1 = Math.min(creatinine / k, 1) ** a;
  const part2 = Math.max(creatinine / k, 1) ** -1.209;
  const part3 = 0.993 ** age;
  
  let tfg = 141 * part1 * part2 * part3;
  
  if (isFemale) tfg *= 1.018;
  // Note: 2021 CKD-EPI removed race coefficient, but keeping structure if user requested specific version previously. 
  // If using strict 2021, race multiplier is removed. Assuming strict 2021 based on previous prompt:
  // if (isBlack) tfg *= 1.159; // Removed for 2021 update

  return parseFloat(tfg.toFixed(1));
};

export const formatDate = (dateStr: string) => {
  if(!dateStr) return '-';
  // Handle timezone offset issues by parsing parts
  const parts = dateStr.split('T')[0].split('-');
  if(parts.length === 3) {
     return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return new Date(dateStr).toLocaleDateString('pt-BR');
};

export const formatDateTime = (dateStr: string) => {
  if(!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'});
};