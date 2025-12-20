
import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, FileText, Stethoscope, Activity, 
  FlaskConical, Image as ImageIcon, Pill, BarChart2, 
  AlertTriangle, Plus, Save, Trash2, Download, CheckCircle, Clock, X, Menu,
  Printer, ClipboardList, Paperclip, Search,
  Pencil, UserCog, CheckSquare, StopCircle, Microscope
} from 'lucide-react';
import { Patient, Sexo, LAB_FIELDS, VitalSign, Evolution, LabResult, Medication, ImagingExam, Diagnosis, Culture } from '../types';
import { Card, Button, Input, TextArea, Select } from './UiComponents';
import { formatDate, formatDateTime, calculateCKDEPI, calculateDaysHospitalized, calculateBMI } from '../services/utils';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

// --- SUB-COMPONENTES EXTERNOS PARA EVITAR RE-MOUNTS E PERDA DE ESTADO ---

const SummaryTab = ({ patient }: { patient: Patient }) => (
  <div className="space-y-6">
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
        <div className="text-right">
          <p className="text-xs opacity-75 uppercase tracking-wider">Admissão</p>
          <p className="font-semibold">{formatDate(patient.admissionDate)}</p>
          <p className="text-xs opacity-75 uppercase tracking-wider mt-2">Internação</p>
          <p className="font-semibold">{calculateDaysHospitalized(patient.admissionDate)} dias</p>
        </div>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
  </div>
);

