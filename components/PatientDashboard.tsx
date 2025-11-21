
import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, FileText, Stethoscope, Activity, 
  FlaskConical, Image as ImageIcon, Pill, BarChart2, 
  AlertTriangle, Plus, Save, Trash2, Download, CheckCircle, Clock, X, Menu,
  Printer, ClipboardList, Paperclip, CloudLightning
} from 'lucide-react';
import { Patient, Sexo, LAB_FIELDS, VitalSign, Evolution, LabResult, Medication, ImagingExam, Diagnosis } from '../types';
import { Card, Button, Input, TextArea } from './UiComponents';
import { formatDate, formatDateTime, calculateCKDEPI } from '../services/utils';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

interface DashboardProps {
  patients: Patient[];
  updatePatient: (p: Patient) => void;
}

const SidebarItem = ({ icon: Icon, label, active, onClick }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors mb-1 ${
      active 
        ? 'bg-blue-50 text-blue-700' 
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`}
  >
    <Icon size={18} />
    {label}
  </button>
);

export const PatientDashboard: React.FC<DashboardProps> = ({ patients, updatePatient }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const patient = patients.find(p => p.id === id);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu when changing tabs
  useEffect(() => {
    if (window.innerWidth < 768) {
      setIsMobileMenuOpen(false);
    }
  }, [activeTab]);

  if (!patient) {
    return <div className="p-8 text-center">Paciente não encontrado ou carregando...</div>;
  }

  const handleSaveAnamnesis = (field: keyof Patient, value: string) => {
    updatePatient({ ...patient, [field]: value });
  };

  const handleAddDiagnosis = (dx: Diagnosis) => {
    updatePatient({ ...patient, diagnostics: [...patient.diagnostics, dx] });
  };

  const handleToggleDiagnosisStatus = (id: string) => {
    const newDx = patient.diagnostics.map(d => 
      d.id === id ? { ...d, status: d.status === 'Ativo' ? 'Resolvido' : 'Ativo' } as Diagnosis : d
    );
    updatePatient({ ...patient, diagnostics: newDx });
  };

  const handleRemoveDiagnosis = (id: string) => {
    const newDx = patient.diagnostics.filter(d => d.id !== id);
    updatePatient({ ...patient, diagnostics: newDx });
  };

  const handleAddEvolution = (text: string, date: string) => {
    if(!text || !date) return;
    const newEvo: Evolution = { id: Date.now().toString(), date, content: text };
    updatePatient({ ...patient, evolutions: [newEvo, ...patient.evolutions] });
  };

  const handleAddVitalSign = (vs: VitalSign) => {
    updatePatient({ ...patient, vitalSigns: [vs, ...patient.vitalSigns] });
  };

  // Helper to get all exam fields (standard + custom)
  const getAllExamFields = () => {
    const customKeys = new Set<string>();
    patient.labResults.forEach(lab => Object.keys(lab.values).forEach(k => customKeys.add(k)));
    
    // Start with standard fields
    const fields = [...LAB_FIELDS];
    
    // Add custom fields that aren't in standard
    customKeys.forEach(k => {
        if(!fields.find(f => f.key === k)) {
            fields.push({ key: k, label: k.charAt(0).toUpperCase() + k.slice(1).replace(/_/g, ' '), unit: '' });
        }
    });
    return fields;
  };

  // --- Sub-Components for Pages ---

  const Summary = () => {
    return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="md:col-span-4 bg-gradient-to-r from-blue-600 to-blue-800 text-white border-none">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <h1 className="text-2xl font-bold">{patient.firstName} {patient.lastName}</h1>
              <div className="text-blue-100 text-sm mt-1 flex flex-wrap gap-4">
                <span>{patient.age} anos</span>
                <span>{patient.sex}</span>
                <span>Leito: {patient.bed}</span>
                <span>Hosp: {patient.hospital}</span>
                <span>Internação: {formatDate(patient.admissionDate)}</span>
              </div>
            </div>
            <div className="mt-4 md:mt-0 text-right w-full md:w-auto flex justify-between md:block border-t border-white/20 pt-4 md:border-0 md:pt-0">
                <div>
                    <div className="text-3xl font-bold">{patient.weight} kg</div>
                    <div className="text-xs opacity-75">IMC: {patient.bmi}</div>
                </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card title="Alergias & Alertas" className="border-l-4 border-l-red-500">
          {patient.allergies ? <p className="text-red-600 font-semibold">{patient.allergies}</p> : <p className="text-slate-500">Nenhuma alergia registrada.</p>}
          <div className="mt-4 space-y-2">
            {patient.alerts.filter(a => !a.isResolved).map(alert => (
               <div key={alert.id} className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 p-2 rounded">
                 <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                 {alert.text}
               </div>
            ))}
            {patient.alerts.filter(a => !a.isResolved).length === 0 && <span className="text-xs text-slate-400">Sem pendências ativas.</span>}
          </div>
        </Card>

        <Card title="Diagnósticos">
          <ul className="space-y-2 text-sm text-slate-700">
            {patient.diagnostics.length > 0 ? 
              patient.diagnostics.map((d) => (
              <li key={d.id} className="flex justify-between items-center border-b border-slate-50 pb-1 last:border-0">
                <span className={`truncate pr-2 ${d.status === 'Resolvido' ? 'text-slate-400 line-through' : 'text-slate-800 font-medium'}`}>
                  {d.name}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded border whitespace-nowrap ${
                    d.status === 'Ativo' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}>
                    {d.status}
                </span>
              </li>
            )) : <span className="text-slate-400 italic">Nenhum diagnóstico registrado.</span>}
          </ul>
        </Card>

        <Card title="Sinais Vitais (Último)">
          {patient.vitalSigns.length > 0 ? (
             <div className="grid grid-cols-2 gap-4">
               <div className="text-center p-2 bg-slate-50 rounded">
                 <div className="text-xs text-slate-500">PA</div>
                 <div className="font-bold text-lg">{patient.vitalSigns[0].pas}/{patient.vitalSigns[0].pad}</div>
               </div>
               <div className="text-center p-2 bg-slate-50 rounded">
                 <div className="text-xs text-slate-500">FC</div>
                 <div className="font-bold text-lg">{patient.vitalSigns[0].fc}</div>
               </div>
               <div className="text-center p-2 bg-slate-50 rounded">
                 <div className="text-xs text-slate-500">FR</div>
                 <div className="font-bold text-lg">{patient.vitalSigns[0].fr}</div>
               </div>
               <div className="text-center p-2 bg-slate-50 rounded">
                 <div className="text-xs text-slate-500">Dextro</div>
                 <div className="font-bold text-lg">{patient.vitalSigns[0].dextro || '-'}</div>
               </div>
               <div className="col-span-2 text-center text-xs text-slate-400 mt-1">
                 {formatDateTime(patient.vitalSigns[0].date)}
               </div>
             </div>
          ) : <p className="text-slate-400 text-sm">Sem dados vitais.</p>}
        </Card>
        
        <Card title="Última Evolução" className="md:col-span-2">
           {patient.evolutions.length > 0 ? (
             <div>
               <div className="text-xs text-slate-500 mb-2 font-semibold">{formatDateTime(patient.evolutions[0].date)}</div>
               <p className="text-sm text-slate-700 whitespace-pre-wrap line-clamp-4">{patient.evolutions[0].content}</p>
             </div>
           ) : <p className="text-slate-400 text-sm">Nenhuma evolução registrada.</p>}
        </Card>

         <Card title="Medicações Ativas">
            <div className="flex flex-wrap gap-2">
              {patient.prescriptions.map(med => (
                <span key={med.id} className="px-3 py-1 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-100 font-medium">
                  {med.name} {med.dose}
                </span>
              ))}
              {patient.prescriptions.length === 0 && <span className="text-slate-400 text-sm">Nenhuma prescrição.</span>}
            </div>
         </Card>
      </div>
    </div>
    );
  };

  const Anamnesis = () => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="História Patológica Pregressa">
          <TextArea 
            label="Detalhes" 
            rows={5} 
            defaultValue={patient.hpp}
            className="bg-white text-slate-900"
            onBlur={(e) => handleSaveAnamnesis('hpp', e.target.value)}
          />
        </Card>
        <Card title="Medicações de Uso Contínuo (Prévio)">
          <TextArea 
            label="Lista de medicamentos" 
            rows={5} 
            defaultValue={patient.continuousMeds}
            className="bg-white text-slate-900"
            onBlur={(e) => handleSaveAnamnesis('continuousMeds', e.target.value)}
          />
        </Card>
        <Card title="Hábitos de Vida">
          <TextArea 
            label="Social, Tabagismo, Etilismo, etc." 
            rows={5} 
            defaultValue={patient.habits}
            className="bg-white text-slate-900"
            onBlur={(e) => handleSaveAnamnesis('habits', e.target.value)}
          />
        </Card>
         <Card title="História da Doença Atual (HDA)">
          <TextArea 
            label="Narrativa" 
            rows={5} 
            defaultValue={patient.hda}
            className="bg-white text-slate-900"
            onBlur={(e) => handleSaveAnamnesis('hda', e.target.value)}
          />
        </Card>
         <Card title="Alergias">
          <TextArea 
            label="Descreva alergias conhecidas" 
            rows={2} 
            className="bg-white text-slate-900 border-red-200 focus:ring-red-500"
            defaultValue={patient.allergies}
            onBlur={(e) => handleSaveAnamnesis('allergies', e.target.value)}
          />
        </Card>
      </div>
    );
  };

  const Diagnostics = () => {
    const [newDxName, setNewDxName] = useState('');
    const [newDxDate, setNewDxDate] = useState(new Date().toISOString().slice(0, 10));
    const [newDxStatus, setNewDxStatus] = useState<'Ativo' | 'Resolvido'>('Ativo');

    const submitDx = () => {
      if (!newDxName) return;
      const dx: Diagnosis = {
        id: Date.now().toString(),
        name: newDxName,
        date: newDxDate,
        status: newDxStatus
      };
      handleAddDiagnosis(dx);
      setNewDxName('');
    };

    return (
      <Card title="Gerenciar Hipóteses Diagnósticas">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 items-end bg-slate-50 p-4 rounded-lg border border-slate-100">
          <div className="md:col-span-2">
            <Input 
              label="Diagnóstico" 
              placeholder="Ex: Pneumonia..." 
              value={newDxName}
              onChange={e => setNewDxName(e.target.value)}
              className="mb-0 bg-white text-slate-900"
            />
          </div>
          <div>
             <Input 
              label="Data" 
              type="date"
              value={newDxDate}
              onChange={e => setNewDxDate(e.target.value)}
              className="mb-0 bg-white text-slate-900"
            />
          </div>
          <div>
            <div className="block text-sm font-medium text-slate-700 mb-1">Status</div>
            <select 
              className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border bg-white text-slate-900"
              value={newDxStatus}
              onChange={(e) => setNewDxStatus(e.target.value as any)}
            >
              <option value="Ativo">Ativo</option>
              <option value="Resolvido">Resolvido</option>
            </select>
          </div>
          <div className="md:col-span-4 flex justify-end">
             <Button onClick={submitDx}>Adicionar Diagnóstico</Button>
          </div>
        </div>

        <div className="space-y-2">
          {patient.diagnostics.map((dx) => (
            <div key={dx.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-white rounded-lg border border-slate-200 shadow-sm gap-3 sm:gap-0">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`font-semibold text-lg ${dx.status === 'Resolvido' ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                    {dx.name}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${
                    dx.status === 'Ativo' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    {dx.status}
                  </span>
                </div>
                <div className="text-sm text-slate-500 mt-1">Data: {formatDate(dx.date)}</div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Button variant="outline" className="text-xs h-8" onClick={() => handleToggleDiagnosisStatus(dx.id)}>
                  {dx.status === 'Ativo' ? 'Resolver' : 'Reativar'}
                </Button>
                <button onClick={() => handleRemoveDiagnosis(dx.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
          {patient.diagnostics.length === 0 && <p className="text-slate-500 text-center py-4">Nenhum diagnóstico registrado.</p>}
        </div>
      </Card>
    );
  };

  const EvolutionPage = () => {
    const [text, setText] = useState('');
    const [date, setDate] = useState(new Date().toISOString().slice(0, 16));
    const [selectedEvolution, setSelectedEvolution] = useState<Evolution | null>(null);

    return (
      <>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
             <Card title="Nova Evolução">
               <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Data e Hora</label>
                  <input 
                    type="datetime-local" 
                    className="border rounded px-3 py-2 w-full md:w-1/2 bg-white text-slate-900" 
                    value={date}
                    onChange={e => setDate(e.target.value)}
                  />
               </div>
               <TextArea 
                  label="Descrição da evolução e conduta" 
                  rows={12} 
                  value={text}
                  className="bg-white text-slate-900 font-mono text-sm"
                  onChange={e => setText(e.target.value)}
               />
               <div className="flex justify-end">
                 <Button onClick={() => { handleAddEvolution(text, date); setText(''); }}>
                   <Save size={16} className="mr-2 inline" /> Salvar Evolução
                 </Button>
               </div>
             </Card>
          </div>
          <div className="lg:col-span-1">
            <h3 className="font-semibold text-slate-700 mb-4">Histórico</h3>
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
              {patient.evolutions.map(evo => (
                <div 
                  key={evo.id} 
                  onClick={() => setSelectedEvolution(evo)}
                  className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm cursor-pointer hover:border-blue-400 hover:shadow-md transition-all group"
                >
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-xs font-bold text-blue-600">{formatDateTime(evo.date)}</div>
                    <FileText size={14} className="text-slate-400 group-hover:text-blue-500" />
                  </div>
                  <p className="text-sm text-slate-600 line-clamp-3 font-mono">{evo.content}</p>
                  <div className="mt-2 text-xs text-blue-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">Clique para ver completo</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal for Full Evolution View */}
        {selectedEvolution && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 print:hidden">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
                <div>
                  <h3 className="font-bold text-lg text-slate-800">Visualização de Evolução</h3>
                  <p className="text-sm text-slate-500">{formatDateTime(selectedEvolution.date)}</p>
                </div>
                <button onClick={() => setSelectedEvolution(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                <pre className="whitespace-pre-wrap font-sans text-slate-800 text-base leading-relaxed">
                  {selectedEvolution.content}
                </pre>
              </div>
              <div className="p-4 border-t border-slate-100 flex justify-end">
                <Button variant="secondary" onClick={() => setSelectedEvolution(null)}>Fechar</Button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  const VitalSignsPage = () => {
    // Use strings for form state to allow proper editing (including empty state and decimals)
    const [form, setForm] = useState({ fc: '', fr: '', pas: '', pad: '', sato2: '', dextro: '' });
    const [date, setDate] = useState(new Date().toISOString().slice(0, 16));

    const handleSubmit = () => {
      // Convert strings to numbers on submit
      const vs: VitalSign = {
        date: date,
        fc: Number(form.fc) || 0,
        fr: Number(form.fr) || 0,
        pas: Number(form.pas) || 0,
        pad: Number(form.pad) || 0,
        sato2: Number(form.sato2) || 0,
        dextro: Number(form.dextro) || 0
      };
      handleAddVitalSign(vs);
      setForm({ fc: '', fr: '', pas: '', pad: '', sato2: '', dextro: '' });
    };

    return (
      <div className="space-y-6">
        <Card title="Registrar Sinais Vitais">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 items-end">
             <div className="col-span-2 md:col-span-1">
               <Input label="FC (bpm)" type="number" value={form.fc} className="bg-white text-slate-900" onChange={e => setForm({...form, fc: e.target.value})} />
             </div>
             <div className="col-span-2 md:col-span-1">
               <Input label="FR (irpm)" type="number" value={form.fr} className="bg-white text-slate-900" onChange={e => setForm({...form, fr: e.target.value})} />
             </div>
             <div className="col-span-2 md:col-span-1">
               <Input label="PAS (mmHg)" type="number" value={form.pas} className="bg-white text-slate-900" onChange={e => setForm({...form, pas: e.target.value})} />
             </div>
             <div className="col-span-2 md:col-span-1">
               <Input label="PAD (mmHg)" type="number" value={form.pad} className="bg-white text-slate-900" onChange={e => setForm({...form, pad: e.target.value})} />
             </div>
             <div className="col-span-2 md:col-span-1">
               <Input label="SatO2 (%)" type="number" value={form.sato2} className="bg-white text-slate-900" onChange={e => setForm({...form, sato2: e.target.value})} />
             </div>
             <div className="col-span-2 md:col-span-1">
               <Input label="Dextro (mg/dL)" type="number" value={form.dextro} className="bg-white text-slate-900" onChange={e => setForm({...form, dextro: e.target.value})} />
             </div>
             <div className="col-span-2 md:col-span-1 mb-4">
               <Button className="w-full" onClick={handleSubmit}>Salvar</Button>
             </div>
             <div className="col-span-full">
               <label className="text-xs text-slate-500">Data/Hora referência</label>
               <input type="datetime-local" className="border rounded px-2 py-1 w-full md:w-auto block mt-1 bg-white text-slate-900" value={date} onChange={e => setDate(e.target.value)} />
             </div>
          </div>
        </Card>

        <Card title="Histórico">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 font-medium">
                <tr>
                  <th className="p-3">Data</th>
                  <th className="p-3">FC</th>
                  <th className="p-3">FR</th>
                  <th className="p-3">PA</th>
                  <th className="p-3">SatO2</th>
                  <th className="p-3">Dextro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {patient.vitalSigns.map((vs, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-3 whitespace-nowrap">{formatDateTime(vs.date)}</td>
                    <td className="p-3">{vs.fc}</td>
                    <td className="p-3">{vs.fr}</td>
                    <td className="p-3 whitespace-nowrap">{vs.pas}x{vs.pad}</td>
                    <td className="p-3">{vs.sato2}%</td>
                    <td className="p-3">{vs.dextro || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  };

  const LabResultsPage = () => {
    const [labDate, setLabDate] = useState(new Date().toISOString().slice(0, 10));
    // Use strings for values to allow decimals and '0' inputs
    const [values, setValues] = useState<Record<string, string>>({});
    const [customField, setCustomField] = useState({ key: '', label: '', value: '' });

    React.useEffect(() => {
      if (values['creatinina']) {
        const creatVal = parseFloat(values['creatinina']);
        if (!isNaN(creatVal)) {
           const tfg = calculateCKDEPI(creatVal, patient.age, patient.sex, patient.ethnicity);
           // We set TFG as string to keep state consistent, but it's calculated
           setValues(prev => ({ ...prev, tfg: tfg.toString() }));
        }
      }
    }, [values['creatinina'], patient.age, patient.sex, patient.ethnicity]);

    const handleSaveLabs = () => {
      const numericValues: Record<string, number> = {};
      Object.keys(values).forEach(key => {
        if (values[key] !== '') {
            numericValues[key] = parseFloat(values[key]);
        }
      });

      const newLab: LabResult = {
        date: labDate,
        values: numericValues
      };
      updatePatient({ ...patient, labResults: [newLab, ...patient.labResults] });
      setValues({});
      alert('Exames salvos!');
    };

    const displayFields = getAllExamFields();

    return (
      <div className="space-y-6">
        <Card title="Adicionar Exames Laboratoriais" action={<Button onClick={handleSaveLabs}><Save size={16} className="mr-2 inline"/> <span className="hidden sm:inline">Salvar Dia</span><span className="sm:hidden">Salvar</span></Button>}>
          <div className="mb-6">
             <label className="block text-sm font-medium text-slate-700 mb-1">Data do Exame</label>
             <input type="date" className="border rounded px-3 py-2 bg-white text-slate-900" value={labDate} onChange={e => setLabDate(e.target.value)} />
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {LAB_FIELDS.map(field => (
              <div key={field.key}>
                <label className="block text-xs font-medium text-slate-600 mb-1 truncate" title={field.label}>{field.label}</label>
                <div className="relative">
                  <input 
                    type="number" 
                    step="0.01"
                    className="w-full border rounded px-2 py-1 text-sm bg-white text-slate-900" 
                    value={values[field.key] !== undefined ? values[field.key] : ''}
                    onChange={(e) => setValues({ ...values, [field.key]: e.target.value })}
                  />
                  <span className="absolute right-1 top-1.5 text-[10px] text-slate-400 pointer-events-none">{field.unit}</span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 pt-6 border-t border-slate-100">
            <h4 className="font-medium text-slate-800 mb-3">Adicionar Novo Exame (Avulso)</h4>
            <div className="flex flex-col sm:flex-row gap-2 items-end">
              <div className="flex-1 w-full">
                 <Input label="Nome do Exame" value={customField.label} onChange={e => setCustomField({...customField, label: e.target.value, key: e.target.value.toLowerCase().replace(/\s/g,'_')})} className="mb-0 bg-white text-slate-900" />
              </div>
              <div className="w-full sm:w-32">
                 <Input label="Valor" type="number" value={customField.value} onChange={e => setCustomField({...customField, value: e.target.value})} className="mb-0 bg-white text-slate-900" />
              </div>
              <Button variant="secondary" className="w-full sm:w-auto" onClick={() => {
                if(customField.key && customField.value) {
                   setValues({...values, [customField.key]: customField.value});
                   setCustomField({ key: '', label: '', value: '' });
                }
              }}>Add</Button>
            </div>
          </div>
        </Card>

        <Card title="Histórico Recente">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-2 border-b sticky left-0 bg-slate-50 z-10">Exame</th>
                  {patient.labResults.slice(0, 8).map((lab, i) => (
                    <th key={i} className="p-2 border-b text-center">{formatDate(lab.date)}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {displayFields.map(field => (
                  <tr key={field.key}>
                    <td className="p-2 font-medium text-slate-700 sticky left-0 bg-white border-r border-slate-100 shadow-sm z-10">{field.label}</td>
                    {patient.labResults.slice(0, 8).map((lab, i) => (
                      <td key={i} className="p-2 text-center">{lab.values[field.key] !== undefined ? lab.values[field.key] : '-'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  };

  const MedicationsPage = () => {
    const [newMed, setNewMed] = useState<Medication>({
      id: '', name: '', route: '', dose: '', frequency: '', startDate: '', isContinuous: false
    });

    const addMed = () => {
      if(!newMed.name) return;
      updatePatient({ 
        ...patient, 
        prescriptions: [...patient.prescriptions, { ...newMed, id: Date.now().toString() }] 
      });
      setNewMed({ id: '', name: '', route: '', dose: '', frequency: '', startDate: '', isContinuous: false });
    };

    return (
      <div className="space-y-6">
        <Card title="Nova Prescrição">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label="Nome" value={newMed.name} className="bg-white text-slate-900" onChange={e => setNewMed({...newMed, name: e.target.value})} />
            <Input label="Via" value={newMed.route} className="bg-white text-slate-900" onChange={e => setNewMed({...newMed, route: e.target.value})} />
            <Input label="Dose" value={newMed.dose} className="bg-white text-slate-900" onChange={e => setNewMed({...newMed, dose: e.target.value})} />
            <Input label="Frequência" value={newMed.frequency} className="bg-white text-slate-900" onChange={e => setNewMed({...newMed, frequency: e.target.value})} />
            <Input label="Data Início" type="date" value={newMed.startDate} className="bg-white text-slate-900" onChange={e => setNewMed({...newMed, startDate: e.target.value})} />
            <div className="flex items-center gap-2 md:mt-6">
               <label className="flex items-center gap-2 cursor-pointer">
                 <input type="checkbox" checked={newMed.isContinuous} onChange={e => setNewMed({...newMed, isContinuous: e.target.checked})} />
                 <span className="text-sm font-medium">Uso contínuo</span>
               </label>
               {!newMed.isContinuous && (
                 <input type="date" className="border rounded px-2 py-1 text-sm bg-white text-slate-900" placeholder="Fim" onChange={e => setNewMed({...newMed, endDate: e.target.value})} />
               )}
            </div>
            <div className="md:col-span-3 text-right">
              <Button onClick={addMed}>Adicionar Prescrição</Button>
            </div>
          </div>
        </Card>

        <Card title="Prescrições Vigentes">
          <div className="space-y-2">
            {patient.prescriptions.map(med => (
              <div key={med.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border border-slate-200 rounded-lg hover:shadow-sm transition-shadow gap-3 sm:gap-0">
                <div>
                  <div className="font-bold text-blue-700">{med.name} <span className="font-normal text-slate-600 text-sm">- {med.dose} via {med.route}</span></div>
                  <div className="text-sm text-slate-500 mt-1">
                    {med.frequency} | Início: {formatDate(med.startDate)} | Fim: {med.isContinuous ? 'Uso Contínuo' : formatDate(med.endDate || '')}
                  </div>
                </div>
                <Button variant="outline" className="text-red-500 border-red-100 hover:bg-red-50 w-full sm:w-auto" onClick={() => {
                   const filtered = patient.prescriptions.filter(p => p.id !== med.id);
                   updatePatient({...patient, prescriptions: filtered});
                }}>Suspender</Button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  };

  const ChartsPage = () => {
    const [selectedType, setSelectedType] = useState<'vital' | 'lab'>('vital');
    const [selectedMetric, setSelectedMetric] = useState<string>('fc');

    const displayFields = getAllExamFields();

    const data = useMemo(() => {
      if (selectedType === 'vital') {
        return patient.vitalSigns.map(v => ({
          date: new Date(v.date).toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'}),
          fullDate: v.date,
          value: v[selectedMetric as keyof VitalSign] as number
        })).reverse();
      } else {
        return patient.labResults.map(l => ({
          date: new Date(l.date).toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'}),
          fullDate: l.date,
          value: l.values[selectedMetric] || 0
        })).reverse();
      }
    }, [patient, selectedType, selectedMetric]);

    return (
      <Card title="Análise Gráfica">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <select 
            className="border rounded p-2 bg-white text-slate-900 w-full sm:w-auto" 
            value={selectedType} 
            onChange={e => { 
              const newVal = e.target.value as 'vital' | 'lab';
              setSelectedType(newVal); 
              setSelectedMetric(newVal === 'vital' ? 'fc' : 'hemoglobina'); 
            }}
          >
            <option value="vital">Sinais Vitais</option>
            <option value="lab">Laboratoriais</option>
          </select>

          <select 
            className="border rounded p-2 bg-white text-slate-900 w-full sm:w-auto"
            value={selectedMetric}
            onChange={e => setSelectedMetric(e.target.value)}
          >
            {selectedType === 'vital' ? (
              <>
                <option value="fc">Frequência Cardíaca</option>
                <option value="fr">Frequência Respiratória</option>
                <option value="pas">PA Sistólica</option>
                <option value="pad">PA Diastólica</option>
                <option value="sato2">Saturação O2</option>
                <option value="dextro">Dextro (Glicemia)</option>
              </>
            ) : (
              displayFields.map(f => <option key={f.key} value={f.key}>{f.label}</option>)
            )}
          </select>
        </div>

        <div className="w-full h-[300px] md:h-[500px]">
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: -10 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="5 5" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={12} tick={{fontSize: 10}} />
                <YAxis stroke="#64748b" fontSize={12} tick={{fontSize: 10}} width={30} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend />
                <Line type="monotone" dataKey="value" name={selectedMetric.toUpperCase()} stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
             <div className="h-full flex items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
                <p>Sem dados registrados para este item.</p>
             </div>
          )}
        </div>
      </Card>
    );
  };

  const AlertsPage = () => {
     const [newAlert, setNewAlert] = useState('');
     
     const addAlert = () => {
        if(!newAlert) return;
        const alertObj: any = { id: Date.now().toString(), text: newAlert, isResolved: false };
        updatePatient({ ...patient, alerts: [...patient.alerts, alertObj] });
        setNewAlert('');
     };

     const toggleAlert = (id: string) => {
        const updated = patient.alerts.map(a => a.id === id ? { ...a, isResolved: !a.isResolved } : a);
        updatePatient({ ...patient, alerts: updated });
     };

     return (
       <div className="space-y-6">
         <Card title="Pendências e Alertas">
           <div className="flex gap-2 mb-4">
             <Input label="" placeholder="Nova pendência..." value={newAlert} onChange={e => setNewAlert(e.target.value)} className="mb-0 w-full bg-white text-slate-900" />
             <Button onClick={addAlert}>Adicionar</Button>
           </div>
           <div className="space-y-2">
             {patient.alerts.map(alert => (
               <div key={alert.id} className={`flex items-center gap-3 p-3 rounded border ${alert.isResolved ? 'bg-slate-50 border-slate-100 text-slate-400' : 'bg-amber-50 border-amber-100 text-slate-800'}`}>
                 <input type="checkbox" checked={alert.isResolved} onChange={() => toggleAlert(alert.id)} className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0" />
                 <span className={`${alert.isResolved ? 'line-through' : ''} break-words`}>{alert.text}</span>
               </div>
             ))}
           </div>
         </Card>
       </div>
     )
  };

  const ImagingPage = () => {
    const [note, setNote] = useState('');
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [file, setFile] = useState<File | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        setFile(e.target.files[0]);
      }
    };

    const handleAddNote = () => {
      if (!note && !file) return;
      
      const saveWithAttachment = (base64Data?: string, mimeType?: string) => {
        const newImg: ImagingExam = {
          id: Date.now().toString(),
          date: date,
          description: note,
          attachmentName: file ? file.name : undefined,
          attachmentData: base64Data,
          attachmentType: mimeType
        };
        updatePatient({ ...patient, imaging: [newImg, ...patient.imaging] });
        setNote('');
        setFile(null);
      };

      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          saveWithAttachment(reader.result as string, file.type);
        };
        reader.readAsDataURL(file);
      } else {
        saveWithAttachment();
      }
    };

    return (
      <div className="space-y-6">
        <Card title="Nova Nota de Imagem / Anexo">
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center mb-4 bg-slate-50 relative">
              <input 
                type="file" 
                id="fileUpload" 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleFileChange}
              />
              <div className="mx-auto w-12 h-12 text-slate-400 mb-2"><Download /></div>
              <p className="text-slate-600 text-sm">
                {file ? `Arquivo selecionado: ${file.name}` : 'Arraste arquivos ou clique para fazer upload'}
              </p>
              <div className="mt-2">
                <Button variant="outline" className="text-sm pointer-events-none">
                  {file ? 'Alterar Arquivo' : 'Selecionar Arquivo'}
                </Button>
              </div>
          </div>
          
          <div className="mb-4">
             <label className="block text-sm font-medium text-slate-700 mb-1">Data do Exame</label>
             <input 
               type="date" 
               className="border rounded px-3 py-2 w-full md:w-auto bg-white text-slate-900" 
               value={date}
               onChange={e => setDate(e.target.value)}
             />
          </div>

          <TextArea 
            label="Laudo / Resultados" 
            rows={6} 
            placeholder="Descreva os resultados dos exames..." 
            value={note}
            onChange={e => setNote(e.target.value)}
            className="bg-white text-slate-900" 
          />
          <div className="flex justify-end">
            <Button onClick={handleAddNote}><Save size={16} className="mr-2 inline"/> Salvar Nota/Anexo</Button>
          </div>
        </Card>

        <Card title="Histórico de Exames de Imagem">
          <div className="space-y-4">
            {patient.imaging.map((img) => (
              <div key={img.id} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                   <div className="flex items-center gap-2 text-blue-600 font-semibold">
                     <ImageIcon size={18} />
                     <span>{formatDate(img.date)}</span>
                   </div>
                </div>
                {img.description && <p className="text-slate-700 whitespace-pre-wrap text-sm mb-3">{img.description}</p>}
                
                {img.attachmentData && (
                  <div className="mt-2 border-t border-slate-100 pt-2">
                    {img.attachmentType?.startsWith('image/') ? (
                      <div>
                        <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Paperclip size={12} /> {img.attachmentName}</p>
                        <img src={img.attachmentData} alt="Anexo" className="max-w-full max-h-64 rounded border border-slate-200" />
                      </div>
                    ) : (
                      <a 
                        href={img.attachmentData} 
                        download={img.attachmentName || 'anexo'} 
                        className="inline-flex items-center gap-2 px-3 py-2 bg-slate-100 text-blue-600 rounded hover:bg-slate-200 text-sm font-medium transition-colors"
                      >
                        <Download size={16} /> Baixar Anexo ({img.attachmentName})
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
            {patient.imaging.length === 0 && <p className="text-slate-500 text-center">Nenhum exame registrado.</p>}
          </div>
        </Card>
      </div>
    );
  };

  const DailyRecordPage = () => {
    const today = new Date().toLocaleDateString('pt-BR');
    const latestEvo = patient.evolutions[0];
    const latestVitals = patient.vitalSigns[0];
    
    // Get all exams fields
    const displayFields = getAllExamFields();
    // Get recent 5 dates for labs to display in table
    const recentLabs = patient.labResults.slice(0, 5);

    return (
        <div className="space-y-6">
            <div className="flex justify-end print:hidden">
                <Button onClick={() => window.print()} className="bg-slate-800 hover:bg-slate-900">
                    <Printer size={16} className="mr-2" /> Imprimir / Salvar PDF
                </Button>
            </div>
            
            {/* Printable Document Container */}
            <div className="bg-white p-8 shadow-lg border border-slate-200 max-w-4xl mx-auto print:shadow-none print:border-none print:w-full print:max-w-none print:p-0">
                {/* Document Header */}
                <div className="border-b-2 border-slate-800 pb-4 mb-6 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Prontuário Médico Diário</h1>
                        <p className="text-slate-600 text-lg font-medium">{patient.hospital}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-slate-500">Data de Emissão</p>
                        <p className="font-mono font-bold text-lg">{today}</p>
                    </div>
                </div>

                {/* Patient Info */}
                <section className="mb-6 p-4 bg-slate-50 border border-slate-100 rounded print:bg-transparent print:border-slate-300 print:p-2">
                    <h2 className="font-bold text-xs text-slate-500 uppercase mb-3 border-b pb-1 tracking-wider">Identificação do Paciente</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-y-2 gap-x-8 text-sm text-slate-800">
                        <div><span className="font-semibold block text-slate-500 text-xs">Nome</span> {patient.firstName} {patient.lastName}</div>
                        <div><span className="font-semibold block text-slate-500 text-xs">Idade/Sexo</span> {patient.age}a / {patient.sex[0]}</div>
                        <div><span className="font-semibold block text-slate-500 text-xs">Leito</span> {patient.bed}</div>
                        <div><span className="font-semibold block text-slate-500 text-xs">Registro</span> {patient.id.slice(-6)}</div>
                    </div>
                </section>

                {/* Anamnesis Summary Section */}
                <section className="mb-6">
                   <h2 className="font-bold text-lg text-slate-800 mb-3 border-b border-slate-300 pb-1">Resumo da Anamnese</h2>
                   <div className="grid grid-cols-1 gap-4 text-sm">
                      {patient.hda && (
                        <div>
                          <span className="font-bold text-slate-700 block">HDA:</span>
                          <p className="text-slate-800">{patient.hda}</p>
                        </div>
                      )}
                      {patient.hpp && (
                        <div>
                          <span className="font-bold text-slate-700 block">HPP:</span>
                          <p className="text-slate-800">{patient.hpp}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        {patient.allergies && (
                          <div>
                             <span className="font-bold text-slate-700 block text-red-600">Alergias:</span>
                             <p className="text-slate-800">{patient.allergies}</p>
                          </div>
                        )}
                        {patient.continuousMeds && (
                           <div>
                             <span className="font-bold text-slate-700 block">Medicações Prévias:</span>
                             <p className="text-slate-800">{patient.continuousMeds}</p>
                          </div>
                        )}
                      </div>
                   </div>
                </section>

                {/* Two Column Layout for Diagnostics & Vitals */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                   <section>
                        <h2 className="font-bold text-lg text-slate-800 mb-3 border-b border-slate-300 pb-1">Diagnósticos Ativos</h2>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                            {patient.diagnostics.filter(d => d.status === 'Ativo').map(d => (
                                <li key={d.id} className="text-slate-800">{d.name} <span className="text-slate-400 text-xs">({formatDate(d.date)})</span></li>
                            ))}
                            {patient.diagnostics.filter(d => d.status === 'Ativo').length === 0 && <li className="text-slate-500 italic">Nenhum diagnóstico ativo.</li>}
                        </ul>
                   </section>
                   
                   <section>
                        <h2 className="font-bold text-lg text-slate-800 mb-3 border-b border-slate-300 pb-1">Sinais Vitais ({latestVitals ? formatDateTime(latestVitals.date).split(' ')[1] : '-'})</h2>
                        {latestVitals ? (
                            <div className="grid grid-cols-3 gap-2 text-center text-sm">
                                <div className="bg-slate-50 p-2 rounded print:bg-transparent print:border print:border-slate-200">
                                    <span className="block text-xs text-slate-500">PA</span>
                                    <span className="font-bold">{latestVitals.pas}x{latestVitals.pad}</span>
                                </div>
                                <div className="bg-slate-50 p-2 rounded print:bg-transparent print:border print:border-slate-200">
                                    <span className="block text-xs text-slate-500">FC</span>
                                    <span className="font-bold">{latestVitals.fc}</span>
                                </div>
                                <div className="bg-slate-50 p-2 rounded print:bg-transparent print:border print:border-slate-200">
                                    <span className="block text-xs text-slate-500">FR</span>
                                    <span className="font-bold">{latestVitals.fr}</span>
                                </div>
                                <div className="bg-slate-50 p-2 rounded print:bg-transparent print:border print:border-slate-200">
                                    <span className="block text-xs text-slate-500">SatO2</span>
                                    <span className="font-bold">{latestVitals.sato2}%</span>
                                </div>
                                <div className="bg-slate-50 p-2 rounded print:bg-transparent print:border print:border-slate-200">
                                    <span className="block text-xs text-slate-500">Dextro</span>
                                    <span className="font-bold">{latestVitals.dextro || '-'}</span>
                                </div>
                            </div>
                        ) : <p className="text-slate-500 italic text-sm">Não aferidos hoje.</p>}
                   </section>
                </div>

                {/* Evolution */}
                <section className="mb-8 break-inside-avoid">
                     <div className="flex justify-between items-baseline border-b border-slate-300 pb-1 mb-3">
                        <h2 className="font-bold text-lg text-slate-800">Evolução e Conduta</h2>
                        <span className="text-sm text-slate-500">{latestEvo ? formatDateTime(latestEvo.date) : ''}</span>
                     </div>
                     <div className="text-justify text-slate-900 leading-relaxed text-sm whitespace-pre-wrap font-serif">
                        {latestEvo?.content || <span className="italic text-slate-500">Nenhuma evolução registrada hoje.</span>}
                     </div>
                </section>

                {/* Lab Results Table */}
                <section className="mb-8 break-inside-avoid">
                   <h2 className="font-bold text-lg text-slate-800 mb-3 border-b border-slate-300 pb-1">Exames Laboratoriais Recentes</h2>
                   {recentLabs.length > 0 ? (
                     <div className="overflow-x-auto">
                        <table className="w-full text-xs border-collapse border border-slate-300">
                          <thead>
                            <tr className="bg-slate-100">
                              <th className="border border-slate-300 p-1 text-left w-1/3">Exame</th>
                              {recentLabs.map((l, i) => (
                                <th key={i} className="border border-slate-300 p-1 text-center">{formatDate(l.date)}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {displayFields.map(field => (
                              <tr key={field.key}>
                                <td className="border border-slate-300 p-1 font-medium">{field.label}</td>
                                {recentLabs.map((l, i) => (
                                  <td key={i} className="border border-slate-300 p-1 text-center">
                                    {l.values[field.key] !== undefined ? l.values[field.key] : '-'}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                     </div>
                   ) : <p className="text-slate-500 italic text-sm">Nenhum exame registrado.</p>}
                </section>

                {/* Imaging Notes */}
                <section className="mb-8 break-inside-avoid">
                   <h2 className="font-bold text-lg text-slate-800 mb-3 border-b border-slate-300 pb-1">Imagens e Anexos (Notas)</h2>
                   <div className="space-y-3">
                      {patient.imaging.map(img => (
                         <div key={img.id} className="text-sm border-l-2 border-slate-300 pl-3">
                            <p className="font-bold text-slate-700 text-xs mb-1">{formatDate(img.date)} {img.attachmentName ? ` - Anexo: ${img.attachmentName}` : ''}</p>
                            <p className="text-slate-800 whitespace-pre-wrap">{img.description || <span className="italic text-slate-400">Sem descrição</span>}</p>
                         </div>
                      ))}
                      {patient.imaging.length === 0 && <p className="text-slate-500 italic text-sm">Nenhum registro de imagem.</p>}
                   </div>
                </section>

                {/* Meds & Pendencies */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 break-inside-avoid">
                    <section>
                        <h2 className="font-bold text-lg text-slate-800 mb-3 border-b border-slate-300 pb-1">Prescrição Atual</h2>
                        <div className="space-y-2">
                            {patient.prescriptions.map(med => (
                                <div key={med.id} className="text-sm border-b border-dotted border-slate-200 pb-1 last:border-0">
                                    <span className="font-bold text-slate-800">{med.name}</span> {med.dose} - {med.frequency} ({med.route})
                                </div>
                            ))}
                             {patient.prescriptions.length === 0 && <p className="text-slate-500 italic text-sm">Sem prescrições.</p>}
                        </div>
                    </section>

                    <section>
                        <h2 className="font-bold text-lg text-slate-800 mb-3 border-b border-slate-300 pb-1">Pendências / Alertas</h2>
                        <ul className="space-y-2">
                            {patient.alerts.filter(a => !a.isResolved).map(alert => (
                                <li key={alert.id} className="flex items-start gap-2 text-sm text-slate-800">
                                    <span className="mt-1.5 w-1.5 h-1.5 bg-amber-500 rounded-full flex-shrink-0"></span>
                                    {alert.text}
                                </li>
                            ))}
                             {patient.alerts.filter(a => !a.isResolved).length === 0 && <li className="text-slate-500 italic text-sm">Sem pendências.</li>}
                        </ul>
                    </section>
                </div>

                {/* Footer Signature Area */}
                <div className="mt-16 pt-8 flex justify-between items-end print:flex hidden break-inside-avoid">
                     <div className="text-xs text-slate-400">Gerado por RecMed em {new Date().toLocaleString()}</div>
                     <div className="text-center">
                         <div className="border-t border-slate-400 w-64 mb-1"></div>
                         <p className="text-sm text-slate-800 font-medium">Assinatura / Carimbo</p>
                     </div>
                </div>
            </div>
        </div>
    )
  }

  const renderContent = () => {
    switch(activeTab) {
      case 'dashboard': return <Summary />;
      case 'prontuario': return <DailyRecordPage />;
      case 'anamnese': return <Anamnesis />;
      case 'diagnosticos': return <Diagnostics />;
      case 'evolucao': return <EvolutionPage />;
      case 'sinais': return <VitalSignsPage />;
      case 'labs': return <LabResultsPage />;
      case 'imagem': return <ImagingPage />;
      case 'medicacoes': return <MedicationsPage />;
      case 'graficos': return <ChartsPage />;
      case 'alertas': return <AlertsPage />;
      default: return <Summary />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden relative print:overflow-visible print:h-auto print:block">
      {/* Mobile Sidebar Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity print:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col h-full overflow-y-auto
        transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0
        print:hidden
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-blue-600 flex items-center gap-2">
            <Activity className="text-blue-600" /> RecMed
          </h2>
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-4 space-y-1 flex-1">
           {/* Back to List */}
           <button onClick={() => navigate('/')} className="w-full text-left px-4 py-2 text-xs text-slate-500 hover:text-blue-600 mb-2">← Voltar para lista</button>

          <SidebarItem icon={LayoutDashboard} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <SidebarItem icon={ClipboardList} label="Prontuário do Dia" active={activeTab === 'prontuario'} onClick={() => setActiveTab('prontuario')} />
          <div className="my-2 border-t border-slate-100 mx-4"></div>
          <SidebarItem icon={FileText} label="Anamnese" active={activeTab === 'anamnese'} onClick={() => setActiveTab('anamnese')} />
          <SidebarItem icon={Stethoscope} label="Diagnósticos" active={activeTab === 'diagnosticos'} onClick={() => setActiveTab('diagnosticos')} />
          <SidebarItem icon={Activity} label="Evolução e Conduta" active={activeTab === 'evolucao'} onClick={() => setActiveTab('evolucao')} />
          <SidebarItem icon={Activity} label="Sinais Vitais" active={activeTab === 'sinais'} onClick={() => setActiveTab('sinais')} />
          <SidebarItem icon={FlaskConical} label="Exames Laboratoriais" active={activeTab === 'labs'} onClick={() => setActiveTab('labs')} />
          <SidebarItem icon={ImageIcon} label="Imagem e Anexos" active={activeTab === 'imagem'} onClick={() => setActiveTab('imagem')} />
          <SidebarItem icon={Pill} label="Medicações" active={activeTab === 'medicacoes'} onClick={() => setActiveTab('medicacoes')} />
          <div className="my-2 border-t border-slate-100 mx-4"></div>
          <SidebarItem icon={BarChart2} label="Análise Gráfica" active={activeTab === 'graficos'} onClick={() => setActiveTab('graficos')} />
          <SidebarItem icon={AlertTriangle} label="Alertas e Pendências" active={activeTab === 'alertas'} onClick={() => setActiveTab('alertas')} />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden print:overflow-visible print:h-auto print:block">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 shadow-sm z-10 print:hidden">
          <div className="flex items-center gap-4">
            <button 
              className="md:hidden text-slate-600 p-1 rounded-md hover:bg-slate-100"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={24} />
            </button>
            <div className="flex flex-col md:flex-row md:items-center gap-1">
              <div className="font-semibold text-slate-700 truncate max-w-[150px] md:max-w-none">
                {activeTab === 'dashboard' ? 'Dashboard' : 
                activeTab === 'prontuario' ? 'Prontuário Diário' :
                activeTab === 'anamnese' ? 'Anamnese' :
                activeTab === 'diagnosticos' ? 'Diagnósticos' :
                activeTab === 'evolucao' ? 'Evolução e Conduta' :
                activeTab === 'sinais' ? 'Sinais Vitais' :
                activeTab === 'labs' ? 'Laboratório' :
                activeTab === 'imagem' ? 'Imagens' :
                activeTab === 'medicacoes' ? 'Medicações' :
                activeTab === 'graficos' ? 'Gráficos' : 'Alertas'}
              </div>
              <span className="md:hidden inline-flex w-fit items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-50 text-green-600 text-[9px] font-medium border border-green-200">
                <CloudLightning size={8} /> Nuvem
              </span>
            </div>
          </div>
          <div className="text-xs md:text-sm text-slate-500 flex items-center gap-2">
             <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-600 text-[10px] font-medium border border-green-200 mr-2" title="Dados salvos na nuvem">
                <CloudLightning size={10} /> Nuvem
             </span>
            <span className="hidden md:inline">Médico Logado</span>
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold">M</div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/50 print:p-0 print:overflow-visible print:bg-white">
          <div className="max-w-7xl mx-auto print:max-w-none print:mx-0">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};
