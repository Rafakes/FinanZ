import { useState, useEffect, FormEvent, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { CreditCard, Plus, Trash2 } from 'lucide-react';
import { useMode } from '../contexts/ModeContext';

interface Card {
  id: string;
  name: string;
  limit_amount: number;
  closing_day: number;
  due_day: number;
  family_id?: string;
}

export function Cards() {
  const { mode, family } = useMode();
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [limit, setLimit] = useState('');
  const [closingDay, setClosingDay] = useState('');
  const [dueDay, setDueDay] = useState('');

  const fetchCards = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('credit_cards').select('*');

      if (mode === 'family' && family) {
        query = query.eq('family_id', family.id);
      } else {
        query = query.is('family_id', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      setCards(data as Card[]);
    } catch (error) {
      console.error('Error fetching cards:', error);
    } finally {
      setLoading(false);
    }
  }, [mode, family]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;

      const { error } = await supabase.from('credit_cards').insert([{
        user_id: user.id,
        family_id: mode === 'family' && family ? family.id : null,
        name,
        limit_amount: parseFloat(limit),
        closing_day: parseInt(closingDay),
        due_day: parseInt(dueDay),
      }]);

      if (error) throw error;
      
      setIsAdding(false);
      setName('');
      setLimit('');
      setClosingDay('');
      setDueDay('');
      fetchCards();
    } catch (error) {
      console.error('Error adding card:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este cartão?')) return;
    try {
      await supabase.from('credit_cards').delete().eq('id', id);
      fetchCards();
    } catch (error) {
      console.error('Error deleting card:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Meus Cartões</h1>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Novo Cartão
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-top-4">
          <h3 className="text-lg font-semibold mb-4">Adicionar Novo Cartão</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Cartão</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-200 outline-none"
                placeholder="Ex: Nubank"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Limite</label>
              <input
                type="number"
                required
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-200 outline-none"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dia Fechamento</label>
              <input
                type="number"
                min="1"
                max="31"
                required
                value={closingDay}
                onChange={(e) => setClosingDay(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-200 outline-none"
                placeholder="Dia"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dia Vencimento</label>
              <input
                type="number"
                min="1"
                max="31"
                required
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-200 outline-none"
                placeholder="Dia"
              />
            </div>
            <div className="md:col-span-2 flex justify-end gap-2 mt-2">
              <button 
                type="button" 
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 text-gray-500 hover:bg-gray-50 rounded-lg"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Salvar Cartão
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => (
          <div key={card.id} className="bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-2xl text-white shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => handleDelete(card.id)}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex justify-between items-start mb-8">
              <CreditCard className="w-8 h-8 text-purple-400" />
              <span className="text-lg font-bold tracking-wider">{card.name}</span>
            </div>
            
            <div className="space-y-1 mb-6">
              <p className="text-xs text-gray-400 uppercase tracking-wider">Limite Disponível</p>
              <p className="text-2xl font-bold">R$ {card.limit_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            
            <div className="flex justify-between text-sm text-gray-300 border-t border-white/10 pt-4">
              <div>
                <p className="text-xs text-gray-500">Fechamento</p>
                <p>Dia {card.closing_day}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Vencimento</p>
                <p>Dia {card.due_day}</p>
              </div>
            </div>
          </div>
        ))}
        
        {cards.length === 0 && !loading && (
          <div className="col-span-full text-center py-12 text-gray-500 bg-white rounded-2xl border border-dashed border-gray-300">
            Nenhum cartão cadastrado.
          </div>
        )}
      </div>
    </div>
  );
}
