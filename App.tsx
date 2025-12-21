
import React, { useState, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Patient } from './types';
import { PatientRegistration, PatientList } from './components/PatientRegistration';
import { PatientDashboard } from './components/PatientDashboard';
import { Card, Button } from './components/UiComponents';
import { Activity, Loader2, AlertCircle, Lock } from 'lucide-react';
import { getPatients, savePatient, deletePatient } from './services/patientService';

const LoginScreen: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim() === '150199') {
      onLogin();
    } else {
      setError('Senha incorreta.');
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="bg-blue-600 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200">
            <Activity className="text-white" size={40} />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">RecMed</h1>
          <p className="text-slate-500 mt-2">Gestão Clínica e Prontuário</p>
        </div>
        <Card className="shadow-xl border-t-4 border-t-blue-600">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700 ml-1">Senha de Acesso</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock size={18} />
                </div>
                <input 
                  type="password" 
                  autoFocus
                  className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 pl-10 pr-3 py-3 border bg-white text-slate-900 text-lg tracking-widest"
                  placeholder="••••••"
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  required 
                />
              </div>
            </div>
            {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2"><AlertCircle size={16} /> {error}</div>}
            <Button className="w-full py-3 text-lg font-bold" type="submit">Entrar no Sistema</Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => sessionStorage.getItem('recmed_auth') === 'true');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const isUpdatingRef = useRef(false);

  useEffect(() => {
    sessionStorage.setItem('recmed_auth', String(isAuthenticated));
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const loadData = async (manual = false) => {
    if (manual) setIsRefreshing(true);
    else setLoading(true);
    
    try {
      const data = await getPatients();
      setPatients(data);
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleUpdatePatient = async (updatedPatient: Patient) => {
    isUpdatingRef.current = true;
    try {
      const saved = await savePatient(updatedPatient);
      setPatients(prev => prev.map(p => p.id === saved.id ? saved : p));
    } catch (err: any) {
      alert("Erro ao salvar: " + err.message);
    } finally {
      isUpdatingRef.current = false;
    }
  };

  const handleAddPatient = async (newPatient: Patient) => {
    isUpdatingRef.current = true;
    try {
      const saved = await savePatient(newPatient);
      setPatients(prev => [saved, ...prev]);
    } catch (err: any) {
      alert("Erro ao criar: " + err.message);
    } finally {
      isUpdatingRef.current = false;
    }
  };

  const handleDeletePatient = async (id: string) => {
    if(window.confirm('Excluir paciente definitivamente?')) {
      await deletePatient(id);
      setPatients(prev => prev.filter(p => p.id !== id));
    }
  };

  if (isAuthenticated && loading && patients.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center flex-col gap-4">
        <Loader2 className="animate-spin text-blue-600" size={48} />
        <p className="text-slate-500 font-medium">Carregando Prontuários...</p>
      </div>
    );
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={!isAuthenticated ? <LoginScreen onLogin={() => setIsAuthenticated(true)} /> : <Navigate to="/" />} />
        <Route path="/" element={isAuthenticated ? <PatientList patients={patients} onDelete={handleDeletePatient} onLogout={() => setIsAuthenticated(false)} onImport={(data) => { setPatients(data); }} onRefresh={() => loadData(true)} isRefreshing={isRefreshing} /> : <Navigate to="/login" />} />
        <Route path="/register" element={isAuthenticated ? <PatientRegistration onAddPatient={handleAddPatient} /> : <Navigate to="/login" />} />
        <Route path="/patient/:id/*" element={isAuthenticated ? <PatientDashboard patients={patients} updatePatient={handleUpdatePatient} /> : <Navigate to="/login" />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
