
import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, FileText, Stethoscope, Activity, 
  FlaskConical, Image as ImageIcon, Pill, BarChart2, 
  AlertTriangle, Plus, Save, Trash2, Download, CheckCircle, Clock, X, Menu,
  Printer, ClipboardList, Paperclip, Search,
  Pencil, UserCog, CheckSquare, StopCircle, Microscope,
  Calendar, Info, AlertCircle
} from 'lucide-react';
import { Patient, Sexo, LAB_FIELDS, VitalSign, Evolution, LabResult, Medication, ImagingExam, Diagnosis, Culture, Alert } from '../types';
import { Card, Button, Input, TextArea, Select } from './UiComponents';
import { formatDate, formatDateTime, calculateCKDEPI, calculateDaysHospitalized, calculateBMI } from '../services/utils';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

// --- SUB-COMPONENTES DE ABA (ESTÁVEIS) ---

const AlertsTab = ({ patient, onUpdate }: { patient: Patient, onUpdate: (p: Patient) => void }) => {
  const [newAlertText, setNewAlertText] = useState('');

  const handleAdd = () => {
    if (!newAlertText.trim()) return;
    const newAlert: Alert = {
      id: Date.now().toString(),
      text: newAlertText,
      isResolved: false
    };
    onUpdate({ ...patient, alerts: [newAlert, ...patient.alerts] });
    setNewAlertText('');
  };

  const toggleResolve = (id: string) => {
    onUpdate({
      ...patient,
      alerts: patient.alerts.map(a => a.id === id ? { ...a, isResolved: !a.isResolved } : a)
    });
  };

  const removeAlert = (id: string) => {
    onUpdate({
      ...patient,
      alerts: patient.alerts.filter(a => a.id !== id)
    });
  };

  const activeAlerts = patient.alerts.filter(a => !a.isResolved);
  const resolvedAlerts = patient.alerts.filter(a => a.isResolved);

  return (
    <div className="space-y-6">
      <Card title="Novo Alerta ou Pendência">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <Input 
            label="Descrição do Alerta" 
            className="flex-1" 
            value={newAlertText} 
            onChange={e => setNewAlertText(e.target.value)} 
            placeholder="Ex: Aguardar resultado de TC, Jejum para exames, Risco de Queda"
          />
          <Button onClick={handleAdd} className="mb-4">
            <Plus size={18} className="mr-2"/> Adicionar Alerta
          </Button>
        </div>
      </Card>

      <Card title="Alertas Ativos" className="border-l-4 border-l-red-500">
        <div className="space-y-3">
          {activeAlerts.length === 0 ? (
            <p className="text-slate-400 italic">Nenhum alerta ativo no momento.</p>
          ) : (
            activeAlerts.map(alert => (
              <div key={alert.id} className="flex justify-between items-center p-4 bg-red-50 rounded-lg border border-red-100">
                <div className="flex items-center gap-3 text-red-700">
                  <AlertTriangle size={20} className="shrink-0" />
                  <span className="font-medium">{alert.text}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => toggleResolve(alert.id)}
                    className="p-2 text-slate-400 hover:text-green-600 transition-colors bg-white rounded-full border shadow-sm"
                    title="Marcar como resolvido"
                  >
                    <CheckCircle size={18}/>
                  </button>
                  <button 
                    onClick={() => removeAlert(alert.id)}
                    className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                    title="Excluir"
                  >
                    <Trash2 size={18}/>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {resolvedAlerts.length > 0 && (
        <Card title="Histórico de Alertas Resolvidos">
          <div className="space-y-2 opacity-60">
            {resolvedAlerts.map(alert => (
              <div key={alert.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center gap-3 text-slate-500 line-through">
                  <CheckCircle size={16} className="text-green-500" />
                  <span className="text-sm">{alert.text}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => toggleResolve(alert.id)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Reativar
                  </button>
                  <button 
                    onClick={() => removeAlert(alert.id)}
                    className="p-1 text-slate-400 hover:text-red-500"
                  >
                    <Trash2 size={14}/>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

const PrescriptionTab = ({ patient, onUpdate }: { patient: Patient, onUpdate: (p: Patient) => void }) => {
  const [form, setForm] = useState<Partial<Medication>>({
    name: '', dose: '', route: 'VO', frequency: '', startDate: new Date().toISOString().slice(0, 10), isContinuous: false
  });

  const handleAdd = () => {
    if (!form.name) return;
    const newMed: Medication = {
      id: Date.now().toString(),
      name: form.name!,
      dose: form.dose || '',
      route: form.route || 'VO',
      frequency: form.frequency || '',
      startDate: form.startDate || new Date().toISOString().slice(0, 10),
      isContinuous: !!form.isContinuous,
      status: 'active'
    };
    onUpdate({ ...patient, prescriptions: [newMed, ...patient.prescriptions] });
    setForm({ name: '', dose: '', route: 'VO', frequency: '', startDate: new Date().toISOString().slice(0, 10), isContinuous: false });
  };

  const removeMed = (id: string) => {
    onUpdate({ ...patient, prescriptions: patient.prescriptions.filter(m => m.id !== id) });
  };

  return (
    <div className="space-y-6">
      <Card title="Nova Prescrição">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <Input label="Medicação" className="md:col-span-2" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Ex: Ceftriaxona" />
          <Input label="Dose" value={form.dose} onChange={e => setForm({...form, dose: e.target.value})} placeholder="Ex: 2g" />
          <Select label="Via" value={form.route} onChange={e => setForm({...form, route: e.target.value})}>
            <option value="VO">VO</option>
            <option value="EV">EV</option>
            <option value="IM">IM</option>
            <option value="SC">SC</option>
            <option value="Inalatória">Inalatória</option>
          </Select>
          <Input label="Frequência" value={form.frequency} onChange={e => setForm({...form, frequency: e.target.value})} placeholder="Ex: 12/12h" />
          <Input label="Início" type="date" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} />
          <Button onClick={handleAdd} className="mb-4"><Plus size={18} className="mr-2"/> Adicionar</Button>
        </div>
      </Card>
      <Card title="Medicações em Uso">
        <div className="space-y-3">
          {patient.prescriptions.length === 0 ? <p className="text-slate-400 italic">Nenhuma medicação prescrita.</p> : 
            patient.prescriptions.map(med => (
              <div key={med.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <p className="font-bold text-blue-700">{med.name} {med.dose}</p>
                  <p className="text-xs text-slate-500">{med.route} • {med.frequency} • Início: {formatDate(med.startDate)}</p>
                </div>
                <button onClick={() => removeMed(med.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
              </div>
            ))
          }
        </div>
      </Card>
    </div>
  );
};

const ImagingTab = ({ patient, onUpdate }: { patient: Patient, onUpdate: (p: Patient) => void }) => {
  const [form, setForm] = useState({ description: '', date: new Date().toISOString().slice(0, 10) });

  const handleAdd = () => {
    if (!form.description) return;
    const newExam: ImagingExam = { id: Date.now().toString(), ...form };
    onUpdate({ ...patient, imaging: [newExam, ...patient.imaging] });
    setForm({ description: '', date: new Date().toISOString().slice(0, 10) });
  };

  return (
    <div className="space-y-6">
      <Card title="Registrar Exame de Imagem">
        <div className="space-y-4">
          <Input label="Data do Exame" type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
          <TextArea label="Laudo / Descrição do Exame" rows={4} value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Descreva os achados radiológicos..." />
          <Button onClick={handleAdd}><Save size={18} className="mr-2"/> Salvar Exame</Button>
        </div>
      </Card>
      <div className="space-y-4">
        {patient.imaging.map(img => (
          <Card key={img.id} title={`Exame em ${formatDate(img.date)}`}>
            <p className="whitespace-pre-wrap text-sm text-slate-700">{img.description}</p>
          </Card>
        ))}
      </div>
    </div>
  );
};

const CulturesTab = ({ patient, onUpdate }: { patient: Patient, onUpdate: (p: Patient) => void }) => {
  const [form, setForm] = useState<Partial<Culture>>({ type: '', requestDate: new Date().toISOString().slice(0, 10), status: 'pending' });

  const handleAdd = () => {
    if (!form.type) return;
    const newCulture: Culture = { id: Date.now().toString(), type: form.type!, requestDate: form.requestDate!, status: 'pending' };
    onUpdate({ ...patient, cultures: [newCulture, ...patient.cultures] });
    setForm({ type: '', requestDate: new Date().toISOString().slice(0, 10), status: 'pending' });
  };

  return (
    <div className="space-y-6">
      <Card title="Solicitar/Registrar Cultura">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <Input label="Tipo de Cultura" value={form.type} onChange={e => setForm({...form, type: e.target.value})} placeholder="Ex: Hemocultura, Urinocultura" />
          <Input label="Data da Coleta" type="date" value={form.requestDate} onChange={e => setForm({...form, requestDate: e.target.value})} />
          <Button onClick={handleAdd} className="mb-4"><Microscope size={18} className="mr-2"/> Registrar</Button>
        </div>
      </Card>
      <Card title="Monitoramento Microbiológico">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="p-3 text-left">Tipo</th>
                <th className="p-3 text-left">Data Coleta</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {patient.cultures.length === 0 ? <tr><td colSpan={4} className="p-4 text-center text-slate-400 italic">Nenhuma cultura registrada.</td></tr> : 
                patient.cultures.map(c => (
                  <tr key={c.id} className="border-b">
                    <td className="p-3 font-medium">{c.type}</td>
                    <td className="p-3">{formatDate(c.requestDate)}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${c.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                        {c.status === 'pending' ? 'Pendente' : 'Finalizado'}
                      </span>
                    </td>
                    <td className="p-3">
                       {c.status === 'pending' ? (
                         <Button size="sm" variant="outline" onClick={() => {
                           const res = prompt("Digite o resultado da cultura:");
                           if (res) onUpdate({...patient, cultures: patient.cultures.map(x => x.id === c.id ? {...x, result: res, status: 'completed', resultDate: new Date().toISOString()} : x)});
                         }}>Lançar Resultado</Button>
                       ) : <span className="text-blue-600 font-semibold">{c.result}</span>}
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

// --- COMPONENTES QUE JÁ EXISTIAM (PARA RE-MONTAGEM COMPLETA) ---

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
       <Card title="Alertas e Pendências Ativas" className="md:col-span-1 border-l-4 border-l-red-500">
         {patient.alerts.filter(a => !a.isResolved).length === 0 ? (
           <p className="text-slate-400 italic">Sem pendências ativas.</p>
         ) : (
           <ul className="space-y-2">
             {patient.alerts.filter(a => !a.isResolved).map(a => (
               <li key={a.id} className="flex items-start gap-2 text-red-700 bg-red-50 p-2 rounded text-sm">
                 <AlertTriangle size={14} className="mt-1 shrink-0" />
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
      <Card title="Anamnese e História" action={<Button onClick={handleSave} size="sm"><Save size={16} className="mr-2"/> Salvar Anamnese</Button>}>
         <div className="space-y-4">
            <TextArea label="História da Doença Atual (HDA)" rows={5} value={localData.hda} onChange={e => setLocalData({...localData, hda: e.target.value})} className="bg-white" />
            <TextArea label="História Patológica Pregressa (HPP)" rows={3} value={localData.hpp} onChange={e => setLocalData({...localData, hpp: e.target.value})} />
            <TextArea label="Medicações de Uso Contínuo" rows={3} value={localData.continuousMeds} onChange={e => setLocalData({...localData, continuousMeds: e.target.value})} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <TextArea label="Hábitos de Vida" rows={3} value={localData.habits} onChange={e => setLocalData({...localData, habits: e.target.value})} />
               <TextArea label="Alergias Conhecidas" rows={3} value={localData.allergies} onChange={e => setLocalData({...localData, allergies: e.target.value})} />
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

  return (
    <div className="space-y-6">
      <Card title="Dados Cadastrais" action={<Button onClick={() => onSave(formData)} size="sm"><Save size={16} className="mr-2"/> Atualizar Cadastro</Button>}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Nome" name="firstName" value={formData.firstName} onChange={handleChange} />
          <Input label="Sobrenome" name="lastName" value={formData.lastName} onChange={handleChange} />
          <Input label="Leito" name="bed" value={formData.bed} onChange={handleChange} />
          <Input label="Hospital" name="hospital" value={formData.hospital} onChange={handleChange} />
          <Input label="Peso (kg)" name="weight" type="number" value={formData.weight} onChange={handleChange} />
          <Input label="Altura" name="height" type="number" value={formData.height} onChange={handleChange} />
        </div>
      </Card>
    </div>
  );
};

const VitalSignsTab = ({ patient, onUpdate }: { patient: Patient, onUpdate: (p: Patient) => void }) => {
  const [form, setForm] = useState<VitalSign>({ date: new Date().toISOString().slice(0, 16), fc: '', fr: '', pas: '', pad: '', sato2: '', dextro: '', tax: '' });

  const handleAdd = () => {
    onUpdate({ ...patient, vitalSigns: [form, ...patient.vitalSigns] });
    setForm({ date: new Date().toISOString().slice(0, 16), fc: '', fr: '', pas: '', pad: '', sato2: '', dextro: '', tax: '' });
  };

  return (
    <div className="space-y-6">
      <Card title="Registrar Sinais Vitais">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 items-end">
          <Input label="Data/Hora" type="datetime-local" className="col-span-2" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
          <Input label="PA (S/D)" placeholder="120/80" value={`${form.pas}/${form.pad}`} onChange={e => {
            const parts = e.target.value.split('/');
            setForm({...form, pas: parts[0] || '', pad: parts[1] || ''});
          }} />
          <Input label="FC" value={form.fc} onChange={e => setForm({...form, fc: e.target.value})} />
          <Input label="FR" value={form.fr} onChange={e => setForm({...form, fr: e.target.value})} />
          <Input label="SatO2" value={form.sato2} onChange={e => setForm({...form, sato2: e.target.value})} />
          <Input label="Tax" value={form.tax} onChange={e => setForm({...form, tax: e.target.value})} />
          <Button onClick={handleAdd} className="mb-4">Adicionar</Button>
        </div>
      </Card>
      <Card title="Histórico">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="p-2 text-left">Data</th>
                <th className="p-2 text-left">PA</th>
                <th className="p-2 text-left">FC</th>
                <th className="p-2 text-left">SatO2</th>
                <th className="p-2 text-left">Tax</th>
              </tr>
            </thead>
            <tbody>
              {patient.vitalSigns.map((vs, i) => (
                <tr key={i} className="border-b">
                  <td className="p-2 font-medium">{formatDateTime(vs.date)}</td>
                  <td className="p-2">{vs.pas}/{vs.pad}</td>
                  <td className="p-2">{vs.fc}</td>
                  <td className="p-2">{vs.sato2}%</td>
                  <td className="p-2">{vs.tax}°C</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

const LabResultsTab = ({ patient, onUpdate }: { patient: Patient, onUpdate: (p: Patient) => void }) => {
  const [newEntry, setNewEntry] = useState<LabResult>({ date: new Date().toISOString().slice(0, 10), values: {} });

  const handleSave = () => {
    onUpdate({ ...patient, labResults: [newEntry, ...patient.labResults] });
    setNewEntry({ date: new Date().toISOString().slice(0, 10), values: {} });
  };

  return (
    <div className="space-y-6">
      <Card title="Lançar Laboratório" action={<Button onClick={handleSave} size="sm"><Plus size={16} className="mr-2"/> Adicionar Bloco</Button>}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Data da Coleta" type="date" value={newEntry.date} onChange={e => setNewEntry({...newEntry, date: e.target.value})} />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:col-span-2">
            {LAB_FIELDS.map(field => (
              <Input 
                key={field.key} 
                label={`${field.label}`} 
                type="number" 
                value={newEntry.values[field.key] || ''} 
                onChange={e => setNewEntry({...newEntry, values: { ...newEntry.values, [field.key]: parseFloat(e.target.value) }})} 
              />
            ))}
          </div>
        </div>
      </Card>
      {patient.labResults.map((lr, i) => (
        <Card key={i} title={`Exames de ${formatDate(lr.date)}`}>
           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
             {Object.entries(lr.values).map(([key, val]) => (
                <div key={key} className="bg-slate-50 p-2 rounded border">
                  <p className="text-[10px] uppercase text-slate-500 font-bold">{key}</p>
                  <p className="text-lg font-bold text-blue-700">{val}</p>
                </div>
             ))}
           </div>
        </Card>
      ))}
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---

export const PatientDashboard: React.FC<{ patients: Patient[]; updatePatient: (p: Patient) => void }> = ({ patients, updatePatient }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const patient = patients.find(p => p.id === id);
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [evoData, setEvoData] = useState({ subj: '', exam: '', cond: '' });
  const [diagForm, setDiagForm] = useState({ name: '', date: new Date().toISOString().slice(0, 10) });

  useEffect(() => {
    if (!patient) navigate('/');
  }, [patient, navigate]);

  if (!patient) return null;

  const handleSaveEvolution = () => {
    if (!evoData.subj && !evoData.exam && !evoData.cond) return;
    const content = `**EVOLUÇÃO:**\n${evoData.subj}\n\n**EXAME FÍSICO:**\n${evoData.exam}\n\n**CONDUTA:**\n${evoData.cond}`;
    const newEv: Evolution = { id: Date.now().toString(), date: new Date().toISOString(), content };
    updatePatient({ ...patient, evolutions: [newEv, ...patient.evolutions] });
    setEvoData({ subj: '', exam: '', cond: '' });
    alert('Evolução registrada!');
  };

  const menuItems = [
    { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'cadastro', label: 'Cadastro', icon: UserCog },
    { id: 'anamnese', label: 'Anamnese', icon: FileText },
    { id: 'evolucao', label: 'Evolução', icon: ClipboardList },
    { id: 'alertas', label: 'Alertas e Pendências', icon: AlertCircle },
    { id: 'sinais', label: 'Sinais Vitais', icon: Activity },
    { id: 'lab', label: 'Laboratório', icon: FlaskConical },
    { id: 'prescricao', label: 'Prescrição', icon: Pill },
    { id: 'imagem', label: 'Exames de Imagem', icon: ImageIcon },
    { id: 'cultura', label: 'Culturas', icon: Microscope },
    { id: 'diagnosticos', label: 'Diagnósticos', icon: Stethoscope },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row overflow-hidden">
      {/* Mobile Bar */}
      <div className="md:hidden bg-white p-4 flex justify-between items-center border-b border-slate-200 sticky top-0 z-20">
        <span className="font-bold text-slate-800">RecMed - {patient.firstName}</span>
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-600"><Menu /></button>
      </div>

      {/* Sidebar */}
      <aside className={`fixed md:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
           <h1 className="text-xl font-bold text-blue-600 flex items-center gap-2"><Activity /> RecMed</h1>
           <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400"><X size={20}/></button>
        </div>
        <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-100px)]">
           <Button variant="secondary" className="w-full justify-start mb-4" onClick={() => navigate('/')}>← Voltar</Button>
           {menuItems.map(item => (
             <button 
               key={item.id} 
               onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }} 
               className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === item.id ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
             >
               <item.icon size={18} /> {item.label}
             </button>
           ))}
        </nav>
      </aside>

      {/* Content Area */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-screen">
         <div className="max-w-5xl mx-auto pb-20">
            {activeTab === 'dashboard' && <SummaryTab patient={patient} />}
            {activeTab === 'cadastro' && <RegistrationTab patient={patient} onSave={updatePatient} />}
            {activeTab === 'anamnese' && <AnamnesisTab patient={patient} onSave={updatePatient} />}
            
            {activeTab === 'evolucao' && (
              <div className="space-y-6">
                <Card title="Nova Evolução" action={<Button onClick={handleSaveEvolution}><Save size={16} className="mr-2"/> Registrar</Button>}>
                  <div className="space-y-4">
                    <TextArea label="Evolução Clínica" rows={4} value={evoData.subj} onChange={e => setEvoData({...evoData, subj: e.target.value})} />
                    <TextArea label="Exame Físico" rows={3} value={evoData.exam} onChange={e => setEvoData({...evoData, exam: e.target.value})} />
                    <TextArea label="Conduta" rows={3} value={evoData.cond} onChange={e => setEvoData({...evoData, cond: e.target.value})} />
                  </div>
                </Card>
                <div className="space-y-4">
                  {patient.evolutions.map(ev => (
                    <div key={ev.id} className="bg-white p-5 rounded-lg border shadow-sm border-l-4 border-l-blue-500">
                      <p className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">{formatDateTime(ev.date)}</p>
                      <div className="whitespace-pre-wrap text-slate-800 text-sm">{ev.content}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'alertas' && <AlertsTab patient={patient} onUpdate={updatePatient} />}
            {activeTab === 'sinais' && <VitalSignsTab patient={patient} onUpdate={updatePatient} />}
            {activeTab === 'lab' && <LabResultsTab patient={patient} onUpdate={updatePatient} />}
            {activeTab === 'prescricao' && <PrescriptionTab patient={patient} onUpdate={updatePatient} />}
            {activeTab === 'imagem' && <ImagingTab patient={patient} onUpdate={updatePatient} />}
            {activeTab === 'cultura' && <CulturesTab patient={patient} onUpdate={updatePatient} />}

            {activeTab === 'diagnosticos' && (
              <div className="space-y-6">
                <Card title="Adicionar Diagnóstico">
                   <div className="flex flex-col md:flex-row gap-4 items-end">
                      <Input label="Diagnóstico" className="flex-1" value={diagForm.name} onChange={e => setDiagForm({...diagForm, name: e.target.value})} />
                      <Button onClick={() => {
                        if(!diagForm.name) return;
                        updatePatient({...patient, diagnostics: [{id: Date.now().toString(), name: diagForm.name, date: diagForm.date, status: 'Ativo' as const}, ...patient.diagnostics]});
                        setDiagForm({name: '', date: new Date().toISOString().slice(0, 10)});
                      }} className="mb-4">Adicionar</Button>
                   </div>
                </Card>
                <Card title="Problemas Ativos">
                   <div className="divide-y">
                      {patient.diagnostics.map(d => (
                        <div key={d.id} className="py-3 flex justify-between items-center">
                           <span className="font-semibold">{d.name}</span>
                           <span className="text-xs text-slate-400">{formatDate(d.date)}</span>
                        </div>
                      ))}
                   </div>
                </Card>
              </div>
            )}
         </div>
      </main>
    </div>
  );
};
