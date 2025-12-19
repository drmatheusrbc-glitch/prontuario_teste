
import React, { useState, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Patient } from './types';
import { PatientRegistration, PatientList } from './components/PatientRegistration';
import { PatientDashboard } from './components/PatientDashboard';
import { Card, Input, Button } from './components/UiComponents';
import { Activity, Loader2, CloudOff, CheckCircle2 } from 'lucide-react';
import { getPatients, savePatient, deletePatient, subscribeToChanges } from './services/patientService';

const LoginScreen: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const valid = [
      { user: 'drmatheusrbc@gmail.com', pass: '150199' },
      { user: 'marilia', pass: 'marilia' },
      { user: 'marilia@scrp.com', pass: 'marilia' }
    ].some(c => c.user === email.trim().toLowerCase() && c.pass === password.trim());

    if (valid) onLogin();
    else setError('Email ou senha incorretos.');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Activity className="mx-auto text-blue-600 mb-4" size={48} />
          <h1 className="text-3xl font-bold text-slate-800">RecMed</h1>
        </div>
        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input label="Email ou Usuário" value={email} onChange={e => setEmail(e.target.value)} required />
            <Input label="Senha" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <Button className="w-full" type="submit">Entrar</Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => localStorage.getItem('recmed_auth') === 'true');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [lastSync, setLastSync] = useState<Date | null>(null);
  
  // Ref para evitar loops de atualização
  const isUpdatingRef = useRef(false);

  // Efeito de Autenticação e Carga Inicial
  useEffect(() => {
    localStorage.setItem('recmed_auth', String(isAuthenticated));
    if (isAuthenticated) {
      loadData();
      
      // ATIVA SINCRONIZAÇÃO EM TEMPO REAL
      const unsubscribe = subscribeToChanges(() => {
        if (!isUpdatingRef.current) {
          loadData(true); // Refresh silencioso
        }
      });
      
      return () => unsubscribe();
    }
  }, [isAuthenticated]);

  const loadData = async (silent = false) => {
    if (silent) setIsRefreshing(true);
    else setLoading(true);
    
    setSyncError('');
    try {
      const data = await getPatients();
      setPatients(data);
      setLastSync(new Date());
    } catch (err: any) {
      setSyncError("Erro ao conectar com a nuvem. Usando dados locais.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleAddPatient = async (newPatient: Patient) => {
    isUpdatingRef.current = true;
    // Update UI first
    setPatients(prev => [newPatient, ...prev]);
    try {
      await savePatient(newPatient);
      setLastSync(new Date());
    } catch (err: any) {
      setSyncError(err.message);
    } finally {
      isUpdatingRef.current = false;
    }
  };

  const handleUpdatePatient = async (updatedPatient: Patient) => {
    isUpdatingRef.current = true;
    setPatients(prev => prev.map(p => p.id === updatedPatient.id ? updatedPatient : p));
    try {
      await savePatient(updatedPatient);
      setLastSync(new Date());
    } catch (err: any) {
      setSyncError(err.message);
    } finally {
      isUpdatingRef.current = false;
    }
  };

  const handleDeletePatient = async (id: string) => {
    if(window.confirm('Excluir paciente permanentemente?')) {
      isUpdatingRef.current = true;
      setPatients(prev => prev.filter(p => p.id !== id));
      try {
        await deletePatient(id);
        setLastSync(new Date());
      } catch (err) {
        console.error(err);
      } finally {
        isUpdatingRef.current = false;
      }
    }
  };

  const handleImportPatients = async (data: Patient[]) => {
    if (Array.isArray(data)) {
      setLoading(true);
      try {
        for (const p of data) {
          await savePatient(p);
        }
        await loadData();
      } catch (err) {
        alert('Erro na importação.');
      } finally {
        setLoading(false);
      }
    }
  };

  if (isAuthenticated && loading && patients.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center flex-col gap-4">
        <Loader2 className="animate-spin text-blue-600" size={48} />
        <p className="text-slate-500 font-medium">Conectando ao banco de dados...</p>
      </div>
    );
  }

  return (
    <HashRouter>
      {syncError ? (
        <div className="bg-amber-50 text-amber-800 border-b border-amber-200 p-2 text-center text-sm flex justify-center items-center gap-2 sticky top-0 z-[100] animate-pulse">
          <CloudOff size={16} /> 
          <span>{syncError}</span>
          <button onClick={() => loadData(true)} className="underline ml-2 font-bold">Tentar novamente</button>
        </div>
      ) : lastSync && (
        <div className="bg-blue-600 text-white p-1 text-[10px] text-center flex justify-center items-center gap-1 sticky top-0 z-[100] opacity-80">
          <CheckCircle2 size={10} /> Sincronizado: {lastSync.toLocaleTimeString()}
        </div>
      )}
      
      <Routes>
        <Route path="/login" element={!isAuthenticated ? <LoginScreen onLogin={() => setIsAuthenticated(true)} /> : <Navigate to="/" />} />
        <Route path="/" element={isAuthenticated ? <PatientList patients={patients} onDelete={handleDeletePatient} onLogout={() => setIsAuthenticated(false)} onImport={handleImportPatients} onRefresh={() => loadData(true)} isRefreshing={isRefreshing} /> : <Navigate to="/login" />} />
        <Route path="/register" element={isAuthenticated ? <PatientRegistration onAddPatient={handleAddPatient} /> : <Navigate to="/login" />} />
        <Route path="/patient/:id/*" element={isAuthenticated ? <PatientDashboard patients={patients} updatePatient={handleUpdatePatient} /> : <Navigate to="/login" />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
