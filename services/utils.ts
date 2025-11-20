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
  if (isBlack) tfg *= 1.159;

  return parseFloat(tfg.toFixed(1));
};

export const formatDate = (dateStr: string) => {
  if(!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('pt-BR');
};

export const formatDateTime = (dateStr: string) => {
  if(!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('pt-BR') + ' ' + new Date(dateStr).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'});
};
