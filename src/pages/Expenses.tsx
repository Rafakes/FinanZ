import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { startOfMonth, endOfMonth } from 'date-fns';
import { useOutletContext } from 'react-router-dom';
import { ArrowDown, Trash2, Edit2, Repeat } from 'lucide-react';
import { cn } from '../lib/utils';
import { NewTransactionModal } from '../components/NewTransactionModal';
import { useMode } from '../contexts/ModeContext';

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  name: string;
  date: string;
  description?: string;
  is_recurring?: boolean;
  family_id?: string;
}

interface DashboardContextType {
  currentDate: Date;
}

export function Expenses() {
  const { currentDate } = useOutletContext<DashboardContextType>();
  const { mode, family } = useMode();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'recurring'>('all');
  
  // Edit state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const start = startOfMonth(currentDate).toISOString();
      const end = endOfMonth(currentDate).toISOString();

      let query = supabase
        .from('transactions')
        .select('*')
        .eq('type', 'expense')
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: false });

      if (mode === 'family' && family) {
        query = query.eq('family_id', family.id);
      } else {
        query = query.is('family_id', null);
      }

      if (activeTab === 'recurring') {
        query = query.eq('is_recurring', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTransactions(data as Transaction[]);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  }, [currentDate, activeTab, mode, family]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta despesa?')) return;
    
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
      
      // Optimistic update or refetch
      setTransactions(prev => prev.filter(tx => tx.id !== id));
      fetchExpenses(); // Refetch to ensure sync
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert('Erro ao excluir. Verifique suas permissões.');
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setTransactionToEdit(transaction);
    setIsEditModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <NewTransactionModal 
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setTransactionToEdit(null);
        }}
        onSuccess={fetchExpenses}
        transactionToEdit={transactionToEdit}
      />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Despesas</h1>
        <div className="bg-red-100 text-red-700 px-4 py-2 rounded-lg font-medium">
          Total: R$ {transactions.reduce((acc, curr) => acc + curr.amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('all')}
          className={cn(
            "px-4 py-2 text-sm font-medium transition-colors relative",
            activeTab === 'all' 
              ? "text-purple-600" 
              : "text-gray-500 hover:text-gray-700"
          )}
        >
          Todas
          {activeTab === 'all' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600 rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('recurring')}
          className={cn(
            "px-4 py-2 text-sm font-medium transition-colors relative flex items-center gap-2",
            activeTab === 'recurring' 
              ? "text-purple-600" 
              : "text-gray-500 hover:text-gray-700"
          )}
        >
          <Repeat className="w-4 h-4" />
          Recorrentes
          {activeTab === 'recurring' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600 rounded-t-full" />
          )}
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-semibold text-gray-700">Nome</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Categoria</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Data</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Valor</th>
                <th className="px-6 py-4 font-semibold text-gray-700 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">Carregando...</td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    {activeTab === 'recurring' 
                      ? 'Nenhuma despesa recorrente encontrada neste mês.' 
                      : 'Nenhuma despesa encontrada neste mês.'}
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                          <ArrowDown className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 flex items-center gap-2">
                            {tx.name}
                            {tx.is_recurring && <Repeat className="w-3 h-3 text-purple-500" />}
                          </p>
                          {tx.description && <p className="text-xs text-gray-400">{tx.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 capitalize">{tx.category}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {new Date(tx.date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 font-medium text-red-600">
                      R$ {tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleEdit(tx)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(tx.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
