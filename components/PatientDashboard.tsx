
import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, FileText, Stethoscope, Activity, 
  FlaskConical, Image as ImageIcon, Pill, BarChart2, 
  AlertTriangle, Plus, Save, Trash2, Download, CheckCircle, Clock, X, Menu,
  Printer, ClipboardList, Paperclip, CloudLightning, GitCompare, ExternalLink, Search
} from 'lucide-react';
import { Patient, Sexo, LAB_FIELDS, VitalSign, Evolution, LabResult, Medication, ImagingExam, Diagnosis } from '../types';
import { Card, Button, Input, TextArea, Select } from './UiComponents';
import { formatDate, formatDateTime, calculateCKDEPI } from '../services/utils';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

interface DashboardProps {
  patients: Patient[];
  updatePatient: (p: Patient) => void;
}

// --- DRUG CLASSES DEFINITIONS ---
// Maps specific drugs to their classes for broad interaction matching
const DRUG_CLASSES: Record<string, string[]> = {
  'aines': ['diclofenaco', 'ibuprofeno', 'naproxeno', 'cetoprofeno', 'acido acetilsalicilico', 'aas', 'indometacina', 'piroxicam', 'celecoxibe', 'meloxicam', 'cetorolaco', 'nimesulida', 'aspirina', 'dipirona'],
  'ieca': ['captopril', 'enalapril', 'lisinopril', 'ramipril', 'benazepril', 'perindopril', 'fosinopril'],
  'beta_bloqueadores': ['atenolol', 'propranolol', 'metoprolol', 'carvedilol', 'bisoprolol', 'nebivolol', 'sotalol', 'timolol', 'labetalol'],
  'estatinas': ['sinvastatina', 'atorvastatina', 'rosuvastatina', 'pravastatina', 'fluvastatina', 'lovastatina', 'pitavastatina'],
  'macrolideos': ['azitromicina', 'claritromicina', 'eritromicina'],
  'quinolonas': ['ciprofloxacino', 'levofloxacino', 'moxifloxacino', 'norfloxacino', 'ofloxacino', 'gatifloxacino'],
  'azoles': ['fluconazol', 'cetoconazol', 'itraconazol', 'voriconazol', 'miconazol', 'posaconazol'],
  'corticoides': ['hidrocortisona', 'dexametasona', 'prednisona', 'prednisolona', 'metilprednisolona', 'betametasona', 'fludicortisona', 'triancinolona'],
  'aminoglicosideos': ['gentamicina', 'amicacina', 'neomicina', 'tobramicina', 'estreptomicina'],
  'bcc': ['anlodipino', 'nifedipino', 'diltiazem', 'verapamil', 'nimodipino', 'felodipino', 'anlodipina'], // Bloqueadores de Canal de Cálcio
  'isrs': ['fluoxetina', 'sertralina', 'paroxetina', 'citalopram', 'escitalopram', 'fluvoxamina'], // Inibidores Seletivos de Recaptação de Serotonina
  'benzodiazepinicos': ['diazepam', 'midazolam', 'clonazepam', 'alprazolam', 'lorazepam', 'bromazepam'],
  'bloq_neuromusculares': ['atracurio', 'pancuronio', 'suxametonio', 'rocuronio', 'cisatracurio'],
  'diureticos_alca': ['furosemida', 'bumetanida'],
  'anticonvulsivantes': ['fenitoina', 'carbamazepina', 'fenobarbital', 'acido valproico', 'topiramato', 'lamotrigina'],
  'antifungicos': ['anfotericina b', 'fluconazol', 'cetoconazol', 'itraconazol', 'voriconazol', 'miconazol'],
  'tiazidicos': ['hidroclorotiazida', 'clortalidona', 'indapamida']
};

