
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Patient, Sexo } from './types';
import { PatientRegistration, PatientList } from './components/PatientRegistration';
import { PatientDashboard } from './components/PatientDashboard';
import { Card, Input, Button } from './components/UiComponents';
import { Activity } from 'lucide-react';

// Initial Mock Data (Used only if localStorage is empty)
const MOCK_PATIENTS: Patient[] = [
  {
    id: '1',
    firstName: 'João',
    lastName: 'Silva',
    hospital: 'Santa Casa',
    bed: '204-A',
    admissionDate: '2023-10-25',
    sex: Sexo.MASCULINO,
    ethnicity: 'Parda',
    birthDate: '1958-05-15',
    age: 65,
    city: 'São Paulo',
    state: 'SP',
    address: 'Rua das Flores, 123',
    phone: '(11) 99999-9999',
    occupation: 'Aposentado',
    weight: 78,
    height: 1.75,
    bmi: 25.47,
    hpp: 'HAS há 20 anos, DM2 há 10 anos.',
    continuousMeds: 'Losartana 50mg 12/12h, Metformina 850mg 3x/dia',
    habits: 'Ex-tabagista (20 anos/maço). Nega etilismo.',
    hda: 'Paciente deu entrada no PS com dispneia aos médios esforços...',
    allergies: 'Dipirona',
    diagnostics: [
      { id: '1', name: 'Pneumonia Comunitária', date: '2023-10-25', status: 'Ativo' },
      { id: '2', name: 'Descompensação de IC', date: '2023-10-25', status: 'Ativo' }
    ],
    evolutions: [
        { id: '101', date: '2023-10-26T09:00', content: 'Paciente estável, refere melhora da dispneia. Aceitando dieta.' }
    ],
    vitalSigns: [
        { date: '2023-10-26T08:00', fc: 82, fr: 18, pas: 130, pad: 80, sato2: 96, dextro: 110 },
        { date: '2023-10-25T20:00', fc: 88, fr: 22, pas: 140, pad: 90, sato2: 92, dextro: 125 }
    ],
    labResults: [
        { date: '2023-10-25', values: { hemoglobina: 13.5, leucocitos: 14500, creatinina: 1.2 } }
    ],
    prescriptions: [
        { id: '1', name: 'Ceftriaxona', route: 'IV', dose: '1g', frequency: '12/12h', startDate: '2023-10-25', isContinuous: false, endDate: '2023-11-01' }
    ],
    imaging: [
      { id: 'img1', date: '2023-10-25', description: 'Raio-X de Tórax: Opacidade em base direita compatível com processo pneumônico.', attachmentName: 'rx_exemplo_demo.jpg' }
    ],
    alerts: [{ id: '1', text: 'Solicitar ECOcardiograma', isResolved: false }]
  }
];

const LoginScreen: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Ajuste: Converte email para minúsculo para evitar erro no mobile onde o teclado capitaliza a primeira letra
    if (email.trim().toLowerCase() === 'drmatheusrbc@gmail.com' && password === '150199') {
      onLogin();
    } else {
      setError('Email ou senha incorretos.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 mb-4">
            <Activity size={32} />
          </div>
          <h1 className="text-3xl font-bold text-slate-800">MedFlow</h1>
          <p className="text-slate-500 mt-2">Acesso Médico Restrito</p>
        </div>
        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input 
              label="Email" 
              type="email" 
              placeholder="seu@email.com" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
              className="bg-white"
              // Propriedades para melhorar usabilidade no mobile
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="email"
            />
            <Input 
              label="Senha" 
              type="password" 
              placeholder="••••••••" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
              className="bg-white"
            />
            
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm text-center">
                {error}
              </div>
            )}

            <Button className="w-full" type="submit">
              Entrar no Sistema
            </Button>
          </form>
          <div className="mt-4 text-center text-xs text-slate-400">
            <p>Sistema exclusivo para médicos autorizados.</p>
          </div>
        </Card>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  // Load Auth State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('medflow_auth') === 'true';
  });

  // Load Patients State
  const [patients, setPatients] = useState<Patient[]>(() => {
    const saved = localStorage.getItem('medflow_patients');
    return saved ? JSON.parse(saved) : MOCK_PATIENTS;
  });

  // Persist Auth
  useEffect(() => {
    localStorage.setItem('medflow_auth', String(isAuthenticated));
  }, [isAuthenticated]);

  // Persist Patients
  useEffect(() => {
    localStorage.setItem('medflow_patients', JSON.stringify(patients));
  }, [patients]);

  const handleAddPatient = (newPatient: Patient) => {
    setPatients(prev => [newPatient, ...prev]);
  };

  const handleUpdatePatient = (updatedPatient: Patient) => {
    setPatients(prev => prev.map(p => p.id === updatedPatient.id ? updatedPatient : p));
  };

  const handleDeletePatient = (id: string) => {
    setPatients(prev => prev.filter(p => p.id !== id));
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={!isAuthenticated ? <LoginScreen onLogin={() => setIsAuthenticated(true)} /> : <Navigate to="/" />} />
        
        <Route 
          path="/" 
          element={isAuthenticated ? <PatientList patients={patients} onDelete={handleDeletePatient} onLogout={handleLogout} /> : <Navigate to="/login" />} 
        />
        
        <Route 
          path="/register" 
          element={isAuthenticated ? <PatientRegistration onAddPatient={handleAddPatient} /> : <Navigate to="/login" />} 
        />
        
        <Route 
          path="/patient/:id/*" 
          element={isAuthenticated ? <PatientDashboard patients={patients} updatePatient={handleUpdatePatient} /> : <Navigate to="/login" />} 
        />
      </Routes>
    </HashRouter>
  );
};

export default App;
