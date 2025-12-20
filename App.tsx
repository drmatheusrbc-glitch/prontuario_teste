
import React, { useState, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Patient } from './types';
import { PatientRegistration, PatientList } from './components/PatientRegistration';
import { PatientDashboard } from './components/PatientDashboard';
import { Card, Input, Button } from './components/UiComponents';
import { Activity, Loader2, CloudOff, CheckCircle2, RefreshCw, AlertCircle, ShieldAlert, Lock } from 'lucide-react';
import { getPatients, savePatient, deletePatient, subscribeToChanges } from './services/patientService';

const LoginScreen: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Senha única de acesso: 150199
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
                  className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 pl-10 pr-3 py-3 border bg-white text-slate-900 text-lg tracking-widest placeholder:tracking-normal"
                  placeholder="••••••"
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  required 
                />
              </div>
            </div>
            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2 animate-shake">
                <AlertCircle size={16} /> {error}
              </div>
            )}
            <Button className="w-full py-3 text-lg font-bold" type="submit">Entrar no Sistema</Button>
          </form>
        </Card>
        <p className="text-center mt-8 text-slate-400 text-xs">
          Acesso Restrito a Profissionais Autorizados
        </p>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  // Usando sessionStorage para que o login expire ao fechar a aba/janela
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => sessionStorage.getItem('recmed_auth') === 'true');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'error' | 'syncing' | 'conflict' | 'permission_error'>('synced');
  const [lastSync, setLastSync] = useState<Date | null>(null);
  
  const isUpdatingRef = useRef(false);

  useEffect(() => {
    sessionStorage.setItem('recmed_auth', String(isAuthenticated));
    if (isAuthenticated) {
      loadData();
      
      const unsubscribe = subscribeToChanges(() => {
        if (!isUpdatingRef.current) loadData(true);
      });

      const handleFocus = () => loadData(true);
      window.addEventListener('focus', handleFocus);
      
      return () => {
        unsubscribe();
        window.removeEventListener('focus', handleFocus);
      };
    }
  }, [isAuthenticated]);

  const loadData = async (silent = false) => {
    if (isUpdatingRef.current && silent) return;
    
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
    setSyncStatus('syncing');
    
    try {
      const saved = await savePatient(updatedPatient);
      setPatients(prev => prev.map(p => p.id === saved.id ? saved : p));
      setSyncStatus('synced');
      setLastSync(new Date());
    } catch (err: any) {
      if (err.message.includes('CONFLITO')) {
        setSyncStatus('conflict');
        alert(err.message);
        loadData(true);
      } else if (err.message.includes('Permissão')) {
        setSyncStatus('permission_error');
        alert(err.message);
      } else {
        setSyncStatus('error');
        alert("ERRO AO SALVAR NA NUVEM: " + err.message);
      }
      console.error(err);
    } finally {
      isUpdatingRef.current = false;
    }
  };

  const handleAddPatient = async (newPatient: Patient) => {
    isUpdatingRef.current = true;
    setSyncStatus('syncing');
    try {
      const saved = await savePatient(newPatient);
      setPatients(prev => [saved, ...prev]);
      setSyncStatus('synced');
      setLastSync(new Date());
    } catch (err: any) {
      if (err.message.includes('Permissão')) {
        setSyncStatus('permission_error');
      } else {
        setSyncStatus('error');
      }
      alert("ERRO AO CRIAR PACIENTE: " + err.message);
    } finally {
      isUpdatingRef.current = false;
    }
  };

  const handleDeletePatient = async (id: string) => {
    if(window.confirm('Excluir paciente permanentemente?')) {
      isUpdatingRef.current = true;
      try {
        await deletePatient(id);
        setPatients(prev => prev.filter(p => p.id !== id));
        setLastSync(new Date());
        setSyncStatus('synced');
      } catch (err) {
        setSyncStatus('error');
        alert("Erro ao excluir na nuvem.");
      } finally {
        isUpdatingRef.current = false;
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
      <div className="fixed top-0 left-0 right-0 z-[100] pointer-events-none">
        {syncStatus === 'syncing' && (
          <div className="bg-blue-600 text-white text-[10px] py-1 px-4 flex justify-center items-center gap-2 shadow-md">
            <RefreshCw size={10} className="animate-spin" /> Sincronizando...
          </div>
        )}
        {syncStatus === 'conflict' && (
          <div className="bg-orange-500 text-white text-[10px] py-1 px-4 flex justify-center items-center gap-2 shadow-md animate-pulse">
            <AlertCircle size={10} /> Conflito detectado!
          </div>
        )}
        {syncStatus === 'permission_error' && (
          <div className="bg-purple-600 text-white text-[10px] py-1 px-4 flex justify-center items-center gap-2 pointer-events-auto shadow-md">
            <ShieldAlert size={10} /> Erro de Permissão (RLS). Execute as políticas no Supabase.
          </div>
        )}
        {syncStatus === 'error' && (
          <div className="bg-red-500 text-white text-[10px] py-1 px-4 flex justify-center items-center gap-2 pointer-events-auto shadow-md">
            <CloudOff size={10} /> Erro de Conexão. <button onClick={() => loadData(true)} className="underline ml-2 font-bold font-sans">Tentar Novamente</button>
          </div>
        )}
        {syncStatus === 'synced' && lastSync && (
          <div className="bg-green-600/90 text-white text-[10px] py-0.5 px-4 flex justify-center items-center gap-2 opacity-0 hover:opacity-100 transition-opacity">
            <CheckCircle2 size={10} /> Sincronizado: {lastSync.toLocaleTimeString()}
          </div>
        )}
      </div>

      <Routes>
        <Route path="/login" element={!isAuthenticated ? <LoginScreen onLogin={() => setIsAuthenticated(true)} /> : <Navigate to="/" />} />
        <Route path="/" element={isAuthenticated ? <PatientList patients={patients} onDelete={handleDeletePatient} onLogout={() => setIsAuthenticated(false)} onImport={(data) => { setPatients(data); loadData(true); }} onRefresh={() => loadData(true)} isRefreshing={isRefreshing} /> : <Navigate to="/login" />} />
        <Route path="/register" element={isAuthenticated ? <PatientRegistration onAddPatient={handleAddPatient} /> : <Navigate to="/login" />} />
        <Route path="/patient/:id/*" element={isAuthenticated ? <PatientDashboard patients={patients} updatePatient={handleUpdatePatient} /> : <Navigate to="/login" />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
