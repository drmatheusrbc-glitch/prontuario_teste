
export enum Sexo {
  MASCULINO = 'Masculino',
  FEMININO = 'Feminino'
}

export interface VitalSign {
  date: string; // ISO string
  fc: number;
  fr: number;
  pas: number;
  pad: number;
  sato2: number;
  dextro: number;
  tax: number; // Temperatura Axilar
}

export interface LabResult {
  id?: string; // Added ID for management
  date: string; // ISO string
  values: Record<string, number>; // key is exam name (e.g., 'hemoglobina'), value is result
}

export interface Medication {
  id: string;
  name: string;
  route: string;
  dose: string;
  frequency: string;
  startDate: string;
  endDate?: string; // Empty or "Uso contínuo" logic handled in UI
  isContinuous: boolean;
}

export interface Evolution {
  id: string;
  date: string;
  content: string;
}

export interface ImagingExam {
  id: string;
  date: string;
  description: string;
  attachmentName?: string;
  attachmentData?: string; // Base64 string
  attachmentType?: string; // MIME type
}

export interface Alert {
  id: string;
  text: string;
  isResolved: boolean;
}

export interface Diagnosis {
  id: string;
  name: string;
  date: string;
  status: 'Ativo' | 'Resolvido';
}

export interface Patient {
  id: string;
  // Registration Info
  firstName: string;
  lastName: string;
  hospital: string;
  bed: string;
  admissionDate: string;
  sex: Sexo;
  ethnicity: string;
  birthDate: string;
  age: number;
  city: string;
  state: string;
  address: string;
  phone: string;
  occupation: string;
  weight: number;
  height: number;
  bmi: number;

  // Anamnesis
  hpp: string; // História Patológica Pregressa
  continuousMeds: string; // Medicações de uso prévio
  habits: string; // Hábitos de Vida
  hda: string; // História da Doença Atual
  allergies: string;

  // Diagnostics
  diagnostics: Diagnosis[];

  // Clinical Data
  evolutions: Evolution[];
  vitalSigns: VitalSign[];
  labResults: LabResult[];
  prescriptions: Medication[];
  imaging: ImagingExam[];
  alerts: Alert[];
}

export const LAB_FIELDS = [
  { key: 'hemoglobina', label: 'Hemoglobina', unit: 'g/dL' },
  { key: 'hematocrito', label: 'Hematócrito', unit: '%' },
  { key: 'vcm', label: 'VCM', unit: 'fL' },
  { key: 'hcm', label: 'HCM', unit: 'pg' },
  { key: 'chcm', label: 'CHCM', unit: 'g/dL' },
  { key: 'rdw', label: 'RDW', unit: '%' },
  { key: 'leucocitos', label: 'Leucócitos', unit: '/mm³' },
  { key: 'bastoes', label: 'Bastões', unit: '%' },
  { key: 'segmentados', label: 'Segmentados', unit: '%' },
  { key: 'linfocitos', label: 'Linfócitos', unit: '%' },
  { key: 'plaquetas', label: 'Plaquetas', unit: '/mm³' },
  { key: 'ureia', label: 'Ureia', unit: 'mg/dL' },
  { key: 'creatinina', label: 'Creatinina', unit: 'mg/dL' },
  { key: 'tfg', label: 'TFG (CKD-EPI)', unit: 'ml/min/1.73m²' }, // Calc
  { key: 'sodio', label: 'Sódio', unit: 'mEq/L' },
  { key: 'potassio', label: 'Potássio', unit: 'mEq/L' },
  { key: 'calcio', label: 'Cálcio', unit: 'mg/dL' },
  { key: 'magnesio', label: 'Magnésio', unit: 'mg/dL' },
  { key: 'fosforo', label: 'Fósforo', unit: 'mg/dL' },
  { key: 'pcr', label: 'PCR', unit: 'mg/L' },
  { key: 'lactato', label: 'Lactato', unit: 'mmol/L' },
  { key: 'tgo', label: 'TGO/AST', unit: 'U/L' },
  { key: 'tgp', label: 'TGP/ALT', unit: 'U/L' },
  { key: 'bt', label: 'Bilirrubina Total', unit: 'mg/dL' },
  { key: 'bd', label: 'Bilirrubina Direta', unit: 'mg/dL' },
  { key: 'bi', label: 'Bilirrubina Indireta', unit: 'mg/dL' },
  { key: 'amilase', label: 'Amilase', unit: 'U/L' },
  { key: 'gama_gt', label: 'Gama GT', unit: 'U/L' },
  { key: 'ph', label: 'pH', unit: '' },
  { key: 'po2', label: 'pO2', unit: 'mmHg' },
  { key: 'pco2', label: 'pCO2', unit: 'mmHg' },
  { key: 'bic', label: 'Bicarbonato', unit: 'mEq/L' },
  { key: 'sato2_gaso', label: 'SatO2 (Gaso)', unit: '%' },
  { key: 'glicemia', label: 'Glicemia', unit: 'mg/dL' },
  { key: 'albumina', label: 'Albumina', unit: 'g/dL' },
];