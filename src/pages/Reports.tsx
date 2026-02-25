import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { startOfYear, endOfYear, format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useMode } from '../contexts/ModeContext';

export function Reports() {
  const { mode, family } = useMode();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const start = startOfYear(new Date()).toISOString();
        const end = endOfYear(new Date()).toISOString();

        let query = supabase
          .from('transactions')
          .select('*')
          .gte('date', start)
          .lte('date', end);

        if (mode === 'family' && family) {
          query = query.eq('family_id', family.id);
        } else {
          query = query.is('family_id', null);
        }

        const { data: transactions, error } = await query;

        if (error) throw error;

        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const chartData = months.map((month, index) => {
          const monthlyTxs = transactions.filter(t => new Date(t.date).getMonth() === index);
          const income = monthlyTxs.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
          const expense = monthlyTxs.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
          return {
            name: month,
            Receitas: income,
            Despesas: expense,
            Saldo: income - expense
          };
        });

        setData(chartData);
      } catch (error) {
        console.error('Error fetching reports:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [mode, family]);


  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Relatório Anual</h1>
      
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-[500px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
            <Tooltip 
              cursor={{ fill: '#f8fafc' }}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`}
            />
            <Legend />
            <Bar dataKey="Receitas" fill="#22c55e" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