// --- INTERACTION DATABASE (Based on RioSaúde/UFG PDF) ---
const INTERACTION_DB = [
  // ANFOTERICINA B
  { drugs: ['anfotericina b', 'digoxina'], severity: 'Moderate', title: 'Hipocalemia e Toxicidade Digitálica', effect: 'Hipocalemia e toxicidade digitálica.', recommendation: 'Monitorar K+ e função cardíaca. Repor K+ se necessário.' },
  
  // AMICACINA (Aminoglicosídeos)
  { drugs: ['aminoglicosideos', 'diureticos_alca'], severity: 'Moderate', title: 'Nefrotoxicidade', effect: 'Aumento do risco de nefrotoxicidade.', recommendation: 'Monitorar função renal.' },
  { drugs: ['aminoglicosideos', 'aines'], severity: 'Moderate', title: 'Nefrotoxicidade', effect: 'Diminui excreção de amicacina, risco nefro/ototóxico.', recommendation: 'Aumentar intervalo de dosagem e monitorar função renal.' },
  { drugs: ['aminoglicosideos', 'piperacilina'], severity: 'Moderate', title: 'Inativação', effect: 'Inativação do aminoglicosídeo.', recommendation: 'Intervalo de 1 hora antes ou após.' },
  { drugs: ['aminoglicosideos', 'cefalosporinas'], severity: 'Major', title: 'Nefrotoxicidade', effect: 'Potencialização dos efeitos nefrotóxicos.', recommendation: 'Monitorar função renal rigorosamente.' },

  // AMIODARONA
  { drugs: ['amiodarona', 'amitriptilina'], severity: 'Major', title: 'Arritmias Ventriculares', effect: 'Risco de arritmias ventriculares.', recommendation: 'Uso com cautela. Monitorar ECG.' },
  { drugs: ['amiodarona', 'macrolideos'], severity: 'Major', title: 'Prolongamento QT', effect: 'Aumento do intervalo QT (arritmias graves).', recommendation: 'Uso com bastante cautela ou evitar.' },
  { drugs: ['amiodarona', 'metronidazol'], severity: 'Major', title: 'Cardiotoxicidade', effect: 'Aumento dos níveis de amiodarona (toxicidade).', recommendation: 'Monitorar ECG e sinais de toxicidade.' },
  { drugs: ['amiodarona', 'estatinas'], severity: 'Major', title: 'Rabdomiólise', effect: 'Aumento da concentração da estatina (risco de miopatia).', recommendation: 'Limitar dose da estatina (ex: sinvastatina max 20mg) ou trocar.' },
  { drugs: ['amiodarona', 'digoxina'], severity: 'Major', title: 'Toxicidade Digitálica', effect: 'Aumento da concentração plasmática da digoxina.', recommendation: 'Reduzir dose de digoxina em 1/3 ou metade.' },
  { drugs: ['amiodarona', 'fenitoina'], severity: 'Moderate', title: 'Interação Bidirecional', effect: 'Aumento de fenitoína e redução de amiodarona.', recommendation: 'Evitar uso concomitante após 2 semanas.' },
  { drugs: ['amiodarona', 'azoles'], severity: 'Contraindicated', title: 'Prolongamento QT', effect: 'Risco alto de arritmias graves.', recommendation: 'Evitar uso concomitante.' },
  { drugs: ['amiodarona', 'corticoides'], severity: 'Major', title: 'Arritmias (via K+/Mg+)', effect: 'Hipocalemia/Hipomagnesemia favorecem arritmias.', recommendation: 'Monitorar eletrólitos e ECG.' },
  { drugs: ['amiodarona', 'varfarina'], severity: 'Major', title: 'Hemorragia', effect: 'Potencialização do efeito anticoagulante.', recommendation: 'Reduzir dose de varfarina em 30-50% e monitorar INR.' },
  { drugs: ['amiodarona', 'quinolonas'], severity: 'Major', title: 'Prolongamento QT', effect: 'Risco aditivo de arritmias.', recommendation: 'Evitar ou monitorar ECG.' },

  // AMITRIPTILINA
  { drugs: ['amitriptilina', 'clonidina'], severity: 'Contraindicated', title: 'Hipertensão Rebote', effect: 'Aumento súbito e grave de PA.', recommendation: 'Evitar combinação.' },
  { drugs: ['amitriptilina', 'fluconazol'], severity: 'Moderate', title: 'Arritmias', effect: 'Aumento dos níveis de amitriptilina.', recommendation: 'Ajustar dose.' },
  { drugs: ['amitriptilina', 'isrs'], severity: 'Contraindicated', title: 'Síndrome Serotoninérgica', effect: 'Risco de toxicidade serotoninérgica.', recommendation: 'Evitar combinação.' },
  { drugs: ['amitriptilina', 'tramadol'], severity: 'Contraindicated', title: 'Convulsões', effect: 'Redução do limiar convulsivo e Síndrome Serotoninérgica.', recommendation: 'Evitar uso concomitante.' },

  // ANLODIPINO / BCC
  { drugs: ['bcc', 'beta_bloqueadores'], severity: 'Moderate', title: 'Bradicardia/Hipotensão', effect: 'Efeito hipotensor e bradicardizante aditivo.', recommendation: 'Monitorar PA e FC.' },
  { drugs: ['bcc', 'carbamazepina'], severity: 'Moderate', title: 'Falha Terapêutica', effect: 'Redução do efeito do anlodipino/BCC.', recommendation: 'Monitorar PA.' },
  { drugs: ['bcc', 'bloq_neuromusculares'], severity: 'Major', title: 'Bloqueio Prolongado', effect: 'Potencialização do bloqueio neuromuscular.', recommendation: 'Monitorar recuperação muscular.' },
  { drugs: ['bcc', 'aines'], severity: 'Low', title: 'Redução Anti-hipertensiva', effect: 'Retenção de sódio/água pelos AINEs.', recommendation: 'Monitorar PA.' },
  { drugs: ['bcc', 'macrolideos'], severity: 'Moderate', title: 'Hipotensão/Bradicardia', effect: 'Aumento dos níveis do BCC.', recommendation: 'Monitorar PA e FC. Preferir Azitromicina.' },
  { drugs: ['bcc', 'fenitoina'], severity: 'Moderate', title: 'Toxicidade Fenitoína', effect: 'Aumento dos efeitos tóxicos da fenitoína.', recommendation: 'Monitorar nistagmo, ataxia, etc.' },
  { drugs: ['bcc', 'azoles'], severity: 'Moderate', title: 'Hipotensão/Edema', effect: 'Aumento dos níveis do BCC.', recommendation: 'Monitorar efeitos adversos.' },
  { drugs: ['bcc', 'nitroprussiato de sodio'], severity: 'Moderate', title: 'Hipotensão', effect: 'Efeito hipotensor aditivo.', recommendation: 'Usar com cautela.' },

  // ATENOLOL
  { drugs: ['atenolol', 'ampicilina'], severity: 'Moderate', title: 'Redução Anti-hipertensiva', effect: 'Redução da biodisponibilidade do atenolol.', recommendation: 'Monitorar PA.' },

  // AZITROMICINA
  { drugs: ['macrolideos', 'varfarina'], severity: 'Major', title: 'Hemorragia', effect: 'Aumento do efeito anticoagulante.', recommendation: 'Monitorar INR e ajustar dose.' },
  { drugs: ['macrolideos', 'estatinas'], severity: 'Major', title: 'Rabdomiólise', effect: 'Aumento da concentração plasmática da estatina.', recommendation: 'Avaliar substituição ou suspensão temporária.' },
  { drugs: ['macrolideos', 'quinolonas'], severity: 'Contraindicated', title: 'Prolongamento QT', effect: 'Arritmias cardíacas graves.', recommendation: 'Evitar combinação.' },
  { drugs: ['macrolideos', 'digoxina'], severity: 'Major', title: 'Toxicidade Digitálica', effect: 'Aumento dos níveis de digoxina.', recommendation: 'Avaliar redução de dose da digoxina.' },

  // CARBAMAZEPINA
  { drugs: ['carbamazepina', 'bcc'], severity: 'Moderate', title: 'Toxicidade Carbamazepina', effect: 'Aumento dos efeitos adversos da carbamazepina.', recommendation: 'Monitorar ataxia, sonolência.' },
  { drugs: ['carbamazepina', 'azoles'], severity: 'Major', title: 'Toxicidade Carbamazepina', effect: 'Aumento da concentração plasmática.', recommendation: 'Monitorar concentrações.' },
  { drugs: ['carbamazepina', 'isrs'], severity: 'Moderate', title: 'Toxicidade', effect: 'Aumento da concentração da carbamazepina.', recommendation: 'Avaliar substituição.' },
  { drugs: ['carbamazepina', 'haloperidol'], severity: 'Moderate', title: 'Falha Terapêutica', effect: 'Redução do efeito do haloperidol.', recommendation: 'Ajuste de dose.' },
  
  // CAPTOPRIL / ENALAPRIL (IECA)
  { drugs: ['ieca', 'aas'], severity: 'Moderate', title: 'Redução Anti-hipertensiva', effect: 'Redução da resposta anti-hipertensiva.', recommendation: 'Monitorar PA.' },
  { drugs: ['ieca', 'aines'], severity: 'Moderate', title: 'Falha Renal/Hipertensão', effect: 'Piora da função renal e redução do efeito anti-hipertensivo.', recommendation: 'Monitorar creatinina e PA.' },
  { drugs: ['ieca', 'alopurinol'], severity: 'Major', title: 'Hipersensibilidade', effect: 'Risco aumentado de reações alérgicas.', recommendation: 'Observar sinais.' },
  { drugs: ['ieca', 'espironolactona'], severity: 'Moderate', title: 'Hipercalemia', effect: 'Risco de potássio elevado.', recommendation: 'Monitorar K+.' },
  { drugs: ['ieca', 'tiazidicos'], severity: 'Moderate', title: 'Hipotensão Postural/Nefrotoxicidade', effect: 'Efeito nefrotóxico e hipotensor.', recommendation: 'Monitorar.' },

  // CEFALOSPORINAS
  { drugs: ['cefalosporinas', 'metformina'], severity: 'Moderate', title: 'Disglicemia', effect: 'Diminuição da secreção tubular da metformina.', recommendation: 'Monitorar glicemia.' },
  { drugs: ['cefalosporinas', 'aminoglicosideos'], severity: 'Moderate', title: 'Nefrotoxicidade', effect: 'Risco aditivo.', recommendation: 'Monitorar função renal.' },
  { drugs: ['cefalosporinas', 'varfarina'], severity: 'Moderate', title: 'Hemorragia', effect: 'Risco hemorrágico.', recommendation: 'Monitorar TAP/INR.' },
  { drugs: ['ceftriaxona', 'calcio'], severity: 'Major', title: 'Precipitação Pulmonar', effect: 'Precipitação de ceftriaxona-cálcio (risco de óbito).', recommendation: 'Evitar misturar na mesma via (especialmente neonatos).' },

  // CIPROFLOXACINO / QUINOLONAS
  { drugs: ['quinolonas', 'amiodarona'], severity: 'Major', title: 'Prolongamento QT', effect: 'Hipotensão e sedação severas (via CYP1A2).', recommendation: 'Contra-indicado.' },
  { drugs: ['quinolonas', 'aines'], severity: 'Moderate', title: 'Neurotoxicidade', effect: 'Nervosismo, náuseas, diarreia, convulsão.', recommendation: 'Atentar para sinais.' },
  { drugs: ['quinolonas', 'fenitoina'], severity: 'Moderate', title: 'Alteração Níveis', effect: 'Aumento ou diminuição da fenitoína.', recommendation: 'Monitorar.' },
  { drugs: ['quinolonas', 'haloperidol'], severity: 'Moderate', title: 'Prolongamento QT', effect: 'Arritmias ventriculares.', recommendation: 'Monitorar.' },
  { drugs: ['quinolonas', 'corticoides'], severity: 'Major', title: 'Ruptura de Tendão', effect: 'Risco aumentado de tendinite/ruptura.', recommendation: 'Evitar ou monitorar.' },
  { drugs: ['quinolonas', 'antiacidos'], severity: 'Moderate', title: 'Falha Terapêutica', effect: 'Redução da absorção do antibiótico.', recommendation: 'Dar intervalo de 2h antes ou 6h após.' },
  { drugs: ['quinolonas', 'estatinas'], severity: 'Major', title: 'Rabdomiólise', effect: 'Aumento da concentração da estatina.', recommendation: 'Monitorar dores musculares/CK.' },
  { drugs: ['quinolonas', 'sulfato ferroso'], severity: 'Moderate', title: 'Falha Terapêutica', effect: 'Redução da absorção por quelação.', recommendation: 'Intervalo de administração.' },
  { drugs: ['quinolonas', 'tizanidina'], severity: 'Contraindicated', title: 'Hipotensão Severa', effect: 'Inibição do metabolismo da tizanidina.', recommendation: 'Evitar uso.' },

  // CLARITROMICINA
  { drugs: ['claritromicina', 'anticonvulsivantes'], severity: 'Moderate', title: 'Ataxia/Sedação', effect: 'Aumento dos efeitos tóxicos (ácido valpróico, carbamazepina).', recommendation: 'Monitorar.' },
  { drugs: ['claritromicina', 'azoles'], severity: 'Moderate', title: 'Toxicidade Antifúngico', effect: 'Aumento dos efeitos tóxicos.', recommendation: 'Monitorar.' },
  { drugs: ['claritromicina', 'clopidogrel'], severity: 'Moderate', title: 'Hemorragia', effect: 'Risco hemorrágico.', recommendation: 'Monitorar.' },
  { drugs: ['claritromicina', 'midazolam'], severity: 'Moderate', title: 'Sedação', effect: 'Aumento do efeito sedativo.', recommendation: 'Monitorar.' },

  // CLINDAMICINA
  { drugs: ['clindamicina', 'bloq_neuromusculares'], severity: 'Moderate', title: 'Depressão Respiratória', effect: 'Potencializa bloqueio neuromuscular.', recommendation: 'Monitorar respiração.' },
  { drugs: ['clindamicina', 'eritromicina'], severity: 'Contraindicated', title: 'Antagonismo', effect: 'Redução do efeito terapêutico.', recommendation: 'Evitar.' },

  // CLONIDINA
  { drugs: ['clonidina', 'beta_bloqueadores'], severity: 'Major', title: 'Hipertensão Rebote', effect: 'Hipertensão grave na retirada abrupta.', recommendation: 'Retirar beta-bloqueador antes.' },

  // CLOPIDOGREL
  { drugs: ['clopidogrel', 'aines'], severity: 'Moderate', title: 'Hemorragia', effect: 'Risco hemorrágico aditivo.', recommendation: 'Monitorar.' },
  { drugs: ['clopidogrel', 'omeprazol'], severity: 'Major', title: 'Falha Terapêutica', effect: 'Redução da eficácia do clopidogrel (risco trombótico).', recommendation: 'Evitar (usar pantoprazol).' },

  // CLORETO DE POTÁSSIO
  { drugs: ['cloreto de potassio', 'ieca'], severity: 'Moderate', title: 'Hipercalemia', effect: 'Risco de hipercalemia.', recommendation: 'Monitorar K+.' },
  { drugs: ['cloreto de potassio', 'espironolactona'], severity: 'Moderate', title: 'Hipercalemia', effect: 'Risco de hipercalemia.', recommendation: 'Evitar ou monitorar rigorosamente.' },

  // DIGOXINA
  { drugs: ['digoxina', 'azoles'], severity: 'Moderate', title: 'Toxicidade Digitálica', effect: 'Bradicardia, náusea, vômito.', recommendation: 'Monitorar.' },
  { drugs: ['digoxina', 'macrolideos'], severity: 'Moderate', title: 'Toxicidade Digitálica', effect: 'Aumento da absorção.', recommendation: 'Monitorar.' },
  { drugs: ['digoxina', 'beta_bloqueadores'], severity: 'Moderate', title: 'Bradicardia', effect: 'Bradicardia excessiva.', recommendation: 'Monitorar.' },
  { drugs: ['digoxina', 'bcc'], severity: 'Major', title: 'Bloqueio AV', effect: 'Risco de bloqueio atrioventricular.', recommendation: 'Monitorar.' },
  { drugs: ['digoxina', 'benzodiazepinicos'], severity: 'Moderate', title: 'Sedação', effect: 'Aumento da concentração de benzos.', recommendation: 'Monitorar.' },

  // DOBUTAMINA / DOPAMINA
  { drugs: ['dobutamina', 'linezolida'], severity: 'Major', title: 'Crise Hipertensiva', effect: 'Resposta pressora aumentada.', recommendation: 'Monitorar PA.' },
  { drugs: ['dopamina', 'fenitoina'], severity: 'Major', title: 'Hipotensão', effect: 'Risco de hipotensão.', recommendation: 'Monitorar PA.' },

  // ESTATINAS
  { drugs: ['estatinas', 'fenitoina'], severity: 'Moderate', title: 'Falha Terapêutica', effect: 'Redução do efeito da estatina.', recommendation: 'Monitorar lipidograma.' },
  { drugs: ['estatinas', 'azoles'], severity: 'Major', title: 'Rabdomiólise', effect: 'Risco grave de lesão muscular.', recommendation: 'Suspender estatina.' },

  // FENITOÍNA
  { drugs: ['fenitoina', 'acido valproico'], severity: 'Moderate', title: 'Hepatotoxicidade', effect: 'Alteração níveis.', recommendation: 'Monitorar.' },
  { drugs: ['fenitoina', 'isrs'], severity: 'Moderate', title: 'Toxicidade Fenitoína', effect: 'Inibição metabólica.', recommendation: 'Monitorar níveis.' },
  
  // FENOBARBITAL
  { drugs: ['fenobarbital', 'acido valproico'], severity: 'Moderate', title: 'Sedação', effect: 'Aumento de efeitos tóxicos.', recommendation: 'Monitorar.' },
  { drugs: ['fenobarbital', 'bcc'], severity: 'Moderate', title: 'Falha Terapêutica', effect: 'Redução do efeito do BCC.', recommendation: 'Monitorar.' },
  { drugs: ['fenobarbital', 'varfarina'], severity: 'Major', title: 'Trombose', effect: 'Redução do efeito anticoagulante.', recommendation: 'Ajustar dose varfarina.' },
  { drugs: ['fenobarbital', 'antifungicos'], severity: 'Major', title: 'Falha Antifúngica', effect: 'Redução do efeito do voriconazol.', recommendation: 'Evitar.' },

  // FENTANIL
  { drugs: ['fentanil', 'benzodiazepinicos'], severity: 'Moderate', title: 'Depressão Respiratória', effect: 'Efeito aditivo no SNC.', recommendation: 'Monitorar.' },
  { drugs: ['fentanil', 'azoles'], severity: 'Moderate', title: 'Depressão SNC', effect: 'Aumento do efeito do fentanil.', recommendation: 'Ajustar dose.' },

  // FLUOXETINA
  { drugs: ['fluoxetina', 'carbamazepina'], severity: 'Major', title: 'Toxicidade', effect: 'Aumento níveis carbamazepina.', recommendation: 'Monitorar.' },
  { drugs: ['fluoxetina', 'tramadol'], severity: 'Contraindicated', title: 'Síndrome Serotoninérgica', effect: 'Risco de convulsão e síndrome.', recommendation: 'Evitar.' },

  // FUROSEMIDA
  { drugs: ['furosemida', 'ieca'], severity: 'Moderate', title: 'Hipotensão/Renal', effect: 'Hipovolemia e disfunção renal.', recommendation: 'Monitorar.' },
  { drugs: ['furosemida', 'aines'], severity: 'Moderate', title: 'Falha Diurética', effect: 'Redução da diurese.', recommendation: 'Evitar.' },

  // HEPARINA
  { drugs: ['heparina', 'alteplase'], severity: 'Major', title: 'Hemorragia Grave', effect: 'Risco hemorrágico.', recommendation: 'Monitorar.' },
  { drugs: ['heparina', 'nitroglicerina'], severity: 'Moderate', title: 'Falha Heparina', effect: 'Redução efeito anticoagulante.', recommendation: 'Ajustar dose.' },

  // HIDROCLOROTIAZIDA
  { drugs: ['hidroclorotiazida', 'amiodarona'], severity: 'Major', title: 'Arritmias', effect: 'Hipocalemia induz arritmias.', recommendation: 'Monitorar K+.' },
  { drugs: ['hidroclorotiazida', 'anfotericina b'], severity: 'Moderate', title: 'Hipocalemia', effect: 'Efeito aditivo.', recommendation: 'Repor potássio.' },
  { drugs: ['hidroclorotiazida', 'litio'], severity: 'Major', title: 'Intoxicação Lítio', effect: 'Redução da excreção de lítio.', recommendation: 'Monitorar.' },

  // INSULINAS
  { drugs: ['insulina', 'quinolonas'], severity: 'Major', title: 'Disglicemia', effect: 'Hipo ou hiperglicemia.', recommendation: 'Monitorar glicemia.' },
  { drugs: ['insulina', 'beta_bloqueadores'], severity: 'Moderate', title: 'Hipoglicemia Mascarada', effect: 'Mascaramento de sintomas.', recommendation: 'Monitorar.' },
  
  // METFORMINA
  { drugs: ['metformina', 'cefalosporinas'], severity: 'Moderate', title: 'Acidose Lática', effect: 'Diminuição da excreção.', recommendation: 'Monitorar.' },

  // METOCLOPRAMIDA
  { drugs: ['metoclopramida', 'haloperidol'], severity: 'Major', title: 'Extrapiramidalismo', effect: 'Distonia, discinesia.', recommendation: 'Não associar.' },

  // METRONIDAZOL
  { drugs: ['metronidazol', 'varfarina'], severity: 'Major', title: 'Hemorragia', effect: 'Aumento do INR.', recommendation: 'Reduzir varfarina.' },
  
  // OMEPRAZOL
  { drugs: ['omeprazol', 'fenitoina'], severity: 'Moderate', title: 'Toxicidade', effect: 'Ataxia, nistagmo.', recommendation: 'Monitorar.' },
  { drugs: ['omeprazol', 'varfarina'], severity: 'Moderate', title: 'Hemorragia', effect: 'Aumento do INR.', recommendation: 'Monitorar.' },

  // PARACETAMOL
  { drugs: ['paracetamol', 'varfarina'], severity: 'Moderate', title: 'Hemorragia', effect: 'Aumento do INR (doses altas/prolongadas).', recommendation: 'Monitorar.' },
  { drugs: ['paracetamol', 'isoniazida'], severity: 'Moderate', title: 'Hepatotoxicidade', effect: 'Risco hepático.', recommendation: 'Monitorar.' },

  // SULFAMETOXAZOL + TRIMETOPRIMA
  { drugs: ['sulfametoxazol', 'digoxina'], severity: 'Moderate', title: 'Toxicidade Digitálica', effect: 'Aumento níveis digoxina.', recommendation: 'Monitorar.' },
  { drugs: ['sulfametoxazol', 'ieca'], severity: 'Moderate', title: 'Hipercalemia', effect: 'Risco grave.', recommendation: 'Monitorar.' },
  { drugs: ['sulfametoxazol', 'varfarina'], severity: 'Major', title: 'Hemorragia', effect: 'Aumento INR.', recommendation: 'Ajustar dose.' },

  // TRAMADOL
  { drugs: ['tramadol', 'linezolida'], severity: 'Contraindicated', title: 'Síndrome Serotoninérgica', effect: 'Neurotoxicidade.', recommendation: 'Evitar.' },
  { drugs: ['tramadol', 'ondansetrona'], severity: 'Major', title: 'Arritmias', effect: 'Risco ventricular.', recommendation: 'Evitar.' },

  // VANCOMICINA
  { drugs: ['vancomicina', 'aminoglicosideos'], severity: 'Moderate', title: 'Nefrotoxicidade', effect: 'Dano renal aditivo.', recommendation: 'Monitorar.' },
  { drugs: ['vancomicina', 'aines'], severity: 'Moderate', title: 'Toxicidade', effect: 'Aumento toxicidade vancomicina.', recommendation: 'Monitorar.' },

  // VARFARINA
  { drugs: ['varfarina', 'aas'], severity: 'Major', title: 'Hemorragia', effect: 'Risco alto.', recommendation: 'Monitorar.' },
  { drugs: ['varfarina', 'aines'], severity: 'Moderate', title: 'Hemorragia', effect: 'Risco alto.', recommendation: 'Monitorar.' },
  { drugs: ['varfarina', 'tamoxifeno'], severity: 'Major', title: 'Hemorragia', effect: 'Aumento INR.', recommendation: 'Monitorar.' }
];

