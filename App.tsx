
import React, { useState, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Patient } from './types';
import { PatientRegistration, PatientList } from './components/PatientRegistration';
import { PatientDashboard } from './components/PatientDashboard';
import { Card, Input, Button } from './components/UiComponents';
import { Activity, Loader2, CloudOff, CheckCircle2, RefreshCw } from 'lucide-react';
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
  const [syncStatus, setSyncStatus] = useState<'synced' | 'error' | 'syncing'>('synced');
  const [lastSync, setLastSync] = useState<Date | null>(null);
  
  const isUpdatingRef = useRef(false);

  useEffect(() => {
    localStorage.setItem('recmed_auth', String(isAuthenticated));
    if (isAuthenticated) {
      loadData();
      
      // Escuta mudanças em tempo real
      const unsubscribe = subscribeToChanges(() => {
        if (!isUpdatingRef.current) loadData(true);
      });

      // Sincroniza ao voltar para a aba (ex: abriu o celular após fechar o PC)
      const handleFocus = () => loadData(true);
      window.addEventListener('focus', handleFocus);
      
      return () => {
        unsubscribe();
        window.removeEventListener('focus', handleFocus);
      };
    }
  }, [isAuthenticated]);

  const loadData = async (silent = false) => {
    if (isUpdatingRef.current) return;
    
    if (silent) setIsRefreshing(true);
    else setLoading(true);
    
    setSyncStatus('syncing');
    try {
      const data = await getPatients();
      setPatients(data);
      setSyncStatus('synced');
      setLastSync(new Date());
    } catch (err) {
      setSyncStatus('error');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleUpdatePatient = async (updatedPatient: Patient) => {
    isUpdatingRef.current = true;
    // Atualiza UI imediatamente para melhor experiência
    setPatients(prev => prev.map(p => p.id === updatedPatient.id ? updatedPatient : p));
    
    try {
      await savePatient(updatedPatient);
      setSyncStatus('synced');
      setLastSync(new Date());
    } catch (err: any) {
      setSyncStatus('error');
      alert(err.message);
    } finally {
      isUpdatingRef.current = false;
    }
  };

  const handleAddPatient = async (newPatient: Patient) => {
    isUpdatingRef.current = true;
    setPatients(prev => [newPatient, ...prev]);
    try {
      await savePatient(newPatient);
      setSyncStatus('synced');
      setLastSync(new Date());
    } catch (err: any) {
      setSyncStatus('error');
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
      } finally {
        isUpdatingRef.current = false;
      }
    }
  };

  if (isAuthenticated && loading && patients.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center flex-col gap-4">
        <Loader2 className="animate-spin text-blue-600" size={48} />
        <p className="text-slate-500 font-medium">Sincronizando prontuários...</p>
      </div>
    );
  }

  return (
    <HashRouter>
      <div className="fixed top-0 left-0 right-0 z-[100] pointer-events-none">
        {syncStatus === 'syncing' && (
          <div className="bg-blue-600 text-white text-[10px] py-1 px-4 flex justify-center items-center gap-2 animate-pulse">
            <RefreshCw size={10} className="animate-spin" /> Sincronizando com a Nuvem...
          </div>
        )}
        {syncStatus === 'error' && (
          <div className="bg-red-500 text-white text-[10px] py-1 px-4 flex justify-center items-center gap-2 pointer-events-auto">
            <CloudOff size={10} /> Erro de Conexão. <button onClick={() => loadData(true)} className="underline ml-2">Tentar agora</button>
          </div>
        )}
        {syncStatus === 'synced' && lastSync && (
          <div className="bg-green-600 text-white text-[10px] py-1 px-4 flex justify-center items-center gap-2 opacity-0 hover:opacity-100 transition-opacity">
            <CheckCircle2 size={10} /> Última sincronização: {lastSync.toLocaleTimeString()}
          </div>
        )}
      </div>

      <Routes>
        <Route path="/login" element={!isAuthenticated ? <LoginScreen onLogin={() => setIsAuthenticated(true)} /> : <Navigate to="/" />} />
        <Route path="/" element={isAuthenticated ? <PatientList patients={patients} onDelete={handleDeletePatient} onLogout={() => setIsAuthenticated(false)} onImport={loadData as any} onRefresh={() => loadData(true)} isRefreshing={isRefreshing} /> : <Navigate to="/login" />} />
        <Route path="/register" element={isAuthenticated ? <PatientRegistration onAddPatient={handleAddPatient} /> : <Navigate to="/login" />} />
        <Route path="/patient/:id/*" element={isAuthenticated ? <PatientDashboard patients={patients} updatePatient={handleUpdatePatient} /> : <Navigate to="/login" />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
