import { Home, CreditCard, PieChart, Settings, LogOut, Wallet, ArrowUpCircle, ArrowDownCircle, Menu, User, Users, Plus, Trophy } from 'lucide-react';
import { cn } from '../lib/utils';
import { useState, FormEvent, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { NewTransactionModal } from './NewTransactionModal';
import { DatabaseSetupModal } from './DatabaseSetupModal';
import { Link, useLocation } from 'react-router-dom';
import { useMode } from '../contexts/ModeContext';
import { startOfMonth } from 'date-fns';

interface SidebarProps {
  onTransactionSuccess?: () => void;
}

export function Sidebar({ onTransactionSuccess }: SidebarProps) {
  const { mode, setMode, family, createFamily } = useMode();
  const [isOpen, setIsOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isCreateFamilyModalOpen, setIsCreateFamilyModalOpen] = useState(false);
  const [isDatabaseSetupModalOpen, setIsDatabaseSetupModalOpen] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState('');
  const [creating, setCreating] = useState(false);
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleCreateFamily = async (e: FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await createFamily(newFamilyName);
      setIsCreateFamilyModalOpen(false);
      setNewFamilyName('');
    } catch (error: any) {
      console.error('Create family error:', error);
      // Check for various "table not found" or RLS recursion error messages
      if (
        error.message?.includes('Could not find the table') || 
        error.message?.includes('relation "public.families" does not exist') ||
        error.message?.includes('relation "public.family_members" does not exist') ||
        error.message?.includes('infinite recursion') ||
        error.code === '42P01' || // undefined_table
        error.code === '42P17'    // infinite_recursion
      ) {
        setIsDatabaseSetupModalOpen(true);
        setIsCreateFamilyModalOpen(false);
      } else {
        alert(`Erro ao criar família: ${error.message || 'Erro desconhecido'}`);
      }
    } finally {
      setCreating(false);
    }
  };

  const menuItems = [
    { icon: Home, label: 'Dashboard', path: '/dashboard' },
    { icon: Wallet, label: 'Carteira', path: '/wallet' },
    { icon: ArrowUpCircle, label: 'Receitas', path: '/incomes' },
    { icon: ArrowDownCircle, label: 'Despesas', path: '/expenses' },
    { icon: CreditCard, label: 'Cartões', path: '/cards' },
    { icon: PieChart, label: 'Relatórios', path: '/reports' },
    { icon: Settings, label: 'Configurações', path: '/settings' },
  ];

  // Add Ranking to menu if in family mode
  if (mode === 'family') {
    // Insert Ranking before Settings (last item)
    menuItems.splice(menuItems.length - 1, 0, { icon: Trophy, label: 'Ranking', path: '/ranking' });
  }

  return (
    <>
      <NewTransactionModal 
        isOpen={isTransactionModalOpen} 
        onClose={() => setIsTransactionModalOpen(false)} 
        onSuccess={() => {
          if (onTransactionSuccess) onTransactionSuccess();
        }}
      />

      {/* Mobile Header for Menu Toggle */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b z-50 flex items-center px-4 justify-between">
        <Link to="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                Z
            </div>
            <span className="font-bold text-lg tracking-tight">FinanZ</span>
        </Link>
        <button onClick={() => setIsOpen(!isOpen)} className="p-2">
          <Menu className="w-6 h-6 text-gray-600" />
        </button>
      </div>

      {/* Sidebar Container */}
      <aside className={cn(
        "fixed md:sticky top-0 left-0 h-screen bg-white border-r border-gray-100 flex flex-col transition-transform duration-300 z-40 w-64",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        "pt-16 md:pt-0" // Add padding top on mobile to account for header
      )}>
        <Link to="/dashboard" className="p-6 hidden md:flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-purple-200">
            Z
          </div>
          <span className="font-bold text-2xl text-gray-900 tracking-tight">FinanZ</span>
        </Link>

        {/* Mode Switcher */}
        <div className="px-4 mb-4">
          <div className="bg-gray-100 p-1 rounded-lg flex">
            <button
              onClick={() => setMode('personal')}
              className={cn(
                "flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2",
                mode === 'personal' 
                  ? "bg-white text-gray-900 shadow-sm" 
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              <User className="w-4 h-4" />
              Pessoal
            </button>
            <button
              onClick={() => {
                if (!family) {
                  setIsCreateFamilyModalOpen(true);
                } else {
                  setMode('family');
                }
              }}
              className={cn(
                "flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2",
                mode === 'family' 
                  ? "bg-white text-gray-900 shadow-sm" 
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              <Users className="w-4 h-4" />
              Família
            </button>
          </div>
        </div>

        <div className="px-4">
            <button 
              onClick={() => setIsTransactionModalOpen(true)}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl py-3 px-4 flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-200 mb-6"
            >
                <span className="text-2xl font-light">+</span>
                <span className="font-medium">Nova transação</span>
            </button>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          {menuItems.map((item, index) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={index}
                to={item.path}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-medium",
                  isActive 
                    ? "bg-purple-50 text-purple-600" 
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive ? "text-purple-600" : "text-gray-400")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors text-sm font-medium"
          >
            <LogOut className="w-5 h-5" />
            Sair
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Create Family Modal */}
      {isCreateFamilyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Criar Família</h2>
            <p className="text-gray-600 mb-6">
              Crie um espaço compartilhado para gerenciar finanças com outras pessoas.
            </p>
            
            <form onSubmit={handleCreateFamily}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Família</label>
                <input
                  type="text"
                  required
                  value={newFamilyName}
                  onChange={(e) => setNewFamilyName(e.target.value)}
                  placeholder="Ex: Família Silva"
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-200 outline-none"
                />
              </div>
              
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setIsCreateFamilyModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium flex items-center gap-2"
                >
                  {creating ? 'Criando...' : 'Criar Família'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DatabaseSetupModal 
        isOpen={isDatabaseSetupModalOpen} 
        onClose={() => setIsDatabaseSetupModalOpen(false)} 
      />
    </>
  );
}
