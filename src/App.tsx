import { useEffect, useState, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Loader2 } from 'lucide-react';
import { AuthPage } from './pages/AuthPage';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js';
import { BrowserRouter, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { Wallet } from './pages/Wallet';
import { Incomes } from './pages/Incomes';
import { Expenses } from './pages/Expenses';
import { Cards } from './pages/Cards';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { Ranking } from './pages/Ranking';
import { SettingsProvider } from './contexts/SettingsContext';
import { ModeProvider } from './contexts/ModeContext';

import { LandingPage } from './pages/LandingPage';

function Layout() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [transactionSuccess, setTransactionSuccess] = useState(0);
  
  const handleTransactionSuccess = useCallback(() => {
    setTransactionSuccess(prev => prev + 1);
  }, []);
  
  return (
    <div className="min-h-screen bg-gray-50 flex font-sans text-gray-900">
      <Sidebar onTransactionSuccess={handleTransactionSuccess} />
      
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header 
          currentDate={currentDate} 
          onDateChange={setCurrentDate} 
          transactionSuccess={transactionSuccess}
        />
        
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet context={{ currentDate }} />
        </div>
      </main>
    </div>
  );
}

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
      </div>
    );
  }

  return (
    <SettingsProvider>
      <ModeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={session ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
            <Route path="/login" element={session ? <Navigate to="/dashboard" replace /> : <AuthPage />} />
            
            {/* Protected Routes */}
            <Route element={session ? <Layout /> : <Navigate to="/login" replace />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/wallet" element={<Wallet />} />
              <Route path="/incomes" element={<Incomes />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/cards" element={<Cards />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/ranking" element={<Ranking />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ModeProvider>
    </SettingsProvider>
  );
}

export default App;
