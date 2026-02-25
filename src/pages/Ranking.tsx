import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useMode } from '../contexts/ModeContext';
import { Trophy, Medal, Award, AlertCircle } from 'lucide-react';
import { startOfMonth, endOfMonth, subMonths, setHours, setMinutes, isBefore, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RankingUser {
  user_id: string;
  points: number;
  full_name: string;
  avatar_url: string | null;
}

export function Ranking() {
  const { family } = useMode();
  const [currentRanking, setCurrentRanking] = useState<RankingUser[]>([]);
  const [lastMonthWinner, setLastMonthWinner] = useState<RankingUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (family) {
      fetchRankings();
    }
  }, [family]);

  const calculatePoints = async (startDate: Date, endDate: Date) => {
    if (!family) return [];

    // Fetch all transactions for the period in this family
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('user_id, points')
      .eq('family_id', family.id)
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString());

    if (error) {
      console.error('Error fetching transactions for ranking:', error);
      return [];
    }

    // Calculate points
    const pointsMap = new Map<string, number>();

    transactions.forEach((tx) => {
      const points = tx.points || 0;
      pointsMap.set(tx.user_id, (pointsMap.get(tx.user_id) || 0) + points);
    });

    // Fetch user profiles
    const userIds = Array.from(pointsMap.keys());
    if (userIds.length === 0) return [];

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', userIds);

    // Combine data
    const ranking: RankingUser[] = userIds.map((userId) => {
      const profile = profiles?.find((p) => p.id === userId);
      return {
        user_id: userId,
        points: pointsMap.get(userId) || 0,
        full_name: profile?.full_name || 'Usuário',
        avatar_url: profile?.avatar_url || null,
      };
    });

    // Sort by points desc
    return ranking.sort((a, b) => b.points - a.points);
  };

  const fetchRankings = async () => {
    setLoading(true);
    try {
      // 1. Current Month Ranking
      // Resets on day 1 (startOfMonth)
      // But actually, it should start from the previous month's cutoff (22:00 of last day)
      const prevMonthLastDay = endOfMonth(subMonths(new Date(), 1));
      const currentStart = setMinutes(setHours(prevMonthLastDay, 22), 0);
      
      // Current cutoff (if it's past 22:00 on the last day, the ranking is closed)
      const currentMonthLastDay = endOfMonth(new Date());
      const currentCutoff = setMinutes(setHours(currentMonthLastDay, 22), 0);
      
      const now = new Date();
      const currentEnd = isBefore(now, currentCutoff) ? now : currentCutoff;

      const current = await calculatePoints(currentStart, currentEnd);
      setCurrentRanking(current);

      // 2. Last Month Winner
      // Closes at 22:00 on last day of month
      const monthBeforeLastDay = endOfMonth(subMonths(new Date(), 2));
      const lastMonthStart = setMinutes(setHours(monthBeforeLastDay, 22), 0);
      
      const lastMonthLastDay = endOfMonth(subMonths(new Date(), 1));
      const lastMonthEnd = setMinutes(setHours(lastMonthLastDay, 22), 0);

      const lastMonthRanking = await calculatePoints(lastMonthStart, lastMonthEnd);
      if (lastMonthRanking.length > 0) {
        setLastMonthWinner(lastMonthRanking[0]);
      } else {
        setLastMonthWinner(null);
      }

    } catch (error) {
      console.error('Error fetching rankings:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Carregando ranking...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-3 mb-8">
        <Trophy className="w-8 h-8 text-yellow-500" />
        <h1 className="text-2xl font-bold text-gray-900">Ranking da Família</h1>
      </div>

      {/* Last Month Winner */}
      {lastMonthWinner && (
        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Trophy className="w-32 h-32 text-yellow-600" />
          </div>
          
          <h2 className="text-sm font-bold text-yellow-700 uppercase tracking-wider mb-6">
            Vencedor de {format(subMonths(new Date(), 1), 'MMMM', { locale: ptBR })}
          </h2>
          
          <div className="flex flex-col items-center gap-4 relative z-10">
            <div className="relative">
              <div className="w-24 h-24 rounded-full border-4 border-yellow-400 p-1 bg-white shadow-xl">
                {lastMonthWinner.avatar_url ? (
                  <img 
                    src={lastMonthWinner.avatar_url} 
                    alt={lastMonthWinner.full_name} 
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-yellow-100 flex items-center justify-center text-3xl font-bold text-yellow-600">
                    {lastMonthWinner.full_name[0]}
                  </div>
                )}
              </div>
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-yellow-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                <Medal className="w-3 h-3" />
                1º Lugar
              </div>
            </div>
            
            <div>
              <h3 className="text-xl font-bold text-gray-900">{lastMonthWinner.full_name}</h3>
              <p className="text-yellow-700 font-medium">{lastMonthWinner.points} pontos</p>
            </div>
          </div>
        </div>
      )}

      {/* Current Ranking */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">Ranking Atual ({format(new Date(), 'MMMM', { locale: ptBR })})</h2>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            Encerra dia {format(endOfMonth(new Date()), 'dd')} às 22:00
          </span>
        </div>
        
        <div className="divide-y divide-gray-50">
          {currentRanking.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p>Nenhuma pontuação registrada neste mês ainda.</p>
              <p className="text-sm mt-1">Adicione despesas ou receitas para ganhar pontos!</p>
            </div>
          ) : (
            currentRanking.map((user, index) => (
              <div key={user.user_id} className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                <div className="w-8 font-bold text-gray-400 text-center">
                  {index + 1}º
                </div>
                
                <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold">
                      {user.full_name[0]}
                    </div>
                  )}
                </div>
                
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{user.full_name}</h3>
                </div>
                
                <div className="text-right">
                  <span className="font-bold text-purple-600 text-lg">{user.points}</span>
                  <span className="text-xs text-gray-500 block">pontos</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      <div className="bg-blue-50 p-4 rounded-xl text-sm text-blue-700 flex gap-3">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <div>
          <p className="font-bold mb-1">Como funciona a pontuação:</p>
          <ul className="list-disc list-inside space-y-1 opacity-90">
            <li>Adicionar despesa ou receita: <strong>+5 pontos</strong></li>
            <li>Despesa recorrente: <strong>+5 pontos</strong> (apenas na criação)</li>
            <li>Remover item: <strong>-5 pontos</strong></li>
          </ul>
        </div>
      </div>
    </div>
  );
}