const AnamnesisTab = ({ patient, onSave }: { patient: Patient; onSave: (p: Patient) => void }) => {
  const [localData, setLocalData] = useState({
    hpp: patient.hpp || '',
    continuousMeds: patient.continuousMeds || '',
    habits: patient.habits || '',
    hda: patient.hda || '',
    allergies: patient.allergies || ''
  });

  const handleSave = () => {
    onSave({ ...patient, ...localData });
    alert('Anamnese salva!');
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

const RegistrationTab = ({ patient, onSave }: { patient: Patient; onSave: (p: Patient) => void }) => {
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
    onSave(formData);
    alert('Cadastro atualizado!');
  };

  return (
    <div className="space-y-6">
      <Card title="Editar Cadastro" action={<Button onClick={handleSave} size="sm"><Save size={16} className="mr-2"/> Salvar</Button>}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input label="Nome" name="firstName" value={formData.firstName || ''} onChange={handleChange} />
          <Input label="Sobrenome" name="lastName" value={formData.lastName || ''} onChange={handleChange} />
          <Input label="Data de Nascimento" name="birthDate" type="date" value={formData.birthDate || ''} onChange={handleChange} />
          <Input label="Leito" name="bed" value={formData.bed || ''} onChange={handleChange} />
          <Input label="Peso (kg)" name="weight" type="number" step="0.1" value={formData.weight || ''} onChange={handleChange} />
          <Input label="Altura (cm/m)" name="height" type="number" step="0.01" value={formData.height || ''} onChange={handleChange} />
        </div>
      </Card>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL DO DASHBOARD ---

export const PatientDashboard: React.FC<{ patients: Patient[]; updatePatient: (p: Patient) => void }> = ({ patients, updatePatient }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const patient = patients.find(p => p.id === id);
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Estados locais para formulários rápidos
  const [diagForm, setDiagForm] = useState({ name: '', date: new Date().toISOString().slice(0, 10), status: 'Ativo' as 'Ativo'|'Resolvido' });
  const [evoSubj, setEvoSubj] = useState('');
  const [evoExam, setEvoExam] = useState('');
  const [evoConduct, setEvoConduct] = useState('');

  useEffect(() => {
    if (!patient) navigate('/');
  }, [patient, navigate]);

  if (!patient) return null;

  const handleSaveEvolution = () => {
    if (!evoSubj && !evoExam && !evoConduct) return;
    let combined = `**Evolução:**\n${evoSubj}\n\n**Exame Físico:**\n${evoExam}\n\n**Conduta:**\n${evoConduct}`;
    const newEv: Evolution = { id: Date.now().toString(), date: new Date().toISOString(), content: combined.trim() };
    updatePatient({ ...patient, evolutions: [newEv, ...patient.evolutions] });
    setEvoSubj(''); setEvoExam(''); setEvoConduct('');
    alert('Evolução salva!');
  };

  const handleSaveDiagnosis = () => {
    if (!diagForm.name) return;
    const newDiag: Diagnosis = { id: Date.now().toString(), name: diagForm.name, date: diagForm.date, status: diagForm.status };
    updatePatient({ ...patient, diagnostics: [newDiag, ...patient.diagnostics] });
    setDiagForm({ name: '', date: new Date().toISOString().slice(0, 10), status: 'Ativo' });
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row overflow-hidden">
      {/* Mobile Top Bar */}
      <div className="md:hidden bg-white p-4 flex justify-between items-center border-b border-slate-200 sticky top-0 z-20">
        <span className="font-bold text-slate-800">RecMed - {patient.firstName}</span>
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-600"><Menu /></button>
      </div>

      {/* Sidebar */}
      <aside className={`fixed md:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
           <h1 className="text-xl font-bold text-blue-600 flex items-center gap-2"><Activity /> RecMed</h1>
           <button onClick={() => setIsSidebarOpen(false)} className="md:hidden"><X size={20}/></button>
        </div>
        <nav className="p-4 space-y-1">
           <Button variant="secondary" className="w-full justify-start mb-6" onClick={() => navigate('/')}>← Voltar</Button>
           {[
             { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard },
             { id: 'cadastro', label: 'Cadastro', icon: UserCog },
             { id: 'anamnese', label: 'Anamnese', icon: FileText },
             { id: 'evolucao', label: 'Evolução', icon: ClipboardList },
             { id: 'diagnosticos', label: 'Diagnósticos', icon: Stethoscope },
           ].map(item => (
             <button key={item.id} onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === item.id ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>
               <item.icon size={18} /> {item.label}
             </button>
           ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-screen">
         {activeTab === 'dashboard' && <SummaryTab patient={patient} />}
         {activeTab === 'cadastro' && <RegistrationTab patient={patient} onSave={updatePatient} />}
         {activeTab === 'anamnese' && <AnamnesisTab patient={patient} onSave={updatePatient} />}
         
         {activeTab === 'diagnosticos' && (
           <div className="space-y-6">
             <Card title="Novo Diagnóstico">
               <div className="flex flex-col md:flex-row gap-4 items-end">
                 <Input label="Diagnóstico" className="flex-1" value={diagForm.name} onChange={e => setDiagForm({...diagForm, name: e.target.value})} />
                 <Button onClick={handleSaveDiagnosis} className="mb-4"><Plus size={18}/></Button>
               </div>
             </Card>
             <Card title="Lista de Diagnósticos">
               {patient.diagnostics.map(d => (
                 <div key={d.id} className="flex justify-between items-center p-3 border-b">{d.name} <span className="text-xs">{formatDate(d.date)}</span></div>
               ))}
             </Card>
           </div>
         )}

         {activeTab === 'evolucao' && (
           <div className="space-y-6">
             <Card title="Nova Evolução" action={<Button onClick={handleSaveEvolution}><Save size={16} className="mr-2"/> Salvar</Button>}>
               <div className="space-y-4">
                 <TextArea label="Evolução" rows={3} value={evoSubj} onChange={e => setEvoSubj(e.target.value)} />
                 <TextArea label="Exame Físico" rows={3} value={evoExam} onChange={e => setEvoExam(e.target.value)} />
                 <TextArea label="Conduta" rows={3} value={evoConduct} onChange={e => setEvoConduct(e.target.value)} />
               </div>
             </Card>
             <div className="space-y-4">
               {patient.evolutions.map(ev => (
                 <div key={ev.id} className="bg-white p-4 rounded-lg border">
                   <p className="text-xs font-bold mb-2">{formatDateTime(ev.date)}</p>
                   <p className="whitespace-pre-wrap text-sm">{ev.content}</p>
                 </div>
               ))}
             </div>
           </div>
         )}
      </main>
    </div>
  );
};
