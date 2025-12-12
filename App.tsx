import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Patient } from './types';
import { PatientRegistration, PatientList } from './components/PatientRegistration';
import { PatientDashboard } from './components/PatientDashboard';
import { Card, Input, Button } from './components/UiComponents';
import { Activity, Loader2, AlertCircle } from 'lucide-react';
import { getPatients, savePatient, deletePatient } from './services/patientService';

const LoginScreen: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const inputLogin = email.trim().toLowerCase();

    // Case insensitive check for email
    if (
      (inputLogin === 'drmatheusrbc@gmail.com' && password === '150199') ||
      (inputLogin === 'marilia' && password === 'marilia') ||
      (inputLogin === 'marilia@scrp.com' && password === 'marilia')
    ) {
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
          <h1 className="text-3xl font-bold text-slate-800">RecMed</h1>
          <p className="text-slate-500 mt-2">Acesso Médico Restrito</p>
        </div>
        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input 
              label="Email ou Usuário" 
              type="text" 
              placeholder="seu@email.com ou usuario" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
              className="bg-white"
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="username"
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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('recmed_auth') === 'true';
  });

  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncError, setSyncError] = useState('');

  // Persist Auth state
  useEffect(() => {
    localStorage.setItem('recmed_auth', String(isAuthenticated));
  }, [isAuthenticated]);

  // Fetch Patients from Supabase when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const loadData = async () => {
    setLoading(true);
    setSyncError('');
    try {
      const data = await getPatients();
      setPatients(data);
    } catch (err) {
      console.error(err);
      setSyncError('Erro ao carregar dados da nuvem. Verifique sua conexão ou se a tabela "patients" foi criada no Supabase.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPatient = async (newPatient: Patient) => {
    // Optimistic UI update
    setPatients(prev => [newPatient, ...prev]);
    try {
      await savePatient(newPatient);
    } catch (err) {
      setSyncError('Erro ao salvar paciente. Tente novamente.');
      // Rollback could go here, but for simplicity we keep local state and error message
    }
  };

  const handleUpdatePatient = async (updatedPatient: Patient) => {
    setPatients(prev => prev.map(p => p.id === updatedPatient.id ? updatedPatient : p));
    try {
      await savePatient(updatedPatient);
    } catch (err) {
      setSyncError('Erro ao atualizar paciente.');
    }
  };

  const handleDeletePatient = async (id: string) => {
    if(window.confirm('Tem certeza que deseja excluir este paciente e todos os seus dados?')) {
      setPatients(prev => prev.filter(p => p.id !== id));
      try {
        await deletePatient(id);
      } catch (err) {
        setSyncError('Erro ao excluir paciente da nuvem.');
        loadData(); // Reload to restore sync
      }
    }
  };

  const handleImportPatients = async (data: Patient[]) => {
    if (Array.isArray(data)) {
      if (window.confirm(`Isso importará ${data.length} pacientes para o banco de dados na nuvem. Deseja continuar?`)) {
         setLoading(true);
         try {
           // Process in parallel or serial
           for (const p of data) {
             await savePatient(p);
           }
           await loadData(); // Refresh from source of truth
           alert('Importação para nuvem concluída com sucesso!');
         } catch (err) {
           alert('Erro durante a importação. Alguns dados podem não ter sido salvos.');
         } finally {
           setLoading(false);
         }
      }
    } else {
      alert('Formato de arquivo inválido.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  if (isAuthenticated && loading && patients.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center flex-col gap-4">
        <Loader2 className="animate-spin text-blue-600" size={48} />
        <p className="text-slate-500 font-medium">Carregando dados da nuvem...</p>
      </div>
    );
  }

  return (
    <HashRouter>
      {syncError && (
        <div className="bg-red-50 text-red-700 p-3 text-center text-sm flex justify-center items-center gap-2 sticky top-0 z-[100]">
          <AlertCircle size={16} /> {syncError}
          <button onClick={loadData} className="underline ml-2">Tentar Novamente</button>
        </div>
      )}
      <Routes>
        <Route path="/login" element={!isAuthenticated ? <LoginScreen onLogin={() => setIsAuthenticated(true)} /> : <Navigate to="/" />} />
        
        <Route 
          path="/" 
          element={isAuthenticated ? <PatientList patients={patients} onDelete={handleDeletePatient} onLogout={handleLogout} onImport={handleImportPatients} /> : <Navigate to="/login" />} 
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