export const PatientDashboard: React.FC<DashboardProps> = ({ patients, updatePatient }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const patient = patients.find(p => p.id === id);
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile sidebar state

  // --- Local States for Forms ---
  // Evolution
  const [evolutionContent, setEvolutionContent] = useState('');
  const [selectedEvolution, setSelectedEvolution] = useState<Evolution | null>(null); // For viewing full modal
  
  // Vital Signs - Strings to allow empty/decimals
  const [vitalForm, setVitalForm] = useState({
    fc: '', fr: '', pas: '', pad: '', sato2: '', dextro: ''
  });

  // Labs
  const [labDate, setLabDate] = useState(new Date().toISOString().slice(0, 10));
  const [labValues, setLabValues] = useState<Record<string, string>>({});
  const [customExamName, setCustomExamName] = useState('');

  // Imaging
  const [imgDesc, setImgDesc] = useState('');
  const [imgDate, setImgDate] = useState(new Date().toISOString().slice(0, 10));
  
  // Medications
  const [medForm, setMedForm] = useState({
    name: '', route: '', dose: '', frequency: '', startDate: new Date().toISOString().slice(0, 10), endDate: '', isContinuous: false
  });

  // Diagnosis
  const [diagForm, setDiagForm] = useState({
    name: '', date: new Date().toISOString().slice(0, 10), status: 'Ativo' as 'Ativo'|'Resolvido'
  });

  // Alerts
  const [alertText, setAlertText] = useState('');

  // Charts
  const [chartMetric, setChartMetric] = useState('leucocitos');
  const [chartType, setChartType] = useState<'lab' | 'vital'>('lab');

  // --- Effects ---
  useEffect(() => {
    if (!patient) navigate('/');
  }, [patient, navigate]);

  // --- Helpers ---
  const normalizeText = (text: string) => {
    return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  };

  const getDrugKeys = (drugName: string): string[] => {
    const normalizedName = normalizeText(drugName);
    const keys = [normalizedName];
    
    // Add classes based on inclusion
    Object.entries(DRUG_CLASSES).forEach(([className, drugList]) => {
      // Check if the normalized name exactly matches a known drug OR contains it
      // Also check if the normalized name IS the class name (e.g. user typed "AINES")
      if (drugList.some(d => normalizedName === normalizeText(d) || normalizedName.includes(normalizeText(d))) || normalizedName === className) {
        keys.push(className);
      }
    });
    return keys;
  };

  // --- Computed ---
  const detectedInteractions = useMemo(() => {
    if (!patient) return [];
    const activeMeds = patient.prescriptions.filter(m => !m.endDate); // Only checking active meds for now
    const interactions: any[] = [];

    for (let i = 0; i < activeMeds.length; i++) {
      for (let j = i + 1; j < activeMeds.length; j++) {
        const medA = activeMeds[i];
        const medB = activeMeds[j];

        const keysA = getDrugKeys(medA.name);
        const keysB = getDrugKeys(medB.name);

        INTERACTION_DB.forEach(rule => {
          const [ruleDrug1, ruleDrug2] = rule.drugs; // These are normalized keys in DB
          
          // Check if (KeyA has Rule1 AND KeyB has Rule2) OR (KeyA has Rule2 AND KeyB has Rule1)
          const match1 = keysA.includes(ruleDrug1) && keysB.includes(ruleDrug2);
          const match2 = keysA.includes(ruleDrug2) && keysB.includes(ruleDrug1);

          if (match1 || match2) {
            interactions.push({
              ...rule,
              med1: medA.name,
              med2: medB.name
            });
          }
        });
      }
    }
    return interactions;
  }, [patient?.prescriptions]);

  if (!patient) return null;

  // --- Handlers ---
  const saveEvolution = () => {
    if (!evolutionContent) return;
    const newEv: Evolution = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      content: evolutionContent
    };
    updatePatient({
      ...patient,
      evolutions: [newEv, ...patient.evolutions]
    });
    setEvolutionContent('');
    alert('Evolução salva!');
  };

  const saveVitalSign = () => {
    const newVS: VitalSign = {
      date: new Date().toISOString(),
      fc: Number(vitalForm.fc) || 0,
      fr: Number(vitalForm.fr) || 0,
      pas: Number(vitalForm.pas) || 0,
      pad: Number(vitalForm.pad) || 0,
      sato2: Number(vitalForm.sato2) || 0,
      dextro: Number(vitalForm.dextro) || 0
    };
    updatePatient({
      ...patient,
      vitalSigns: [newVS, ...patient.vitalSigns]
    });
    setVitalForm({ fc: '', fr: '', pas: '', pad: '', sato2: '', dextro: '' });
    alert('Sinais Vitais salvos!');
  };

  const saveLabResults = () => {
    // Clean empty string values before saving
    const cleanValues: Record<string, number> = {};
    Object.entries(labValues).forEach(([k, v]) => {
      if (v !== '') cleanValues[k] = Number(v);
    });

    // Auto calculate TFG if Creatinine is present
    if (cleanValues['creatinina']) {
      cleanValues['tfg'] = calculateCKDEPI(cleanValues['creatinina'], patient.age, patient.sex, patient.ethnicity);
    }

    const newLab: LabResult = {
      date: new Date(labDate).toISOString(),
      values: cleanValues
    };

    // Merge with existing if same date? No, just push new
    updatePatient({
      ...patient,
      labResults: [newLab, ...patient.labResults].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    });
    setLabValues({});
    alert('Exames salvos!');
  };

  const handleAddCustomExam = () => {
    if(!customExamName) return;
    // In a real app we would persist this definition. Here we just allow entering it.
    // We'll force it into the current lab values form to allow entry
    setLabValues(prev => ({...prev, [customExamName.toLowerCase()]: ''}));
    setCustomExamName('');
  };

  const saveMedication = () => {
    if (!medForm.name) return;
    const newMed: Medication = {
      id: Date.now().toString(),
      ...medForm
    };
    updatePatient({
      ...patient,
      prescriptions: [...patient.prescriptions, newMed]
    });
    setMedForm({ name: '', route: '', dose: '', frequency: '', startDate: new Date().toISOString().slice(0, 10), endDate: '', isContinuous: false });
  };

  const removeMedication = (id: string) => {
     updatePatient({
       ...patient,
       prescriptions: patient.prescriptions.filter(m => m.id !== id)
     });
  };

  const saveDiagnosis = () => {
    if (!diagForm.name) return;
    const newDiag: Diagnosis = {
      id: Date.now().toString(),
      name: diagForm.name,
      date: diagForm.date,
      status: diagForm.status
    };
    updatePatient({
       ...patient,
       diagnostics: [newDiag, ...patient.diagnostics]
    });
    setDiagForm({ name: '', date: new Date().toISOString().slice(0, 10), status: 'Ativo' });
  };

  const toggleDiagStatus = (id: string) => {
    const updatedDiags = patient.diagnostics.map(d => 
      d.id === id ? { ...d, status: d.status === 'Ativo' ? 'Resolvido' : 'Ativo' } as Diagnosis : d
    );
    updatePatient({ ...patient, diagnostics: updatedDiags });
  };

  const saveAlert = () => {
    if (!alertText) return;
    const newAlert = { id: Date.now().toString(), text: alertText, isResolved: false };
    updatePatient({ ...patient, alerts: [newAlert, ...patient.alerts] });
    setAlertText('');
  };

  const toggleAlert = (id: string) => {
    const updated = patient.alerts.map(a => a.id === id ? { ...a, isResolved: !a.isResolved } : a);
    updatePatient({ ...patient, alerts: updated });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
           const base64String = reader.result as string;
           const newImg: ImagingExam = {
              id: Date.now().toString(),
              date: imgDate,
              description: imgDesc || file.name,
              attachmentName: file.name,
              attachmentType: file.type,
              attachmentData: base64String
           };
           updatePatient({
              ...patient,
              imaging: [newImg, ...patient.imaging]
           });
           setImgDesc('');
        };
        reader.readAsDataURL(file);
     }
  };

  const saveImageNote = () => {
     if(!imgDesc) return;
     const newImg: ImagingExam = {
        id: Date.now().toString(),
        date: imgDate,
        description: imgDesc
     };
     updatePatient({
        ...patient,
        imaging: [newImg, ...patient.imaging]
     });
     setImgDesc('');
  };

  const handlePrint = () => {
    window.print();
  };

  // --- Sub-components for Tabs ---

  const Summary = () => (
    <div className="space-y-6">
      {/* Patient Info Header */}
      <div className="bg-blue-600 text-white p-6 rounded-xl shadow-md">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div>
             <h2 className="text-3xl font-bold">{patient.firstName} {patient.lastName}</h2>
             <div className="mt-2 flex flex-wrap gap-4 text-blue-100 text-sm">
                <span className="flex items-center gap-1"><Activity size={16}/> {patient.age} anos</span>
                <span>|</span>
                <span>{patient.sex}</span>
                <span>|</span>
                <span>Leito: {patient.bed}</span>
                <span>|</span>
                <span>IMC: {patient.bmi}</span>
             </div>
          </div>
          <div className="text-right md:text-right">
            <p className="text-xs opacity-75 uppercase tracking-wider">Admissão</p>
            <p className="font-semibold">{formatDate(patient.admissionDate)}</p>
            <p className="text-sm mt-1">{patient.hospital}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {/* Alerts */}
         <Card title="Alertas e Pendências" className="md:col-span-1 border-l-4 border-l-red-500">
           {patient.alerts.filter(a => !a.isResolved).length === 0 ? (
             <p className="text-slate-400 italic">Sem pendências ativas.</p>
           ) : (
             <ul className="space-y-2">
               {patient.alerts.filter(a => !a.isResolved).map(a => (
                 <li key={a.id} className="flex items-start gap-2 text-red-700 bg-red-50 p-2 rounded">
                   <AlertTriangle size={16} className="mt-1 shrink-0" />
                   <span>{a.text}</span>
                 </li>
               ))}
             </ul>
           )}
         </Card>

         {/* Active Diagnoses */}
         <Card title="Diagnósticos Ativos" className="md:col-span-2">
           <div className="flex flex-wrap gap-2">
             {patient.diagnostics.filter(d => d.status === 'Ativo').length === 0 ? (
               <p className="text-slate-400 italic">Nenhum diagnóstico ativo.</p>
             ) : (
               patient.diagnostics.filter(d => d.status === 'Ativo').map(d => (
                 <span key={d.id} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium border border-blue-200">
                   {d.name}
                 </span>
               ))
             )}
           </div>
         </Card>
      </div>

      {/* Last Evolution */}
      <Card title="Última Evolução">
        {patient.evolutions.length > 0 ? (
          <div>
            <p className="text-xs text-slate-400 mb-2">{formatDateTime(patient.evolutions[0].date)}</p>
            <p className="whitespace-pre-wrap text-slate-700">{patient.evolutions[0].content}</p>
          </div>
        ) : <p className="text-slate-400 italic">Sem evoluções registradas.</p>}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Last Vitals */}
        <Card title="Últimos Sinais Vitais">
           {patient.vitalSigns.length > 0 ? (
             <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500">PA</p>
                  <p className="text-lg font-bold text-slate-800">{patient.vitalSigns[0].pas}/{patient.vitalSigns[0].pad}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500">FC</p>
                  <p className="text-lg font-bold text-slate-800">{patient.vitalSigns[0].fc}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500">SatO2</p>
                  <p className="text-lg font-bold text-slate-800">{patient.vitalSigns[0].sato2}%</p>
                </div>
             </div>
           ) : <p className="text-slate-400 italic">Sem registros.</p>}
        </Card>

        {/* Current Meds Summary */}
        <Card title="Medicações em Uso">
           <ul className="space-y-1 text-sm text-slate-700">
             {patient.prescriptions.filter(m => !m.endDate).slice(0, 5).map(m => (
               <li key={m.id} className="flex items-center gap-2">
                 <Pill size={14} className="text-blue-500" /> {m.name}
               </li>
             ))}
             {patient.prescriptions.filter(m => !m.endDate).length === 0 && <p className="text-slate-400 italic">Nenhuma.</p>}
             {patient.prescriptions.filter(m => !m.endDate).length > 5 && <li className="text-blue-600 text-xs pt-1">Ver todas...</li>}
           </ul>
        </Card>
      </div>
    </div>
  );

  const AnamnesisTab = () => {
     const [localData, setLocalData] = useState({
       hpp: patient.hpp,
       continuousMeds: patient.continuousMeds,
       habits: patient.habits,
       hda: patient.hda,
       allergies: patient.allergies
     });

     const handleSave = () => {
       updatePatient({ ...patient, ...localData });
       alert('Anamnese atualizada!');
     };

     return (
       <div className="space-y-6">
         <Card title="Anamnese e História" action={<Button onClick={handleSave} size="sm"><Save size={16} className="mr-2"/> Salvar</Button>}>
            <div className="space-y-4">
               <TextArea label="História da Doença Atual (HDA)" rows={4} value={localData.hda} onChange={e => setLocalData({...localData, hda: e.target.value})} className="bg-white text-slate-900" />
               <TextArea label="História Patológica Pregressa (HPP)" rows={3} value={localData.hpp} onChange={e => setLocalData({...localData, hpp: e.target.value})} className="bg-white text-slate-900" />
               <TextArea label="Medicações de Uso Contínuo (Prévio)" rows={3} value={localData.continuousMeds} onChange={e => setLocalData({...localData, continuousMeds: e.target.value})} className="bg-white text-slate-900" />
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TextArea label="Hábitos de Vida" rows={3} value={localData.habits} onChange={e => setLocalData({...localData, habits: e.target.value})} className="bg-white text-slate-900" />
                  <TextArea label="Alergias" rows={3} value={localData.allergies} onChange={e => setLocalData({...localData, allergies: e.target.value})} className="bg-white text-slate-900" />
               </div>
            </div>
         </Card>
       </div>
     );
  };

  const ProntuarioDia = () => {
    const activeDiags = patient.diagnostics.filter(d => d.status === 'Ativo');
    const activeMeds = patient.prescriptions.filter(m => !m.endDate);
    const lastEvo = patient.evolutions[0];
    const lastVital = patient.vitalSigns[0];
    const activeAlerts = patient.alerts.filter(a => !a.isResolved);

    // Determine all unique exam keys present in history for the table
    const allExamKeys = Array.from(new Set(patient.labResults.flatMap(r => Object.keys(r.values))));
    // Sort dates ascending for table columns
    const sortedLabDates = [...patient.labResults].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return (
      <div className="bg-white shadow-lg p-8 max-w-[210mm] mx-auto min-h-[297mm] print:w-full print:shadow-none">
         <div className="flex justify-between items-start border-b-2 border-slate-800 pb-4 mb-6">
           <div>
             <h1 className="text-3xl font-bold text-slate-900 uppercase tracking-widest">Prontuário Diário</h1>
             <p className="text-slate-500 text-sm mt-1">RecMed - Gestão Clínica</p>
           </div>
           <div className="text-right">
              <p className="text-lg font-bold">{formatDate(new Date().toISOString())}</p>
              <Button onClick={handlePrint} variant="outline" className="print:hidden mt-2 flex items-center gap-2 ml-auto">
                <Printer size={16} /> Imprimir / PDF
              </Button>
           </div>
         </div>

         {/* Identification */}
         <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-6 text-sm border-b border-slate-200 pb-4">
            <p><span className="font-bold">Paciente:</span> {patient.firstName} {patient.lastName}</p>
            <p><span className="font-bold">Idade/Sexo:</span> {patient.age} anos / {patient.sex}</p>
            <p><span className="font-bold">Registro/ID:</span> {patient.id}</p>
            <p><span className="font-bold">Leito:</span> {patient.bed}</p>
            <p><span className="font-bold">Admissão:</span> {formatDate(patient.admissionDate)}</p>
         </div>

         <div className="space-y-6">
            {/* Anamnesis Summary */}
            <section>
              <h3 className="text-sm font-bold text-slate-900 uppercase bg-slate-100 p-1 mb-2 border-l-4 border-slate-800">Anamnese Resumida</h3>
              <div className="text-sm text-slate-800 grid grid-cols-1 gap-2">
                 <p><span className="font-semibold">HDA:</span> {patient.hda || '-'}</p>
                 <p><span className="font-semibold">HPP:</span> {patient.hpp || '-'}</p>
                 <p><span className="font-semibold">Alergias:</span> {patient.allergies || '-'}</p>
              </div>
            </section>

            {/* Diagnósticos */}
            <section>
              <h3 className="text-sm font-bold text-slate-900 uppercase bg-slate-100 p-1 mb-2 border-l-4 border-slate-800">Diagnósticos Ativos</h3>
              <ul className="list-disc list-inside text-sm ml-2">
                {activeDiags.length > 0 ? activeDiags.map(d => <li key={d.id}>{d.name} <span className="text-slate-500 text-xs">({formatDate(d.date)})</span></li>) : <li>Nenhum</li>}
              </ul>
            </section>

            {/* Evolução */}
            <section>
              <h3 className="text-sm font-bold text-slate-900 uppercase bg-slate-100 p-1 mb-2 border-l-4 border-slate-800">Evolução do Dia</h3>
              {lastEvo ? (
                <div className="text-sm whitespace-pre-wrap border border-slate-200 p-3 rounded min-h-[100px]">
                  <p className="font-bold text-xs text-slate-500 mb-1">{formatDateTime(lastEvo.date)}</p>
                  {lastEvo.content}
                </div>
              ) : <p className="text-sm italic text-slate-500">Não registrada hoje.</p>}
            </section>

            {/* Sinais Vitais */}
            <section>
               <h3 className="text-sm font-bold text-slate-900 uppercase bg-slate-100 p-1 mb-2 border-l-4 border-slate-800">Sinais Vitais (Último registro)</h3>
               {lastVital ? (
                 <div className="grid grid-cols-6 gap-2 text-center text-sm border p-2 rounded">
                    <div><span className="block text-xs font-bold text-slate-500">PA</span>{lastVital.pas}/{lastVital.pad}</div>
                    <div><span className="block text-xs font-bold text-slate-500">FC</span>{lastVital.fc}</div>
                    <div><span className="block text-xs font-bold text-slate-500">FR</span>{lastVital.fr}</div>
                    <div><span className="block text-xs font-bold text-slate-500">SatO2</span>{lastVital.sato2}%</div>
                    <div><span className="block text-xs font-bold text-slate-500">Dextro</span>{lastVital.dextro || '-'}</div>
                    <div><span className="block text-xs font-bold text-slate-500">Data</span>{formatDateTime(lastVital.date).split(' ')[1]}</div>
                 </div>
               ) : <p className="text-sm italic text-slate-500">Sem registro.</p>}
            </section>

            {/* Prescrição */}
            <section>
               <h3 className="text-sm font-bold text-slate-900 uppercase bg-slate-100 p-1 mb-2 border-l-4 border-slate-800">Prescrição Médica</h3>
               <table className="w-full text-sm text-left">
                  <thead><tr className="border-b border-slate-300"><th className="pb-1">Medicamento</th><th className="pb-1">Dose/Freq/Via</th></tr></thead>
                  <tbody>
                    {activeMeds.map(m => (
                      <tr key={m.id} className="border-b border-slate-100">
                        <td className="py-1 font-medium">{m.name}</td>
                        <td className="py-1">{m.dose} - {m.frequency} ({m.route})</td>
                      </tr>
                    ))}
                    {activeMeds.length === 0 && <tr><td colSpan={2} className="py-2 italic text-slate-500">Sem prescrições ativas.</td></tr>}
                  </tbody>
               </table>
            </section>

            {/* Pendências */}
            {activeAlerts.length > 0 && (
              <section>
                <h3 className="text-sm font-bold text-red-800 uppercase bg-red-50 p-1 mb-2 border-l-4 border-red-600">Pendências / Alertas</h3>
                <ul className="list-square list-inside text-sm text-red-700 ml-2">
                  {activeAlerts.map(a => <li key={a.id}>{a.text}</li>)}
                </ul>
              </section>
            )}

            {/* Lab Results Table */}
            {sortedLabDates.length > 0 && (
               <section className="break-inside-avoid">
                  <h3 className="text-sm font-bold text-slate-900 uppercase bg-slate-100 p-1 mb-2 border-l-4 border-slate-800">Histórico de Exames Recentes</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse border border-slate-300">
                      <thead>
                        <tr className="bg-slate-50">
                          <th className="border border-slate-300 p-1 text-left min-w-[100px]">Exame</th>
                          {sortedLabDates.slice(-5).map(lr => (
                            <th key={lr.date} className="border border-slate-300 p-1 text-center min-w-[70px]">
                              {formatDate(lr.date)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {LAB_FIELDS.map(field => (
                           (allExamKeys.includes(field.key)) && (
                            <tr key={field.key}>
                              <td className="border border-slate-300 p-1 font-medium">{field.label}</td>
                              {sortedLabDates.slice(-5).map(lr => (
                                <td key={lr.date} className="border border-slate-300 p-1 text-center">
                                  {lr.values[field.key] !== undefined ? lr.values[field.key] : '-'}
                                </td>
                              ))}
                            </tr>
                           )
                        ))}
                        {/* Custom Exams */}
                         {allExamKeys.filter(k => !LAB_FIELDS.some(f => f.key === k)).map(key => (
                            <tr key={key}>
                              <td className="border border-slate-300 p-1 font-medium capitalize">{key}</td>
                              {sortedLabDates.slice(-5).map(lr => (
                                <td key={lr.date} className="border border-slate-300 p-1 text-center">
                                  {lr.values[key] !== undefined ? lr.values[key] : '-'}
                                </td>
                              ))}
                            </tr>
                         ))}
                      </tbody>
                    </table>
                  </div>
               </section>
            )}

            {/* Imaging Notes */}
            {patient.imaging.length > 0 && (
              <section className="break-inside-avoid">
                 <h3 className="text-sm font-bold text-slate-900 uppercase bg-slate-100 p-1 mb-2 border-l-4 border-slate-800">Notas de Imagem e Anexos</h3>
                 <ul className="text-sm space-y-2">
                    {patient.imaging.slice(0, 5).map(img => (
                       <li key={img.id} className="border-b border-slate-100 pb-1">
                          <span className="font-bold text-xs mr-2">{formatDate(img.date)}:</span>
                          {img.description} 
                          {img.attachmentName && <span className="text-xs italic text-slate-500 ml-1">(Anexo: {img.attachmentName})</span>}
                       </li>
                    ))}
                 </ul>
              </section>
            )}
         </div>

         <div className="mt-12 pt-8 border-t border-slate-300 text-center text-xs text-slate-400">
            <p>Documento gerado eletronicamente pelo sistema RecMed.</p>
         </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row overflow-hidden">
      
      {/* Mobile Sidebar Overlay & Button */}
      <div className="md:hidden bg-white p-4 flex justify-between items-center border-b border-slate-200 sticky top-0 z-20">
        <span className="font-bold text-slate-800">RecMed - Prontuário</span>
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-600"><Menu /></button>
      </div>
      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setIsSidebarOpen(false)} />}

      {/* Sidebar Navigation */}
      <aside className={`
          fixed md:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 shadow-sm transform transition-transform duration-200 ease-in-out overflow-y-auto
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
           <div>
             <h1 className="text-xl font-bold text-blue-600 flex items-center gap-2">
               <Activity /> RecMed
             </h1>
             <p className="text-xs text-slate-400 mt-1">Gestão Clínica</p>
           </div>
           <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400"><X size={20}/></button>
        </div>
        
        <nav className="p-4 space-y-1">
           <Button variant="secondary" className="w-full justify-start mb-6 bg-slate-100 hover:bg-slate-200 text-slate-600" onClick={() => navigate('/')}>
             ← Voltar para Lista
           </Button>

           {[
             { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard },
             { id: 'prontuario', label: 'Prontuário do Dia', icon: Printer },
             { id: 'anamnese', label: 'Anamnese', icon: FileText },
             { id: 'diagnosticos', label: 'Diagnósticos', icon: Stethoscope },
             { id: 'evolucao', label: 'Evolução e Conduta', icon: ClipboardList },
             { id: 'sinais', label: 'Sinais Vitais', icon: Activity },
             { id: 'exames', label: 'Exames Laboratoriais', icon: FlaskConical },
             { id: 'imagem', label: 'Exames de Imagem', icon: ImageIcon },
             { id: 'medicacoes', label: 'Medicações', icon: Pill },
             { id: 'interacoes', label: 'Interações Med.', icon: GitCompare },
             { id: 'graficos', label: 'Análise Gráfica', icon: BarChart2 },
             { id: 'alertas', label: 'Alertas e Pendências', icon: AlertTriangle },
           ].map(item => (
             <button
               key={item.id}
               onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }}
               className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                 activeTab === item.id 
                   ? 'bg-blue-50 text-blue-700' 
                   : 'text-slate-600 hover:bg-slate-50'
               }`}
             >
               <item.icon size={18} />
               {item.label}
             </button>
           ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-screen">
         {activeTab === 'dashboard' && <Summary />}
         {activeTab === 'prontuario' && <ProntuarioDia />}
         {activeTab === 'anamnese' && <AnamnesisTab />}
         
         {activeTab === 'diagnosticos' && (
           <div className="space-y-6">
             <Card title="Novo Diagnóstico">
               <div className="flex flex-col md:flex-row gap-4 items-end">
                 <div className="flex-1 w-full">
                   <Input label="Hipótese Diagnóstica" value={diagForm.name} onChange={e => setDiagForm({...diagForm, name: e.target.value})} className="bg-white text-slate-900" />
                 </div>
                 <div className="w-full md:w-40">
                   <Input label="Data" type="date" value={diagForm.date} onChange={e => setDiagForm({...diagForm, date: e.target.value})} className="bg-white text-slate-900" />
                 </div>
                 <div className="w-full md:w-40">
                   <Select label="Status" value={diagForm.status} onChange={e => setDiagForm({...diagForm, status: e.target.value as any})} className="bg-white text-slate-900">
                     <option value="Ativo">Ativo</option>
                     <option value="Resolvido">Resolvido</option>
                   </Select>
                 </div>
                 <Button onClick={saveDiagnosis} className="mb-4 w-full md:w-auto"><Plus size={18}/></Button>
               </div>
             </Card>
             
             <Card title="Histórico de Diagnósticos">
               <div className="space-y-2">
                 {patient.diagnostics.map(d => (
                   <div key={d.id} className={`flex justify-between items-center p-4 rounded-lg border ${d.status === 'Ativo' ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                      <div>
                        <p className="font-semibold">{d.name}</p>
                        <p className="text-xs opacity-70">{formatDate(d.date)}</p>
                      </div>
                      <button onClick={() => toggleDiagStatus(d.id)} className={`px-3 py-1 rounded-full text-xs font-bold border ${d.status === 'Ativo' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-slate-200 text-slate-600 border-slate-300'}`}>
                        {d.status}
                      </button>
                   </div>
                 ))}
               </div>
             </Card>
           </div>
         )}

         {activeTab === 'evolucao' && (
           <div className="space-y-6">
             {/* View Full Evolution Modal */}
             {selectedEvolution && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                   <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto relative">
                      <button onClick={() => setSelectedEvolution(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X/></button>
                      <h3 className="text-lg font-bold mb-2 text-blue-600">Evolução de {formatDateTime(selectedEvolution.date)}</h3>
                      <div className="prose prose-sm max-w-none whitespace-pre-wrap text-slate-800">
                        {selectedEvolution.content}
                      </div>
                   </div>
                </div>
             )}

             <Card title="Nova Evolução" action={<Button onClick={saveEvolution}><Save size={16} className="mr-2"/> Salvar</Button>}>
               <TextArea 
                 label="Descreva a evolução diária e conduta" 
                 rows={10} 
                 value={evolutionContent} 
                 onChange={e => setEvolutionContent(e.target.value)} 
                 placeholder="SOAP..."
                 className="bg-white text-slate-900"
               />
             </Card>
             
             <div className="space-y-4">
               <h3 className="font-semibold text-slate-700 px-1">Histórico</h3>
               {patient.evolutions.map(ev => (
                 <div key={ev.id} onClick={() => setSelectedEvolution(ev)} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:border-blue-300 cursor-pointer transition-colors">
                   <div className="flex justify-between mb-2">
                     <span className="text-sm font-bold text-slate-700">{formatDateTime(ev.date)}</span>
                     <FileText size={16} className="text-slate-400" />
                   </div>
                   <p className="text-sm text-slate-600 line-clamp-3">{ev.content}</p>
                 </div>
               ))}
             </div>
           </div>
         )}

         {activeTab === 'sinais' && (
           <div className="space-y-6">
             <Card title="Registrar Sinais Vitais" action={<Button onClick={saveVitalSign}><Save size={16} className="mr-2"/> Salvar</Button>}>
               <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                 <Input label="PAS (mmHg)" type="number" value={vitalForm.pas} onChange={e => setVitalForm({...vitalForm, pas: e.target.value})} className="bg-white text-slate-900" />
                 <Input label="PAD (mmHg)" type="number" value={vitalForm.pad} onChange={e => setVitalForm({...vitalForm, pad: e.target.value})} className="bg-white text-slate-900" />
                 <Input label="FC (bpm)" type="number" value={vitalForm.fc} onChange={e => setVitalForm({...vitalForm, fc: e.target.value})} className="bg-white text-slate-900" />
                 <Input label="FR (irpm)" type="number" value={vitalForm.fr} onChange={e => setVitalForm({...vitalForm, fr: e.target.value})} className="bg-white text-slate-900" />
                 <Input label="SatO2 (%)" type="number" value={vitalForm.sato2} onChange={e => setVitalForm({...vitalForm, sato2: e.target.value})} className="bg-white text-slate-900" />
                 <Input label="Dextro (mg/dL)" type="number" value={vitalForm.dextro} onChange={e => setVitalForm({...vitalForm, dextro: e.target.value})} className="bg-white text-slate-900" />
               </div>
             </Card>

             <Card title="Histórico">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-600 font-medium">
                      <tr>
                        <th className="p-3 rounded-tl-lg">Data/Hora</th>
                        <th className="p-3">PA</th>
                        <th className="p-3">FC</th>
                        <th className="p-3">FR</th>
                        <th className="p-3">SatO2</th>
                        <th className="p-3 rounded-tr-lg">Dextro</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {patient.vitalSigns.map((vs, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="p-3">{formatDateTime(vs.date)}</td>
                          <td className="p-3 font-semibold">{vs.pas}/{vs.pad}</td>
                          <td className="p-3">{vs.fc}</td>
                          <td className="p-3">{vs.fr}</td>
                          <td className="p-3">{vs.sato2}%</td>
                          <td className="p-3">{vs.dextro || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
             </Card>
           </div>
         )}

         {activeTab === 'exames' && (
           <div className="space-y-6">
             <Card title="Registrar Exames Laboratoriais" action={<Button onClick={saveLabResults}><Save size={16} className="mr-2"/> Salvar</Button>}>
               <div className="mb-6">
                 <Input label="Data do Exame" type="date" value={labDate} onChange={e => setLabDate(e.target.value)} className="bg-white text-slate-900" />
               </div>
               <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                 {LAB_FIELDS.map(field => (
                   <div key={field.key}>
                     <label className="block text-xs font-medium text-slate-500 mb-1">{field.label} ({field.unit})</label>
                     <input 
                        type="number" 
                        className="w-full rounded border-slate-300 py-1 px-2 text-sm bg-white text-slate-900"
                        value={labValues[field.key] || ''}
                        onChange={e => setLabValues({...labValues, [field.key]: e.target.value})}
                     />
                   </div>
                 ))}
               </div>
               
               {/* Add Custom Exam */}
               <div className="mt-6 pt-4 border-t border-slate-100">
                 <label className="block text-sm font-medium text-slate-700 mb-2">Adicionar Outro Exame</label>
                 <div className="flex gap-2">
                   <input 
                      type="text" 
                      placeholder="Nome do exame (ex: Troponina)" 
                      className="flex-1 rounded border-slate-300 px-3 py-2 bg-white text-slate-900"
                      value={customExamName}
                      onChange={e => setCustomExamName(e.target.value)}
                   />
                   <Button type="button" onClick={handleAddCustomExam} variant="secondary">Adicionar</Button>
                 </div>
                 {/* Display custom fields that have been added to state */}
                 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
                    {Object.keys(labValues).filter(k => !LAB_FIELDS.some(f => f.key === k)).map(key => (
                       <div key={key}>
                         <label className="block text-xs font-medium text-slate-500 mb-1 capitalize">{key}</label>
                         <input 
                            type="number" 
                            className="w-full rounded border-slate-300 py-1 px-2 text-sm bg-white text-slate-900"
                            value={labValues[key]}
                            onChange={e => setLabValues({...labValues, [key]: e.target.value})}
                         />
                       </div>
                    ))}
                 </div>
               </div>
             </Card>

             <Card title="Histórico de Resultados">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="p-2 border border-slate-200 text-left min-w-[120px]">Exame</th>
                        {patient.labResults.map((res, i) => (
                          <th key={i} className="p-2 border border-slate-200 min-w-[80px] text-center whitespace-nowrap">
                            {formatDate(res.date)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Standard Fields */}
                      {LAB_FIELDS.map(field => (
                        <tr key={field.key} className="hover:bg-slate-50">
                          <td className="p-2 border border-slate-200 font-medium text-slate-700">
                            {field.label} <span className="text-[10px] text-slate-400 block">{field.unit}</span>
                          </td>
                          {patient.labResults.map((res, i) => (
                            <td key={i} className="p-2 border border-slate-200 text-center">
                              {res.values[field.key] !== undefined ? res.values[field.key] : '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                      {/* Dynamically find other keys present in history */}
                      {Array.from(new Set(patient.labResults.flatMap(r => Object.keys(r.values))))
                        .filter(k => !LAB_FIELDS.some(f => f.key === k))
                        .map(key => (
                          <tr key={key} className="hover:bg-slate-50">
                            <td className="p-2 border border-slate-200 font-medium text-slate-700 capitalize">{key}</td>
                            {patient.labResults.map((res, i) => (
                              <td key={i} className="p-2 border border-slate-200 text-center">
                                {res.values[key] !== undefined ? res.values[key] : '-'}
                              </td>
                            ))}
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
             </Card>
           </div>
         )}

         {activeTab === 'medicacoes' && (
           <div className="space-y-6">
             <Card title="Prescrever Medicação">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                  <div className="lg:col-span-2">
                    <Input label="Nome do Medicamento" value={medForm.name} onChange={e => setMedForm({...medForm, name: e.target.value})} className="bg-white text-slate-900" />
                  </div>
                  <Input label="Via" value={medForm.route} onChange={e => setMedForm({...medForm, route: e.target.value})} placeholder="Ex: IV, VO" className="bg-white text-slate-900" />
                  <Input label="Dose" value={medForm.dose} onChange={e => setMedForm({...medForm, dose: e.target.value})} className="bg-white text-slate-900" />
                  <Input label="Frequência" value={medForm.frequency} onChange={e => setMedForm({...medForm, frequency: e.target.value})} placeholder="Ex: 8/8h" className="bg-white text-slate-900" />
                  <Input label="Início" type="date" value={medForm.startDate} onChange={e => setMedForm({...medForm, startDate: e.target.value})} className="bg-white text-slate-900" />
                  <div className="flex items-center gap-2 mb-4 h-10">
                     <input type="checkbox" id="continuous" checked={medForm.isContinuous} onChange={e => setMedForm({...medForm, isContinuous: e.target.checked})} />
                     <label htmlFor="continuous" className="text-sm text-slate-700">Uso contínuo</label>
                  </div>
                  {!medForm.isContinuous && (
                    <Input label="Fim" type="date" value={medForm.endDate} onChange={e => setMedForm({...medForm, endDate: e.target.value})} className="bg-white text-slate-900" />
                  )}
                  <Button onClick={saveMedication} className="mb-4 w-full md:w-auto"><Plus size={18}/> Adicionar</Button>
               </div>
             </Card>

             <Card title="Prescrições Ativas">
                <div className="space-y-3">
                   {patient.prescriptions.filter(m => !m.endDate).map(m => (
                     <div key={m.id} className="flex justify-between items-center p-4 bg-blue-50 border border-blue-100 rounded-lg">
                        <div className="flex items-start gap-3">
                           <div className="mt-1 bg-blue-200 p-1.5 rounded text-blue-700"><Pill size={16}/></div>
                           <div>
                             <p className="font-bold text-slate-800">{m.name} <span className="font-normal text-sm text-slate-600">- {m.dose}</span></p>
                             <p className="text-sm text-slate-500">{m.route} • {m.frequency} • Início: {formatDate(m.startDate)}</p>
                           </div>
                        </div>
                        <button onClick={() => removeMedication(m.id)} className="text-slate-400 hover:text-red-600 p-2"><Trash2 size={16}/></button>
                     </div>
                   ))}
                   {patient.prescriptions.filter(m => !m.endDate).length === 0 && <p className="text-slate-400 italic">Nenhuma prescrição ativa.</p>}
                </div>
             </Card>

             {patient.prescriptions.some(m => m.endDate) && (
               <Card title="Prescrições Encerradas">
                  <div className="space-y-2 opacity-75">
                     {patient.prescriptions.filter(m => m.endDate).map(m => (
                       <div key={m.id} className="flex justify-between items-center p-3 bg-slate-50 border border-slate-100 rounded-lg text-sm">
                          <div>
                             <span className="font-semibold text-slate-700 line-through">{m.name}</span>
                             <span className="text-slate-500 ml-2">Encerrado: {formatDate(m.endDate!)}</span>
                          </div>
                       </div>
                     ))}
                  </div>
               </Card>
             )}
           </div>
         )}

         {activeTab === 'interacoes' && (
            <div className="space-y-6">
               <Card title="Análise de Interações Medicamentosas">
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                     <div className="flex items-start">
                        <AlertTriangle className="text-yellow-600 mr-3 mt-0.5" size={20} />
                        <div>
                           <p className="text-sm text-yellow-800 font-semibold">Aviso Importante</p>
                           <p className="text-sm text-yellow-700 mt-1">
                              Esta ferramenta utiliza um banco de dados baseado no Guia de Interações Medicamentosas da RioSaúde/UFG, mas pode não cobrir 100% das interações possíveis. 
                              Sempre avalie o quadro clínico do paciente.
                           </p>
                           <a href="https://www.drugs.com/drug_interactions.html" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline mt-2 inline-flex items-center gap-1">
                              Consultar base completa (Drugs.com) <ExternalLink size={10}/>
                           </a>
                        </div>
                     </div>
                  </div>

                  {detectedInteractions.length > 0 ? (
                     <div className="grid gap-4">
                        {detectedInteractions.map((interaction, idx) => (
                           <div key={idx} className={`border rounded-lg p-4 shadow-sm ${
                              interaction.severity === 'Contraindicated' ? 'bg-red-50 border-red-200' :
                              interaction.severity === 'Major' ? 'bg-orange-50 border-orange-200' :
                              'bg-slate-50 border-slate-200'
                           }`}>
                              <div className="flex justify-between items-start mb-2">
                                 <h4 className={`font-bold ${
                                    interaction.severity === 'Contraindicated' ? 'text-red-700' :
                                    interaction.severity === 'Major' ? 'text-orange-700' :
                                    'text-slate-700'
                                 }`}>
                                    {interaction.med1} + {interaction.med2}
                                 </h4>
                                 <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                                    interaction.severity === 'Contraindicated' ? 'bg-red-200 text-red-800' :
                                    interaction.severity === 'Major' ? 'bg-orange-200 text-orange-800' :
                                    'bg-slate-200 text-slate-700'
                                 }`}>
                                    {interaction.severity === 'Contraindicated' ? 'Contraindicado' : 
                                     interaction.severity === 'Major' ? 'Grave' : 'Moderado'}
                                 </span>
                              </div>
                              <p className="text-sm font-semibold text-slate-800 mb-1">{interaction.title}</p>
                              <p className="text-sm text-slate-600 mb-2"><span className="font-medium">Efeito:</span> {interaction.effect}</p>
                              <div className="text-sm bg-white/50 p-2 rounded border border-black/5 text-slate-700">
                                 <span className="font-bold mr-1">Recomendação:</span> {interaction.recommendation}
                              </div>
                           </div>
                        ))}
                     </div>
                  ) : (
                     <div className="text-center py-12 text-slate-400">
                        <CheckCircle size={48} className="mx-auto mb-2 text-green-500 opacity-50" />
                        <p>Nenhuma interação medicamentosa detectada entre os medicamentos ativos.</p>
                     </div>
                  )}
               </Card>
            </div>
         )}

         {activeTab === 'imagem' && (
           <div className="space-y-6">
             <Card title="Adicionar Exame de Imagem/Anexo">
               <div className="space-y-4">
                 <TextArea 
                   label="Descrição / Laudo" 
                   rows={3} 
                   value={imgDesc} 
                   onChange={e => setImgDesc(e.target.value)} 
                   className="bg-white text-slate-900"
                 />
                 <div className="flex flex-col md:flex-row gap-4 items-center">
                   <div className="w-full md:w-auto">
                     <Input label="Data" type="date" value={imgDate} onChange={e => setImgDate(e.target.value)} className="bg-white text-slate-900" />
                   </div>
                   <div className="w-full md:w-auto">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Anexar Arquivo (Imagem/PDF)</label>
                      <div className="relative">
                         <input type="file" onChange={handleImageUpload} className="hidden" id="file-upload" />
                         <label htmlFor="file-upload" className="cursor-pointer inline-flex items-center px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50">
                            <Paperclip size={16} className="mr-2"/> Escolher arquivo
                         </label>
                      </div>
                   </div>
                   <div className="flex-1 text-right">
                      <Button onClick={saveImageNote}><Save size={16} className="mr-2"/> Salvar Nota</Button>
                   </div>
                 </div>
               </div>
             </Card>

             <div className="space-y-4">
                {patient.imaging.map(img => (
                  <Card key={img.id} className="border border-slate-200">
                     <div className="flex justify-between items-start mb-2">
                       <span className="font-bold text-slate-700">{formatDate(img.date)}</span>
                       {img.attachmentData && (
                         <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded flex items-center gap-1">
                            <Paperclip size={12}/> Anexo
                         </span>
                       )}
                     </div>
                     <p className="text-slate-600 whitespace-pre-wrap mb-4">{img.description}</p>
                     
                     {img.attachmentData && (
                        <div className="mt-4 p-4 bg-slate-50 rounded border border-slate-200">
                           {img.attachmentType?.startsWith('image/') ? (
                              <img src={img.attachmentData} alt="Anexo" className="max-w-full h-auto max-h-96 rounded mx-auto" />
                           ) : (
                              <div className="text-center py-4">
                                 <p className="text-sm text-slate-500 mb-2">{img.attachmentName}</p>
                                 <a href={img.attachmentData} download={img.attachmentName || 'anexo'} className="inline-flex items-center text-blue-600 hover:underline">
                                    <Download size={16} className="mr-1"/> Baixar Arquivo
                                 </a>
                              </div>
                           )}
                        </div>
                     )}
                  </Card>
                ))}
             </div>
           </div>
         )}

         {activeTab === 'graficos' && (
           <div className="space-y-6 h-full flex flex-col">
             <Card className="flex-1 flex flex-col min-h-[600px]" title="Análise Gráfica">
                <div className="flex flex-wrap gap-4 mb-6">
                   <div className="w-full md:w-48">
                     <Select label="Tipo de Dado" value={chartType} onChange={e => setChartType(e.target.value as any)} className="bg-white text-slate-900">
                        <option value="lab">Laboratorial</option>
                        <option value="vital">Sinais Vitais</option>
                     </Select>
                   </div>
                   <div className="w-full md:w-64">
                     {chartType === 'lab' ? (
                        <Select label="Exame" value={chartMetric} onChange={e => setChartMetric(e.target.value)} className="bg-white text-slate-900">
                           {LAB_FIELDS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                           {/* Add custom fields dynamically */}
                           {Array.from(new Set(patient.labResults.flatMap(r => Object.keys(r.values))))
                             .filter(k => !LAB_FIELDS.some(f => f.key === k))
                             .map(k => <option key={k} value={k}>{k}</option>)
                           }
                        </Select>
                     ) : (
                        <Select label="Sinal Vital" value={chartMetric} onChange={e => setChartMetric(e.target.value)} className="bg-white text-slate-900">
                           <option value="pas">Pressão Sistólica</option>
                           <option value="pad">Pressão Diastólica</option>
                           <option value="fc">Frequência Cardíaca</option>
                           <option value="fr">Frequência Respiratória</option>
                           <option value="sato2">Saturação O2</option>
                           <option value="dextro">Dextro</option>
                        </Select>
                     )}
                   </div>
                </div>
                
                <div className="flex-1 min-h-[400px] w-full">
                   {(() => {
                      let data: any[] = [];
                      if(chartType === 'lab') {
                        // Reverse so chart goes left to right chronologically
                         data = [...patient.labResults]
                            .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                            .map(r => ({
                               date: formatDate(r.date),
                               value: r.values[chartMetric]
                            })).filter(d => d.value !== undefined);
                      } else {
                         data = [...patient.vitalSigns]
                            .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                            .map(r => ({
                               date: formatDateTime(r.date),
                               value: (r as any)[chartMetric]
                            }));
                      }

                      if (data.length === 0) {
                        return (
                          <div className="h-full flex items-center justify-center text-slate-400">
                            <p>Sem dados suficientes para gerar gráfico deste item.</p>
                          </div>
                        )
                      }

                      return (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="date" stroke="#64748b" style={{fontSize: '12px'}} />
                            <YAxis stroke="#64748b" style={{fontSize: '12px'}} />
                            <Tooltip 
                               contentStyle={{backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                            />
                            <Legend />
                            <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} activeDot={{ r: 8 }} name={chartType === 'lab' ? 'Resultado' : 'Valor'} />
                          </LineChart>
                        </ResponsiveContainer>
                      );
                   })()}
                </div>
             </Card>
           </div>
         )}

         {activeTab === 'alertas' && (
           <div className="space-y-6">
             <Card title="Nova Pendência/Alerta" action={<Button onClick={saveAlert}><Plus size={16} className="mr-2"/> Adicionar</Button>}>
               <Input label="Descrição" value={alertText} onChange={e => setAlertText(e.target.value)} placeholder="Ex: Solicitar parecer cardiologia..." className="bg-white text-slate-900" />
             </Card>

             <div className="space-y-2">
                {patient.alerts.map(a => (
                  <div key={a.id} className={`flex items-center gap-3 p-4 rounded-lg border ${a.isResolved ? 'bg-slate-50 border-slate-200 opacity-75' : 'bg-red-50 border-red-200'}`}>
                     <input 
                       type="checkbox" 
                       checked={a.isResolved} 
                       onChange={() => toggleAlert(a.id)}
                       className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                     />
                     <span className={`flex-1 ${a.isResolved ? 'line-through text-slate-500' : 'text-red-800 font-medium'}`}>
                       {a.text}
                     </span>
                     {a.isResolved && <span className="text-xs text-slate-400">Resolvido</span>}
                  </div>
                ))}
                {patient.alerts.length === 0 && <p className="text-slate-400 italic text-center py-8">Nenhuma pendência registrada.</p>}
             </div>
           </div>
         )}
      </main>
    </div>
  );
};
