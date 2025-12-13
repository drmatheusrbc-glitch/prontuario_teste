import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, FileText, Stethoscope, Activity, 
  FlaskConical, Image as ImageIcon, Pill, BarChart2, 
  AlertTriangle, Plus, Save, Trash2, Download, CheckCircle, Clock, X, Menu,
  Printer, ClipboardList, Paperclip, CloudLightning, GitCompare, ExternalLink, Search,
  Pencil, Calendar, UserCog, CheckSquare, StopCircle, Microscope
} from 'lucide-react';
import { Patient, Sexo, LAB_FIELDS, VitalSign, Evolution, LabResult, Medication, ImagingExam, Diagnosis, Culture } from '../types';
import { Card, Button, Input, TextArea, Select } from './UiComponents';
import { formatDate, formatDateTime, calculateCKDEPI, calculateDaysHospitalized, calculateBMI } from '../services/utils';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

interface DashboardProps {
  patients: Patient[];
  updatePatient: (p: Patient) => void;
}

export const PatientDashboard: React.FC<DashboardProps> = ({ patients, updatePatient }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const patient = patients.find(p => p.id === id);
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile sidebar state

  // --- Local States for Forms ---
  
  // Evolution (Split fields & Date)
  const [evoSubj, setEvoSubj] = useState('');
  const [evoExam, setEvoExam] = useState('');
  const [evoConduct, setEvoConduct] = useState('');
  const [evoDate, setEvoDate] = useState(new Date().toISOString().slice(0, 10));
  const [evoTime, setEvoTime] = useState(new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'}));
  
  const [selectedEvolution, setSelectedEvolution] = useState<Evolution | null>(null); // For viewing full modal
  
  // Vital Signs
  const [vitalForm, setVitalForm] = useState({
    fc: '', fr: '', pas: '', pad: '', sato2: '', dextro: '', tax: '',
    date: new Date().toISOString().slice(0, 10),
    time: new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})
  });

  // Labs
  const [labDate, setLabDate] = useState(new Date().toISOString().slice(0, 10));
  const [labValues, setLabValues] = useState<Record<string, string>>({});
  const [customExamName, setCustomExamName] = useState('');
  const [editingLabId, setEditingLabId] = useState<string | null>(null);

  // Imaging
  const [imgDesc, setImgDesc] = useState('');
  const [imgDate, setImgDate] = useState(new Date().toISOString().slice(0, 10));
  
  // Medications
  const [medForm, setMedForm] = useState({
    name: '', route: '', dose: '', frequency: '', startDate: new Date().toISOString().slice(0, 10), endDate: '', isContinuous: false
  });
  const [editingMedId, setEditingMedId] = useState<string | null>(null);

  // Diagnosis
  const [diagForm, setDiagForm] = useState({
    name: '', date: new Date().toISOString().slice(0, 10), status: 'Ativo' as 'Ativo'|'Resolvido'
  });

  // Alerts
  const [alertText, setAlertText] = useState('');

  // Cultures
  const [cultureForm, setCultureForm] = useState({
    type: '', requestDate: new Date().toISOString().slice(0, 10)
  });

  // Charts
  const [chartMetric, setChartMetric] = useState('leucocitos');
  const [chartType, setChartType] = useState<'lab' | 'vital'>('lab');

  // --- Effects ---
  useEffect(() => {
    if (!patient) navigate('/');
  }, [patient, navigate]);

  if (!patient) return null;

  // --- Handlers ---
  
  // Evolution Handlers
  const saveEvolution = () => {
    if (!evoSubj && !evoExam && !evoConduct) return;
    
    let combinedContent = '';
    if (evoSubj) combinedContent += `**Evolução:**\n${evoSubj}\n\n`;
    if (evoExam) combinedContent += `**Exame Físico:**\n${evoExam}\n\n`;
    if (evoConduct) combinedContent += `**Conduta:**\n${evoConduct}`;

    // Construct Date object from form inputs
    const dateTimeStr = `${evoDate}T${evoTime}:00`;
    const dateObj = new Date(dateTimeStr);
    const finalDate = !isNaN(dateObj.getTime()) ? dateObj.toISOString() : new Date().toISOString();

    const newEv: Evolution = {
      id: Date.now().toString(),
      date: finalDate,
      content: combinedContent.trim()
    };
    updatePatient({
      ...patient,
      evolutions: [newEv, ...patient.evolutions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    });
    setEvoSubj('');
    setEvoExam('');
    setEvoConduct('');
    // Reset to current time
    setEvoDate(new Date().toISOString().slice(0, 10));
    setEvoTime(new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'}));
    alert('Evolução salva!');
  };

  const deleteEvolution = (id: string) => {
    if(window.confirm('Tem certeza que deseja excluir esta evolução?')) {
      updatePatient({
        ...patient,
        evolutions: patient.evolutions.filter(e => e.id !== id)
      });
    }
  };

  // Vital Signs Handlers
  const saveVitalSign = () => {
    // Construct Date object from form inputs
    const dateTimeStr = `${vitalForm.date}T${vitalForm.time}:00`;
    const dateObj = new Date(dateTimeStr);

    const newVS: VitalSign = {
      date: !isNaN(dateObj.getTime()) ? dateObj.toISOString() : new Date().toISOString(),
      fc: vitalForm.fc,
      fr: vitalForm.fr,
      pas: vitalForm.pas,
      pad: vitalForm.pad,
      sato2: vitalForm.sato2,
      dextro: vitalForm.dextro,
      tax: vitalForm.tax,
    };
    
    // Sort chronologically descending
    const updatedVitals = [newVS, ...patient.vitalSigns].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    updatePatient({
      ...patient,
      vitalSigns: updatedVitals
    });
    
    // Reset values but keep current date/time
    setVitalForm({ ...vitalForm, fc: '', fr: '', pas: '', pad: '', sato2: '', dextro: '', tax: '' });
    alert('Sinais Vitais salvos!');
  };

  const deleteVitalSign = (index: number) => {
    if(window.confirm('Tem certeza que deseja excluir este registro de sinais vitais?')) {
      const newVitals = [...patient.vitalSigns];
      newVitals.splice(index, 1);
      updatePatient({ ...patient, vitalSigns: newVitals });
    }
  };

  // Lab Results Handlers
  const saveLabResults = () => {
    const cleanValues: Record<string, number> = {};
    Object.entries(labValues).forEach(([k, v]) => {
      if (v !== '') cleanValues[k] = Number(v);
    });

    if (cleanValues['creatinina']) {
      cleanValues['tfg'] = calculateCKDEPI(cleanValues['creatinina'], patient.age, patient.sex);
    }

    const newLab: LabResult = {
      id: editingLabId || Date.now().toString(),
      date: new Date(labDate).toISOString(),
      values: cleanValues
    };

    let updatedLabs;
    if (editingLabId) {
      // Update existing
      updatedLabs = patient.labResults.map(l => l.id === editingLabId ? newLab : l);
    } else {
      // Create new
      updatedLabs = [newLab, ...patient.labResults];
    }

    updatePatient({
      ...patient,
      labResults: updatedLabs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    });
    
    setLabValues({});
    setEditingLabId(null);
    setLabDate(new Date().toISOString().slice(0, 10));
    alert('Exames salvos!');
  };

  const editLabResult = (lab: LabResult) => {
    setEditingLabId(lab.id || null);
    setLabDate(new Date(lab.date).toISOString().slice(0, 10));
    
    // Convert numbers to strings for inputs
    const stringValues: Record<string, string> = {};
    Object.entries(lab.values).forEach(([k, v]) => {
      stringValues[k] = String(v);
    });
    setLabValues(stringValues);
    
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteLabResult = (labId: string | undefined) => {
    if (!labId) return;
    if(window.confirm('Tem certeza que deseja excluir este resultado de exames?')) {
      updatePatient({
        ...patient,
        labResults: patient.labResults.filter(l => l.id !== labId)
      });
    }
  };

  const handleAddCustomExam = () => {
    if(!customExamName) return;
    setLabValues(prev => ({...prev, [customExamName.toLowerCase()]: ''}));
    setCustomExamName('');
  };

  // Medication Handlers
  const saveMedication = () => {
    if (!medForm.name) return;
    const newMed: Medication = {
      id: editingMedId || Date.now().toString(),
      ...medForm,
      status: 'active' // Always active when saving, user ends it manually
    };

    let updatedMeds;
    if (editingMedId) {
       updatedMeds = patient.prescriptions.map(m => m.id === editingMedId ? { ...m, ...newMed } : m);
    } else {
       updatedMeds = [...patient.prescriptions, newMed];
    }

    updatePatient({
      ...patient,
      prescriptions: updatedMeds
    });
    setMedForm({ name: '', route: '', dose: '', frequency: '', startDate: new Date().toISOString().slice(0, 10), endDate: '', isContinuous: false });
    setEditingMedId(null);
  };

  const editMedication = (med: Medication) => {
     setEditingMedId(med.id);
     setMedForm({
        name: med.name,
        route: med.route,
        dose: med.dose,
        frequency: med.frequency,
        startDate: med.startDate,
        endDate: med.endDate || '',
        isContinuous: med.isContinuous
     });
     window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleMedStatus = (id: string, newStatus: 'active' | 'ended') => {
     updatePatient({
       ...patient,
       prescriptions: patient.prescriptions.map(m => m.id === id ? { ...m, status: newStatus } : m)
     });
  };

  const removeMedication = (id: string) => {
     if(window.confirm("Excluir permanentemente este registro de medicação?")) {
        updatePatient({
          ...patient,
          prescriptions: patient.prescriptions.filter(m => m.id !== id)
        });
     }
  };

  // Diagnosis Handlers
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

  const deleteDiagnosis = (id: string) => {
    if(window.confirm('Excluir diagnóstico?')) {
      updatePatient({
        ...patient,
        diagnostics: patient.diagnostics.filter(d => d.id !== id)
      });
    }
  };

  // Alert Handlers
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

  const deleteAlert = (id: string) => {
    if (window.confirm('Excluir esta pendência/alerta?')) {
      updatePatient({
        ...patient,
        alerts: patient.alerts.filter(a => a.id !== id)
      });
    }
  };

  // Culture Handlers
  const saveCulture = () => {
    if (!cultureForm.type) return;
    const newCulture: Culture = {
      id: Date.now().toString(),
      type: cultureForm.type,
      requestDate: cultureForm.requestDate,
      status: 'pending',
      result: ''
    };
    // Ensure cultures array exists
    const currentCultures = patient.cultures || [];
    updatePatient({
      ...patient,
      cultures: [newCulture, ...currentCultures]
    });
    setCultureForm({ type: '', requestDate: new Date().toISOString().slice(0, 10) });
  };

  const updateCultureResult = (id: string, result: string) => {
    const updatedCultures = (patient.cultures || []).map(c => 
      c.id === id ? { ...c, result: result, status: result ? 'completed' : 'pending' } as Culture : c
    );
    updatePatient({ ...patient, cultures: updatedCultures });
  };

  const deleteCulture = (id: string) => {
    if (window.confirm('Excluir esta cultura?')) {
      updatePatient({
        ...patient,
        cultures: (patient.cultures || []).filter(c => c.id !== id)
      });
    }
  };

  // Imaging Handlers
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

  const deleteImaging = (id: string) => {
    if(window.confirm('Excluir este exame/nota?')) {
      updatePatient({
        ...patient,
        imaging: patient.imaging.filter(i => i.id !== id)
      });
    }
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
             {patient.allergies && (
               <div className="mt-4 flex items-center gap-2 bg-red-500/20 border border-red-400/40 px-3 py-1.5 rounded-md w-fit backdrop-blur-sm">
                 <span className="text-red-100 font-bold text-xs uppercase tracking-wider flex items-center gap-1"><AlertTriangle size={12}/> Alergia:</span>
                 <span className="text-white font-semibold text-sm">{patient.allergies}</span>
               </div>
             )}
          </div>
          <div className="text-right md:text-right">
            <p className="text-xs opacity-75 uppercase tracking-wider">Admissão</p>
            <p className="font-semibold">{formatDate(patient.admissionDate)}</p>
            <p className="text-xs opacity-75 uppercase tracking-wider mt-2">Tempo Internação</p>
            <p className="font-semibold">{calculateDaysHospitalized(patient.admissionDate)} dias</p>
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
             <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500">PA</p>
                  <p className="text-base font-bold text-slate-800">{patient.vitalSigns[0].pas}/{patient.vitalSigns[0].pad}</p>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500">FC</p>
                  <p className="text-base font-bold text-slate-800">{patient.vitalSigns[0].fc}</p>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500">SatO2</p>
                  <p className="text-base font-bold text-slate-800">{patient.vitalSigns[0].sato2}%</p>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500">Temp</p>
                  <p className="text-base font-bold text-slate-800">{patient.vitalSigns[0].tax || '-'}ºC</p>
                </div>
             </div>
           ) : <p className="text-slate-400 italic">Sem registros.</p>}
        </Card>

        {/* Current Meds Summary */}
        <Card title="Medicações em Uso">
           <ul className="space-y-1 text-sm text-slate-700">
             {patient.prescriptions.filter(m => m.status !== 'ended').slice(0, 5).map(m => (
               <li key={m.id} className="flex items-center gap-2">
                 <Pill size={14} className="text-blue-500" /> {m.name}
               </li>
             ))}
             {patient.prescriptions.filter(m => m.status !== 'ended').length === 0 && <p className="text-slate-400 italic">Nenhuma.</p>}
             {patient.prescriptions.filter(m => m.status !== 'ended').length > 5 && <li className="text-blue-600 text-xs pt-1">Ver todas...</li>}
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

  const RegistrationTab = () => {
    const [formData, setFormData] = useState(patient);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setFormData(prev => {
        const updated = { ...prev, [name]: value };
        if (name === 'weight' || name === 'height') {
          updated.bmi = calculateBMI(Number(updated.weight || 0), Number(updated.height || 0));
        }
        return updated;
      });
    };

    const handleSave = () => {
      updatePatient(formData);
      alert('Cadastro atualizado!');
    };

    return (
      <div className="space-y-6">
        <Card title="Editar Cadastro" action={<Button onClick={handleSave} size="sm"><Save size={16} className="mr-2"/> Salvar Alterações</Button>}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2 font-semibold text-blue-600 border-b pb-2 mb-2">Identificação</div>
            
            <Input label="Nome" name="firstName" value={formData.firstName || ''} onChange={handleChange} />
            <Input label="Sobrenome" name="lastName" value={formData.lastName || ''} onChange={handleChange} />
            
            <Input label="Data de Nascimento" name="birthDate" type="date" value={formData.birthDate || ''} onChange={handleChange} />
            <Input label="Idade" name="age" value={formData.age || ''} readOnly className="bg-slate-100" />
            
            <Select label="Sexo" name="sex" value={formData.sex} onChange={handleChange}>
              <option value={Sexo.MASCULINO}>Masculino</option>
              <option value={Sexo.FEMININO}>Feminino</option>
            </Select>
            <Input label="Etnia" name="ethnicity" value={formData.ethnicity || ''} onChange={handleChange} />

            <div className="md:col-span-2 font-semibold text-blue-600 border-b pb-2 mb-2 mt-4">Internação</div>
            
            <Input label="Hospital" name="hospital" value={formData.hospital || ''} onChange={handleChange} />
            <Input label="Leito" name="bed" value={formData.bed || ''} onChange={handleChange} />
            <Input label="Data Internação" name="admissionDate" type="date" value={formData.admissionDate || ''} onChange={handleChange} />

            <div className="md:col-span-2 font-semibold text-blue-600 border-b pb-2 mb-2 mt-4">Dados Antropométricos</div>
            
            <Input label="Peso (kg)" name="weight" type="number" step="0.1" value={formData.weight || ''} onChange={handleChange} />
            <Input label="Altura (cm ou m)" name="height" type="number" step="0.01" value={formData.height || ''} onChange={handleChange} />
            <Input label="IMC (Auto)" name="bmi" value={formData.bmi || ''} readOnly className="bg-slate-100" />

            <div className="md:col-span-2 font-semibold text-blue-600 border-b pb-2 mb-2 mt-4">Contato e Social</div>

            <Input label="Cidade" name="city" value={formData.city || ''} onChange={handleChange} />
            <Input label="Estado" name="state" value={formData.state || ''} onChange={handleChange} />
            <Input label="Endereço" name="address" value={formData.address || ''} onChange={handleChange} className="md:col-span-2" />
            <Input label="Telefone" name="phone" value={formData.phone || ''} onChange={handleChange} />
            <Input label="Emprego/Profissão" name="occupation" value={formData.occupation || ''} onChange={handleChange} />
          </div>
        </Card>
      </div>
    );
  };

  const ProntuarioDia = () => {
    const activeDiags = patient.diagnostics.filter(d => d.status === 'Ativo');
    const activeMeds = patient.prescriptions.filter(m => m.status !== 'ended');
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
            <p><span className="font-bold">Admissão:</span> {formatDate(patient.admissionDate)} ({calculateDaysHospitalized(patient.admissionDate)} dias)</p>
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
              <h3 className="text-sm font-bold text-slate-900 uppercase bg-slate-100 p-1 mb-2 border-l-4 border-slate-800">Evolução e Conduta do Dia</h3>
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
                 <div className="grid grid-cols-7 gap-2 text-center text-sm border p-2 rounded">
                    <div><span className="block text-xs font-bold text-slate-500">PA</span>{lastVital.pas}/{lastVital.pad}</div>
                    <div><span className="block text-xs font-bold text-slate-500">FC</span>{lastVital.fc}</div>
                    <div><span className="block text-xs font-bold text-slate-500">FR</span>{lastVital.fr}</div>
                    <div><span className="block text-xs font-bold text-slate-500">SatO2</span>{lastVital.sato2}%</div>
                    <div><span className="block text-xs font-bold text-slate-500">Temp</span>{lastVital.tax || '-'}</div>
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
                         {allExamKeys.filter(k => !LAB_FIELDS.some(f => f.key === k)).map((key: string) => (
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
             { id: 'cadastro', label: 'Cadastro', icon: UserCog },
             { id: 'anamnese', label: 'Anamnese', icon: FileText },
             { id: 'diagnosticos', label: 'Diagnósticos', icon: Stethoscope },
             { id: 'evolucao', label: 'Evolução e Conduta', icon: ClipboardList },
             { id: 'sinais', label: 'Sinais Vitais', icon: Activity },
             { id: 'exames', label: 'Exames Laboratoriais', icon: FlaskConical },
             { id: 'culturas', label: 'Culturas', icon: Microscope },
             { id: 'imagem', label: 'Exames de Imagem', icon: ImageIcon },
             { id: 'medicacoes', label: 'Medicações', icon: Pill },
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
         {activeTab === 'cadastro' && <RegistrationTab />}
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
                      <div className="flex items-center gap-2">
                        <button onClick={() => toggleDiagStatus(d.id)} className={`px-3 py-1 rounded-full text-xs font-bold border ${d.status === 'Ativo' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-slate-200 text-slate-600 border-slate-300'}`}>
                          {d.status}
                        </button>
                        <button onClick={() => deleteDiagnosis(d.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors" title="Excluir Diagnóstico">
                          <Trash2 size={16} />
                        </button>
                      </div>
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

             <Card title="Nova Evolução e Conduta" action={<Button onClick={saveEvolution}><Save size={16} className="mr-2"/> Salvar</Button>}>
               <div className="space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
                    <Input label="Data" type="date" value={evoDate} onChange={e => setEvoDate(e.target.value)} className="bg-white text-slate-900" />
                    <Input label="Hora" type="time" value={evoTime} onChange={e => setEvoTime(e.target.value)} className="bg-white text-slate-900" />
                 </div>
                 <TextArea 
                   label="Evolução Diária" 
                   rows={5} 
                   value={evoSubj} 
                   onChange={e => setEvoSubj(e.target.value)} 
                   placeholder="Paciente refere..."
                   className="bg-white text-slate-900"
                 />
                 <TextArea 
                   label="Exame Físico" 
                   rows={5} 
                   value={evoExam} 
                   onChange={e => setEvoExam(e.target.value)} 
                   placeholder="BEG, LOTE..."
                   className="bg-white text-slate-900"
                 />
                 <TextArea 
                   label="Conduta" 
                   rows={5} 
                   value={evoConduct} 
                   onChange={e => setEvoConduct(e.target.value)} 
                   placeholder="HD: ... CD: ..."
                   className="bg-white text-slate-900"
                 />
               </div>
             </Card>
             
             <div className="space-y-4">
               <h3 className="font-semibold text-slate-700 px-1">Histórico de Evoluções</h3>
               {patient.evolutions.map(ev => (
                 <div key={ev.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:border-blue-300 transition-colors relative group">
                   <div onClick={() => setSelectedEvolution(ev)} className="cursor-pointer">
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
                           <Clock size={14}/> {formatDateTime(ev.date)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 line-clamp-3 whitespace-pre-wrap">{ev.content}</p>
                   </div>
                   <button 
                     onClick={(e) => { e.stopPropagation(); deleteEvolution(ev.id); }} 
                     className="absolute top-4 right-4 p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                     title="Excluir evolução"
                   >
                     <Trash2 size={16} />
                   </button>
                 </div>
               ))}
             </div>
           </div>
         )}

         {activeTab === 'sinais' && (
           <div className="space-y-6">
             <Card title="Registrar Sinais Vitais" action={<Button onClick={saveVitalSign}><Save size={16} className="mr-2"/> Salvar</Button>}>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
                  <Input label="Data" type="date" value={vitalForm.date} onChange={e => setVitalForm({...vitalForm, date: e.target.value})} className="bg-white text-slate-900" />
                  <Input label="Hora" type="time" value={vitalForm.time} onChange={e => setVitalForm({...vitalForm, time: e.target.value})} className="bg-white text-slate-900" />
               </div>
               <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
                 <Input label="PAS (mmHg)" type="text" placeholder="Ex: 120-140" value={vitalForm.pas} onChange={e => setVitalForm({...vitalForm, pas: e.target.value})} className="bg-white text-slate-900" />
                 <Input label="PAD (mmHg)" type="text" placeholder="Ex: 80-90" value={vitalForm.pad} onChange={e => setVitalForm({...vitalForm, pad: e.target.value})} className="bg-white text-slate-900" />
                 <Input label="FC (bpm)" type="text" placeholder="Ex: 80" value={vitalForm.fc} onChange={e => setVitalForm({...vitalForm, fc: e.target.value})} className="bg-white text-slate-900" />
                 <Input label="FR (irpm)" type="text" placeholder="Ex: 16" value={vitalForm.fr} onChange={e => setVitalForm({...vitalForm, fr: e.target.value})} className="bg-white text-slate-900" />
                 <Input label="SatO2 (%)" type="text" placeholder="Ex: 98" value={vitalForm.sato2} onChange={e => setVitalForm({...vitalForm, sato2: e.target.value})} className="bg-white text-slate-900" />
                 <Input label="Temp (ºC)" type="text" placeholder="Ex: 36.5" value={vitalForm.tax} onChange={e => setVitalForm({...vitalForm, tax: e.target.value})} className="bg-white text-slate-900" />
                 <Input label="Dextro (mg/dL)" type="text" placeholder="Ex: 100" value={vitalForm.dextro} onChange={e => setVitalForm({...vitalForm, dextro: e.target.value})} className="bg-white text-slate-900" />
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
                        <th className="p-3">Temp</th>
                        <th className="p-3">Dextro</th>
                        <th className="p-3 rounded-tr-lg text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {patient.vitalSigns.map((vs, i) => (
                        <tr key={i} className="hover:bg-slate-50 group">
                          <td className="p-3">{formatDateTime(vs.date)}</td>
                          <td className="p-3 font-semibold">{vs.pas}/{vs.pad}</td>
                          <td className="p-3">{vs.fc}</td>
                          <td className="p-3">{vs.fr}</td>
                          <td className="p-3">{vs.sato2}%</td>
                          <td className="p-3">{vs.tax || '-'}ºC</td>
                          <td className="p-3">{vs.dextro || '-'}</td>
                          <td className="p-3 text-right">
                             <button onClick={() => deleteVitalSign(i)} className="text-slate-300 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100">
                                <Trash2 size={16} />
                             </button>
                          </td>
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
             <Card title={editingLabId ? "Editar Exame" : "Registrar Exames Laboratoriais"} action={
                <div className="flex gap-2">
                   {editingLabId && <Button onClick={() => { setEditingLabId(null); setLabValues({}); setLabDate(new Date().toISOString().slice(0, 10)); }} variant="secondary" size="sm">Cancelar</Button>}
                   <Button onClick={saveLabResults}><Save size={16} className="mr-2"/> {editingLabId ? "Atualizar" : "Salvar"}</Button>
                </div>
             }>
               <div className="mb-6">
                 <Input label="Data do Exame" type="date" value={labDate} onChange={e => setLabDate(e.target.value)} className="bg-white text-slate-900" />
               </div>
               <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                 {LAB_FIELDS.map(field => (
                   <div key={field.key}>
                     <label className="block text-xs font-medium text-slate-500 mb-1">{field.label} ({field.unit})</label>
                     <input 
                        type="number" 
                        className="w-full rounded border-slate-300 py-1 px-2 text-sm bg-white text-slate-900 focus:border-blue-500"
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
                          <th key={i} className="p-2 border border-slate-200 min-w-[100px] text-center align-top">
                            <div className="font-semibold">{formatDate(res.date)}</div>
                            <div className="flex justify-center gap-1 mt-1">
                               <button onClick={() => editLabResult(res)} className="p-1 text-blue-600 hover:bg-blue-100 rounded" title="Editar"><Pencil size={12}/></button>
                               <button onClick={() => deleteLabResult(res.id)} className="p-1 text-red-600 hover:bg-red-100 rounded" title="Excluir"><Trash2 size={12}/></button>
                            </div>
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
                        .map((key: string) => (
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

         {activeTab === 'culturas' && (
           <div className="space-y-6">
             <Card title="Solicitar Cultura" action={<Button onClick={saveCulture}><Plus size={16} className="mr-2"/> Adicionar</Button>}>
               <div className="flex flex-col md:flex-row gap-4 items-end">
                 <div className="flex-1 w-full">
                   <Input 
                     label="Tipo de Cultura / Local" 
                     value={cultureForm.type} 
                     onChange={e => setCultureForm({...cultureForm, type: e.target.value})} 
                     placeholder="Ex: Hemocultura, Urocultura, Ponta de Cateter..."
                     className="bg-white text-slate-900"
                   />
                 </div>
                 <div className="w-full md:w-48">
                   <Input 
                     label="Data Solicitação" 
                     type="date" 
                     value={cultureForm.requestDate} 
                     onChange={e => setCultureForm({...cultureForm, requestDate: e.target.value})} 
                     className="bg-white text-slate-900" 
                   />
                 </div>
               </div>
             </Card>

             <Card title="Histórico de Culturas">
               <div className="space-y-3">
                 {(patient.cultures || []).map(culture => (
                   <div key={culture.id} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                     <div className="flex flex-col md:flex-row justify-between gap-4">
                       <div className="flex-1">
                         <h4 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                           <FlaskConical size={18} className="text-blue-500"/> {culture.type}
                         </h4>
                         <p className="text-sm text-slate-500">Solicitado em: {formatDate(culture.requestDate)}</p>
                         
                         <div className="mt-3">
                           <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Resultado:</label>
                           <textarea 
                             className="w-full text-sm p-2 bg-slate-50 border border-slate-200 rounded text-slate-900 focus:bg-white focus:border-blue-400 transition-colors"
                             rows={2}
                             placeholder="Digite o resultado (bactéria, antibiograma, ou 'Negativo')..."
                             value={culture.result || ''}
                             onChange={(e) => updateCultureResult(culture.id, e.target.value)}
                           />
                         </div>
                       </div>
                       <div className="flex flex-col justify-between items-end">
                         <span className={`px-2 py-1 rounded text-xs font-bold ${culture.result ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                           {culture.result ? 'Resultado Disponível' : 'Pendente'}
                         </span>
                         <button 
                           onClick={() => deleteCulture(culture.id)}
                           className="text-slate-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-full transition-colors mt-2"
                           title="Excluir Cultura"
                         >
                           <Trash2 size={18} />
                         </button>
                       </div>
                     </div>
                   </div>
                 ))}
                 {(!patient.cultures || patient.cultures.length === 0) && (
                   <p className="text-slate-400 italic text-center py-8">Nenhuma cultura solicitada.</p>
                 )}
               </div>
             </Card>
           </div>
         )}

         {activeTab === 'medicacoes' && (
           <div className="space-y-6">
             <Card title={editingMedId ? "Editar Medicação" : "Prescrever Medicação"}>
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
                  <div className="flex gap-2 w-full md:w-auto mb-4">
                     {editingMedId && <Button onClick={() => { setEditingMedId(null); setMedForm({ name: '', route: '', dose: '', frequency: '', startDate: new Date().toISOString().slice(0, 10), endDate: '', isContinuous: false }); }} variant="secondary">Cancelar</Button>}
                     <Button onClick={saveMedication} className="w-full"><Plus size={18}/> {editingMedId ? 'Atualizar' : 'Adicionar'}</Button>
                  </div>
               </div>
             </Card>

             <Card title="Prescrições Ativas">
                <div className="space-y-3">
                   {patient.prescriptions.filter(m => m.status === 'active' || (m.status === undefined && (!m.endDate || m.endDate >= new Date().toISOString().slice(0,10)))).map(m => {
                     const today = new Date().toISOString().slice(0,10);
                     const isExpired = m.endDate && m.endDate < today;
                     const expiresToday = m.endDate && m.endDate === today;
                     
                     return (
                       <div key={m.id} className={`flex justify-between items-center p-4 rounded-lg border ${isExpired ? 'bg-red-50 border-red-200' : expiresToday ? 'bg-yellow-50 border-yellow-200' : 'bg-blue-50 border-blue-100'}`}>
                          <div className="flex items-start gap-3 flex-1">
                             <div className={`mt-1 p-1.5 rounded ${isExpired ? 'bg-red-200 text-red-700' : 'bg-blue-200 text-blue-700'}`}><Pill size={16}/></div>
                             <div className="flex-1">
                               <div className="flex items-center flex-wrap gap-2">
                                 <p className="font-bold text-slate-800">{m.name} <span className="font-normal text-sm text-slate-600">- {m.dose}</span></p>
                                 {isExpired && <span className="text-[10px] px-2 py-0.5 bg-red-200 text-red-800 rounded-full font-bold">Vencido</span>}
                                 {expiresToday && <span className="text-[10px] px-2 py-0.5 bg-yellow-200 text-yellow-800 rounded-full font-bold">Vence Hoje</span>}
                               </div>
                               <p className="text-sm text-slate-500">{m.route} • {m.frequency} • Início: {formatDate(m.startDate)} {m.endDate && `• Fim: ${formatDate(m.endDate)}`}</p>
                             </div>
                          </div>
                          <div className="flex items-center gap-2">
                             <button onClick={() => editMedication(m)} className="text-slate-400 hover:text-blue-600 p-2 bg-white rounded-full shadow-sm" title="Editar"><Pencil size={16}/></button>
                             <button onClick={() => toggleMedStatus(m.id, 'ended')} className="text-slate-400 hover:text-green-600 p-2 bg-white rounded-full shadow-sm" title="Finalizar Tratamento"><CheckSquare size={16}/></button>
                             <button onClick={() => removeMedication(m.id)} className="text-slate-400 hover:text-red-600 p-2 bg-white rounded-full shadow-sm" title="Excluir Registro"><Trash2 size={16}/></button>
                          </div>
                       </div>
                     );
                   })}
                   {patient.prescriptions.filter(m => m.status === 'active' || (m.status === undefined && (!m.endDate || m.endDate >= new Date().toISOString().slice(0,10)))).length === 0 && <p className="text-slate-400 italic">Nenhuma prescrição ativa.</p>}
                </div>
             </Card>

             {patient.prescriptions.some(m => m.status === 'ended' || (m.status === undefined && m.endDate && m.endDate < new Date().toISOString().slice(0,10))) && (
               <Card title="Prescrições Encerradas">
                  <div className="space-y-2 opacity-75">
                     {patient.prescriptions.filter(m => m.status === 'ended' || (m.status === undefined && m.endDate && m.endDate < new Date().toISOString().slice(0,10))).map(m => (
                       <div key={m.id} className="flex justify-between items-center p-3 bg-slate-50 border border-slate-100 rounded-lg text-sm">
                          <div>
                             <span className="font-semibold text-slate-700 line-through">{m.name}</span>
                             <span className="text-slate-500 ml-2">{m.dose} ({m.frequency})</span>
                          </div>
                          <div className="flex items-center gap-2">
                             <span className="text-xs text-slate-400 italic mr-2">
                                {m.status === 'ended' ? 'Finalizado Manualmente' : `Fim: ${formatDate(m.endDate!)}`}
                             </span>
                             <button onClick={() => toggleMedStatus(m.id, 'active')} className="text-slate-400 hover:text-blue-600 p-1" title="Reativar"><StopCircle size={16}/></button>
                          </div>
                       </div>
                     ))}
                  </div>
               </Card>
             )}
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
                  <Card key={img.id} className="border border-slate-200 relative group">
                     <button 
                       onClick={() => deleteImaging(img.id)}
                       className="absolute top-4 right-4 text-slate-300 hover:text-red-600 hover:bg-red-50 p-2 rounded transition-colors opacity-0 group-hover:opacity-100"
                       title="Excluir"
                     >
                        <Trash2 size={16}/>
                     </button>
                     <div className="flex justify-between items-start mb-2 pr-8">
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
                     <Select 
                        label="Tipo de Dado" 
                        value={chartType} 
                        onChange={e => {
                           const newType = e.target.value as 'lab' | 'vital';
                           setChartType(newType);
                           // Reset metric to a default valid value for the new type to prevent empty charts
                           setChartMetric(newType === 'lab' ? 'leucocitos' : 'pas');
                        }} 
                        className="bg-white text-slate-900"
                     >
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
                           <option value="tax">Temperatura</option>
                        </Select>
                     )}
                   </div>
                </div>
                
                <div className="w-full h-[500px] mt-4">
                   {(() => {
                      let data: any[] = [];
                      if(chartType === 'lab') {
                        // Reverse so chart goes left to right chronologically
                         data = [...patient.labResults]
                            .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                            .map(r => ({
                               date: formatDate(r.date),
                               value: r.values[chartMetric]
                            })).filter(d => d.value !== undefined && d.value !== null);
                      } else {
                         data = [...patient.vitalSigns]
                            .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                            .map(r => ({
                               date: formatDateTime(r.date),
                               // Parse float to handle ranges like "120-160" (takes 120) for charting
                               value: parseFloat((r as any)[chartMetric] as string)
                            })).filter(d => !isNaN(d.value));
                      }

                      if (data.length === 0) {
                        return (
                          <div className="h-full flex items-center justify-center text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                            <p>Sem dados suficientes para gerar gráfico deste item.</p>
                          </div>
                        )
                      }

                      return (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={data} margin={{ top: 20, right: 30, bottom: 20, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                            <XAxis 
                              dataKey="date" 
                              stroke="#64748b" 
                              style={{fontSize: '11px'}} 
                              tick={{fill: '#64748b'}}
                              tickMargin={10}
                            />
                            <YAxis 
                              stroke="#64748b" 
                              style={{fontSize: '11px'}} 
                              tick={{fill: '#64748b'}} 
                            />
                            <Tooltip 
                               contentStyle={{backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                               itemStyle={{color: '#1e293b', fontWeight: 600}}
                               labelStyle={{color: '#64748b', marginBottom: '0.25rem'}}
                            />
                            <Legend verticalAlign="top" height={36}/>
                            <Line 
                              type="monotone" 
                              dataKey="value" 
                              stroke="#2563eb" 
                              strokeWidth={3} 
                              activeDot={{ r: 6, strokeWidth: 0 }} 
                              dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                              name={chartType === 'lab' ? 'Resultado' : 'Valor'} 
                              animationDuration={500}
                            />
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
                     {a.isResolved && <span className="text-xs text-slate-400 mr-2">Resolvido</span>}
                     <button onClick={() => deleteAlert(a.id)} className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-slate-100" title="Excluir">
                        <Trash2 size={16}/>
                     </button>
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