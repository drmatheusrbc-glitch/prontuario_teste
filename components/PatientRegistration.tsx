
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Patient, Sexo } from '../types';
import { Card, Input, Select, Button } from './UiComponents';
import { calculateBMI, calculateAge } from '../services/utils';
import { UserPlus, Users, Activity, LogOut, Trash2, Database, Download, Upload, X, Cloud, CloudLightning, Bed, HeartPulse, RefreshCw } from 'lucide-react';

interface RegistrationProps {
  onAddPatient: (p: Patient) => void;
}

export const PatientRegistration: React.FC<RegistrationProps> = ({ onAddPatient }) => {
  const navigate = useNavigate();
  const [form, setForm] = useState<Partial<Patient>>({
    sex: Sexo.MASCULINO,
    admissionDate: new Date().toISOString().slice(0, 10),
    ethnicity: 'Branca',
    weight: 0,
    height: 0
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => {
      const updated = { ...prev, [name]: value };
      
      if (name === 'weight' || name === 'height') {
        updated.bmi = calculateBMI(Number(updated.weight || 0), Number(updated.height || 0));
      }
      if (name === 'birthDate') {
        updated.age = calculateAge(value);
      }
      
      return updated;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName) return alert("Nome Obrigatório");

    const newPatient: Patient = {
      ...form as any,
      id: Date.now().toString(),
      version: 1, // IMPORTANTE: Inicializa a versão para o Supabase aceitar
      lastModified: Date.now(),
      age: form.birthDate ? calculateAge(form.birthDate) : 0,
      bmi: calculateBMI(Number(form.weight), Number(form.height)),
      hpp: '', continuousMeds: '', habits: '', hda: '', allergies: '',
      diagnostics: [], evolutions: [], vitalSigns: [], labResults: [], prescriptions: [], imaging: [], alerts: [], cultures: []
    };

    onAddPatient(newPatient);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
           <h1 className="text-3xl font-bold text-slate-900">Novo Paciente</h1>
           <Button variant="outline" onClick={() => navigate('/')}>Cancelar</Button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <Card>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2 font-semibold text-blue-600 border-b pb-2 mb-2">Identificação</div>
              
              <Input label="Nome" name="firstName" value={form.firstName || ''} onChange={handleChange} required />
              <Input label="Sobrenome" name="lastName" value={form.lastName || ''} onChange={handleChange} required />
              
              <Input label="Data de Nascimento" name="birthDate" type="date" value={form.birthDate || ''} onChange={handleChange} required />
              <Input label="Idade (Auto)" name="age" value={form.age || ''} readOnly className="bg-slate-100" />
              
              <Select label="Sexo" name="sex" value={form.sex} onChange={handleChange}>
                <option value={Sexo.MASCULINO}>Masculino</option>
                <option value={Sexo.FEMININO}>Feminino</option>
              </Select>
              <Input label="Etnia" name="ethnicity" value={form.ethnicity || ''} onChange={handleChange} placeholder="Ex: Branca, Negra, Parda" />

              <div className="md:col-span-2 font-semibold text-blue-600 border-b pb-2 mb-2 mt-4">Internação</div>
              
              <Input label="Hospital" name="hospital" value={form.hospital || ''} onChange={handleChange} />
              <Input label="Leito" name="bed" value={form.bed || ''} onChange={handleChange} />
              <Input label="Data Internação" name="admissionDate" type="date" value={form.admissionDate || ''} onChange={handleChange} />

              <div className="md:col-span-2 font-semibold text-blue-600 border-b pb-2 mb-2 mt-4">Dados Antropométricos</div>
              
              <Input label="Peso (kg)" name="weight" type="number" step="0.1" value={form.weight ?? ''} onChange={handleChange} />
              <Input label="Altura (cm ou m)" name="height" type="number" step="0.01" value={form.height ?? ''} onChange={handleChange} />
              <Input label="IMC (Auto)" name="bmi" value={form.bmi || ''} readOnly className="bg-slate-100" />

              <div className="md:col-span-2 font-semibold text-blue-600 border-b pb-2 mb-2 mt-4">Contato e Social</div>

              <Input label="Cidade" name="city" value={form.city || ''} onChange={handleChange} />
              <Input label="Estado" name="state" value={form.state || ''} onChange={handleChange} />
              <Input label="Endereço" name="address" value={form.address || ''} onChange={handleChange} className="md:col-span-2" />
              <Input label="Telefone" name="phone" value={form.phone || ''} onChange={handleChange} />
              <Input label="Emprego/Profissão" name="occupation" value={form.occupation || ''} onChange={handleChange} />

            </div>
            <div className="mt-8 flex justify-end gap-4">
              <Button type="submit" className="w-full md:w-auto">Cadastrar Paciente</Button>
            </div>
          </Card>
        </form>
      </div>
    </div>
  );
};

interface PatientListProps {
  patients: Patient[];
  onDelete: (id: string) => void;
  onLogout: () => void;
  onImport: (data: Patient[]) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const PatientList: React.FC<PatientListProps> = ({ patients, onDelete, onLogout, onImport, onRefresh, isRefreshing }) => {
  const navigate = useNavigate();
  const [showDataModal, setShowDataModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'enfermaria' | 'uti'>('enfermaria');

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onDelete(id);
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(patients, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `recmed_backup_${new Date().toISOString().slice(0,10)}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if(e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          if(event.target?.result) {
             const parsed = JSON.parse(event.target.result as string);
             onImport(parsed);
             setShowDataModal(false);
          }
        } catch(err) {
          alert("Erro ao ler arquivo: formato inválido.");
        }
      };
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
       {showDataModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md relative animate-fade-in-up">
               <button onClick={() => setShowDataModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                 <X size={20} />
               </button>
               
               <div className="flex items-center gap-3 mb-4 text-blue-600">
                  <div className="p-2 bg-blue-50 rounded-lg"><Database size={24} /></div>
                  <h3 className="text-xl font-bold text-slate-800">Backup / Migração</h3>
               </div>
               
               <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-6 text-sm text-blue-800">
                 <p className="font-bold mb-1 flex items-center gap-2"><Cloud size={14}/> Nuvem Ativada</p>
                 <p>Os dados são sincronizados automaticamente. Use esta tela para baixar cópias de segurança.</p>
               </div>

               <div className="space-y-4">
                 <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Exportar</label>
                   <Button className="w-full flex items-center justify-center gap-2 py-3" onClick={handleExport}>
                     <Download size={18} /> Baixar Backup (JSON)
                   </Button>
                 </div>

                 <div className="relative pt-4 border-t border-slate-100">
                   <label className="block text-sm font-medium text-slate-700 mb-1">Importar Backup Externo</label>
                   <div className="relative">
                     <Button variant="outline" className="w-full flex items-center justify-center gap-2 py-3" onClick={() => document.getElementById('file-upload')?.click()}>
                       <Upload size={18} /> Restaurar Arquivo
                     </Button>
                     <input id="file-upload" type="file" accept=".json" onChange={handleImport} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                   </div>
                 </div>
               </div>
            </div>
         </div>
       )}

       <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-30">
         <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
           <div className="flex items-center gap-3">
             <h1 className="text-2xl font-bold text-blue-600 flex items-center gap-2">
               <Activity /> RecMed
             </h1>
             <button 
                onClick={onRefresh} 
                className={`p-2 rounded-full hover:bg-slate-100 transition-all ${isRefreshing ? 'animate-spin text-blue-500' : 'text-slate-400'}`}
                title="Sincronizar com a Nuvem"
             >
                <RefreshCw size={20} />
             </button>
           </div>
           <div className="flex gap-2">
             <Button onClick={() => setShowDataModal(true)} variant="outline" className="text-sm flex items-center gap-2 text-slate-600 border-slate-200">
               <Database size={16} /> <span className="hidden sm:inline">Backup</span>
             </Button>
             <Button onClick={onLogout} variant="outline" className="text-sm flex items-center gap-2 text-red-600 border-red-200">
               <LogOut size={16} /> <span className="hidden sm:inline">Sair</span>
             </Button>
           </div>
         </div>
       </header>

       <main className="max-w-7xl mx-auto px-4 py-8">
         <div className="flex justify-center mb-8">
            <div className="bg-slate-200 p-1 rounded-xl flex gap-1 shadow-inner">
               <button 
                  onClick={() => setActiveTab('enfermaria')}
                  className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${activeTab === 'enfermaria' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:bg-slate-300/50'}`}
               >
                  <Bed size={18} /> Enfermaria
               </button>
               <button 
                  onClick={() => setActiveTab('uti')}
                  className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${activeTab === 'uti' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:bg-slate-300/50'}`}
               >
                  <HeartPulse size={18} /> UTI
               </button>
            </div>
         </div>

         {activeTab === 'enfermaria' && (
           <div className="animate-fade-in">
             <div className="flex justify-between items-center mb-6">
               <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2"><Users /> Pacientes</h2>
               <Button onClick={() => navigate('/register')}><UserPlus size={18} className="mr-2 inline" /> Novo Paciente</Button>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {patients.map(p => (
                 <div key={p.id} onClick={() => navigate(`/patient/${p.id}`)} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all group relative">
                    <div className="flex justify-between items-start">
                       <div>
                         <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600">{p.firstName} {p.lastName}</h3>
                         <p className="text-sm text-slate-500">{p.sex}, {p.age} anos</p>
                       </div>
                       <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                         Leito {p.bed}
                       </span>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-100 text-sm text-slate-600 space-y-1">
                       <p><strong>Hospital:</strong> {p.hospital}</p>
                       <p><strong>Admissão:</strong> {new Date(p.admissionDate).toLocaleDateString('pt-BR')}</p>
                    </div>
                    
                    <button 
                      onClick={(e) => handleDeleteClick(e, p.id)}
                      className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"
                      title="Excluir paciente"
                    >
                      <Trash2 size={16} />
                    </button>
                 </div>
               ))}
               {patients.length === 0 && (
                 <div className="col-span-full text-center py-12 bg-white rounded-lg border border-dashed border-slate-300">
                    <p className="text-slate-500 mb-4">Nenhum paciente cadastrado.</p>
                    <Button variant="outline" onClick={() => navigate('/register')}>Cadastrar Primeiro Paciente</Button>
                 </div>
               )}
             </div>
           </div>
         )}

         {activeTab === 'uti' && (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-slate-300 text-center">
               <h3 className="text-2xl font-bold text-slate-800 mb-2">Módulo UTI</h3>
               <p className="text-slate-500">Em desenvolvimento...</p>
            </div>
         )}
       </main>
    </div>
  );
};
