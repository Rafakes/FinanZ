import { useState, useEffect, useCallback } from 'react';
import { SummaryCard } from '../components/SummaryCard';
import { ExpenseDonutChart, BalanceBarChart } from '../components/Charts';
import { ArrowRight, ArrowUp, ArrowDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { startOfMonth, endOfMonth, format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { useSettings } from '../contexts/SettingsContext';
import { useMode } from '../contexts/ModeContext';

// Types
interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  name: string;
  date: string;
  family_id?: string;
}

interface ChartData {
  expenseData: { name: string; value: number; color: string }[];
  balanceData: { name: string; income: number; expense: number }[];
}

interface DashboardContextType {
  currentDate: Date;
}

export function Dashboard() {
  const { currentDate } = useOutletContext<DashboardContextType>();
  const { formatMoney } = useSettings();
  const { mode, family } = useMode();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState({
    balance: 0,
    income: 0,
    expense: 0,
    incomeTrend: '0%',
    expenseTrend: '0%',
  });
  const [chartData, setChartData] = useState<ChartData>({
    expenseData: [],
    balanceData: [],
  });

  const fetchData = useCallback(async () => {
    try {
      const startCurrent = startOfMonth(currentDate);
      const endCurrent = endOfMonth(currentDate);
      
      // Fetch data for chart history (last 6 months) which includes current and previous month
      const startHistory = startOfMonth(subMonths(currentDate, 5));
      
      let query = supabase
        .from('transactions')
        .select('*')
        .gte('date', startHistory.toISOString())
        .lte('date', endCurrent.toISOString())
        .order('date', { ascending: false });

      if (mode === 'family' && family) {
        query = query.eq('family_id', family.id);
      } else {
        query = query.is('family_id', null);
      }

      const { data, error } = await query;

      if (error) throw error;

      const allTxs = data as Transaction[];

      // Filter for current month
      const currentMonthTxs = allTxs.filter(t => {
        const d = new Date(t.date);
        return d >= startCurrent && d <= endCurrent;
      });

      setTransactions(currentMonthTxs);

      // Filter for previous month
      const startPrevious = startOfMonth(subMonths(currentDate, 1));
      const endPrevious = endOfMonth(subMonths(currentDate, 1));
      
      const prevMonthTxs = allTxs.filter(t => {
        const d = new Date(t.date);
        return d >= startPrevious && d <= endPrevious;
      });

      // Calculate Current Totals
      const currentIncome = currentMonthTxs
        .filter(t => t.type === 'income')
        .reduce((acc, curr) => acc + curr.amount, 0);
      
      const currentExpense = currentMonthTxs
        .filter(t => t.type === 'expense')
        .reduce((acc, curr) => acc + curr.amount, 0);

      // Calculate Previous Totals
      const prevIncome = prevMonthTxs
        .filter(t => t.type === 'income')
        .reduce((acc, curr) => acc + curr.amount, 0);
      
      const prevExpense = prevMonthTxs
        .filter(t => t.type === 'expense')
        .reduce((acc, curr) => acc + curr.amount, 0);

      // Calculate Trends
      const calculateTrend = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? '+100%' : '0%';
        const percent = ((current - previous) / previous) * 100;
        return `${percent > 0 ? '+' : ''}${percent.toFixed(0)}%`;
      };

      setSummary({
        balance: currentIncome - currentExpense,
        income: currentIncome,
        expense: currentExpense,
        incomeTrend: calculateTrend(currentIncome, prevIncome),
        expenseTrend: calculateTrend(currentExpense, prevExpense),
      });

      // Calculate Expense Chart Data (Current Month)
      const expensesByCategory = currentMonthTxs
        .filter(t => t.type === 'expense')
        .reduce((acc, curr) => {
          acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
          return acc;
        }, {} as Record<string, number>);

      const categoryColors: Record<string, string> = {
        mercado: '#0ea5e9', // Sky blue
        lazer: '#8b5cf6', // Violet
        veiculo: '#ec4899', // Pink
        casa: '#f59e0b', // Amber
        educacao: '#10b981', // Emerald
        outros: '#94a3b8', // Slate
      };

      const expenseChartData = Object.entries(expensesByCategory).map(([name, value]) => ({
        name,
        value,
        color: categoryColors[name.toLowerCase()] || '#94a3b8',
      }));

      // Calculate Balance Chart Data (Last 6 months)
      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const balanceChartData = [];
      
      for (let i = 5; i >= 0; i--) {
        const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const monthName = months[d.getMonth()];
        
        const monthlyTxs = allTxs.filter(t => {
          const txDate = new Date(t.date);
          return txDate.getMonth() === d.getMonth() && txDate.getFullYear() === d.getFullYear();
        });

        const monthlyIncome = monthlyTxs
          .filter(t => t.type === 'income')
          .reduce((acc, curr) => acc + curr.amount, 0);
          
        const monthlyExpense = monthlyTxs
          .filter(t => t.type === 'expense')
          .reduce((acc, curr) => acc + curr.amount, 0);

        balanceChartData.push({
          name: monthName,
          income: monthlyIncome,
          expense: monthlyExpense,
        });
      }

      setChartData({
        expenseData: expenseChartData,
        balanceData: balanceChartData,
      });

    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }, [currentDate, mode, family]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-8 pb-24 md:pb-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          Dashboard {mode === 'family' && family ? `(${family.name})` : ''}
        </h1>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <SummaryCard 
          title="Saldo atual" 
          amount={formatMoney(summary.balance)}
          type="balance" 
        />
        <SummaryCard 
          title="Receitas" 
          amount={formatMoney(summary.income)}
          type="income" 
          trend={summary.incomeTrend}
        />
        <SummaryCard 
          title="Despesas" 
          amount={formatMoney(summary.expense)}
          type="expense" 
          trend={summary.expenseTrend}
        />
        <SummaryCard 
          title="Cartão de crédito" 
          amount={formatMoney(0)}
          type="credit" 
        />
      </div>

      {/* Performance Link */}
      <div 
        onClick={() => navigate('/reports')}
        className="flex items-center gap-2 group cursor-pointer w-fit"
      >
        <span className="text-purple-600 font-medium group-hover:underline">Meu Desempenho</span>
        <ArrowRight className="w-4 h-4 text-purple-600 transition-transform group-hover:translate-x-1" />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-auto lg:h-[400px]">
        <ExpenseDonutChart data={chartData.expenseData} />
        <BalanceBarChart data={chartData.balanceData} />
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-800">Transações de {format(currentDate, 'MMMM', { locale: ptBR })}</h3>
            <button 
              onClick={() => navigate('/wallet')}
              className="text-sm text-purple-600 font-medium hover:underline"
            >
              Ver todas
            </button>
        </div>

        <div className="divide-y divide-gray-50">
            {transactions.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                {mode === 'family' 
                  ? 'Nenhuma transação familiar encontrada neste mês.' 
                  : 'Nenhuma transação encontrada neste mês.'}
              </div>
            ) : (
              transactions.slice(0, 5).map((tx) => (
                <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                            {tx.type === 'income' ? <ArrowUp className="w-5 h-5" /> : <ArrowDown className="w-5 h-5" />}
                        </div>
                        <div>
                            <p className="font-medium text-gray-900">{tx.name}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(tx.date).toLocaleDateString('pt-BR', { 
                                day: '2-digit', 
                                month: 'short', 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </p>
                        </div>
                    </div>
                    <span className={`font-semibold ${tx.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.type === 'income' ? '+' : '-'} {formatMoney(tx.amount).replace('R$', '').trim()}
                    </span>
                </div>
              ))
            )}
        </div>
      </div>
    </div>
  );
}
