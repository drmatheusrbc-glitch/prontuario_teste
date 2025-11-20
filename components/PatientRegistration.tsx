
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Patient, Sexo } from '../types';
import { Card, Input, Select, Button } from './UiComponents';
import { calculateBMI, calculateAge } from '../services/utils';
import { UserPlus, Users, Activity, LogOut, Trash2 } from 'lucide-react';

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
      age: form.birthDate ? calculateAge(form.birthDate) : 0,
      bmi: calculateBMI(Number(form.weight), Number(form.height)),
      // Defaults
      hpp: '', continuousMeds: '', habits: '', hda: '', allergies: '',
      diagnostics: [], evolutions: [], vitalSigns: [], labResults: [], prescriptions: [], imaging: [], alerts: []
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
}

export const PatientList: React.FC<PatientListProps> = ({ patients, onDelete, onLogout }) => {
  const navigate = useNavigate();

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if(window.confirm('Tem certeza que deseja excluir este paciente e todos os seus dados?')) {
      onDelete(id);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
       <header className="bg-white shadow-sm border-b border-slate-200">
         <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
           <h1 className="text-2xl font-bold text-blue-600 flex items-center gap-2">
             <Activity /> MedFlow
           </h1>
           <Button onClick={onLogout} variant="outline" className="text-sm flex items-center gap-2 text-red-600 hover:bg-red-50 border-red-200">
             <LogOut size={16} /> Sair
           </Button>
         </div>
       </header>

       <main className="max-w-7xl mx-auto px-4 py-8">
         <div className="flex justify-between items-center mb-6">
           <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2"><Users /> Pacientes Internados</h2>
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
                   <p><strong>Diagnósticos:</strong> {p.diagnostics.length > 0 ? p.diagnostics[0].name + (p.diagnostics.length > 1 ? '...' : '') : '-'}</p>
                </div>
                
                <button 
                  onClick={(e) => handleDeleteClick(e, p.id)}
                  className="absolute top-4 right-4 p-2 bg-white rounded-full text-slate-300 hover:text-red-600 hover:bg-red-50 transition-colors shadow-sm border border-transparent hover:border-red-100 opacity-0 group-hover:opacity-100"
                  title="Excluir paciente"
                >
                  <Trash2 size={16} />
                </button>
             </div>
           ))}
           {patients.length === 0 && (
             <div className="col-span-full text-center py-12 bg-white rounded-lg border border-dashed border-slate-300">
                <p className="text-slate-500">Nenhum paciente cadastrado.</p>
                <Button variant="outline" className="mt-4" onClick={() => navigate('/register')}>Cadastrar Primeiro Paciente</Button>
             </div>
           )}
         </div>
       </main>
    </div>
  );
};
