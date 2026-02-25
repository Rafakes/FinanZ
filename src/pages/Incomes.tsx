import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { useOutletContext } from 'react-router-dom';
import { ArrowUp, Trash2, Edit2 } from 'lucide-react';
import { useMode } from '../contexts/ModeContext';

interface Transaction {
  id: string;
  type: 'income';
  amount: number;
  category: string;
  name: string;
  date: string;
  description?: string;
  family_id?: string;
}

interface DashboardContextType {
  currentDate: Date;
}

export function Incomes() {
  const { currentDate } = useOutletContext<DashboardContextType>();
  const { mode, family } = useMode();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchIncomes = useCallback(async () => {
    setLoading(true);
    try {
      const start = startOfMonth(currentDate).toISOString();
      const end = endOfMonth(currentDate).toISOString();

      let query = supabase
        .from('transactions')
        .select('*')
        .eq('type', 'income')
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: false });

      if (mode === 'family' && family) {
        query = query.eq('family_id', family.id);
      } else {
        query = query.is('family_id', null);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTransactions(data as Transaction[]);
    } catch (error) {
      console.error('Error fetching incomes:', error);
    } finally {
      setLoading(false);
    }
  }, [currentDate, mode, family]);

  useEffect(() => {
    fetchIncomes();
  }, [fetchIncomes]);

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta receita?')) return;
    
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
      fetchIncomes();
    } catch (error) {
      console.error('Error deleting transaction:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Receitas</h1>
        <div className="bg-green-100 text-green-700 px-4 py-2 rounded-lg font-medium">
          Total: R$ {transactions.reduce((acc, curr) => acc + curr.amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </div>
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
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">Nenhuma receita encontrada neste mês.</td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                          <ArrowUp className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{tx.name}</p>
                          {tx.description && <p className="text-xs text-gray-400">{tx.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 capitalize">{tx.category}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {new Date(tx.date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 font-medium text-green-600">
                      R$ {tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
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
