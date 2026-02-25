import { useState, useEffect, FormEvent } from 'react';
import { X, ArrowUpCircle, ArrowDownCircle, Check, Loader2, Repeat } from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { addMonths } from 'date-fns';
import { useMode } from '../contexts/ModeContext';

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  name: string;
  description?: string;
  date: string;
  is_recurring?: boolean;
}

interface NewTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  transactionToEdit?: Transaction | null;
}

type TransactionType = 'income' | 'expense' | null;

export function NewTransactionModal({ isOpen, onClose, onSuccess, transactionToEdit }: NewTransactionModalProps) {
  const { mode, family } = useMode();
  const [type, setType] = useState<TransactionType>(null);
  const [loading, setLoading] = useState(false);
  
  // Form states
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  
  // Recurring state
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringMonths, setRecurringMonths] = useState('12');

  // Reset state when modal opens/closes or transactionToEdit changes
  useEffect(() => {
    if (isOpen) {
      if (transactionToEdit) {
        setType(transactionToEdit.type);
        setAmount(transactionToEdit.amount.toString());
        setCategory(transactionToEdit.category);
        setName(transactionToEdit.name);
        setDescription(transactionToEdit.description || '');
        setIsRecurring(transactionToEdit.is_recurring || false);
        setRecurringMonths('12'); // Default, as we probably don't want to edit the recurrence logic for existing ones easily without complex logic
      } else {
        setType(null);
        setAmount('');
        setCategory('');
        setName('');
        setDescription('');
        setIsRecurring(false);
        setRecurringMonths('12');
      }
    }
  }, [isOpen, transactionToEdit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');

      const transactionData = {
        user_id: user.id,
        family_id: mode === 'family' && family ? family.id : null,
        type,
        amount: parseFloat(amount.replace(',', '.')),
        category,
        name,
        description: isRecurring && !transactionToEdit ? `Parcela 1/${recurringMonths}` : description,
        date: transactionToEdit ? transactionToEdit.date : new Date().toISOString(), // Keep original date if editing
        is_recurring: isRecurring,
        points: 5, // Default for single transaction or first installment
      };

      if (transactionToEdit) {
        // Update existing transaction
        const { error } = await supabase
          .from('transactions')
          .update(transactionData)
          .eq('id', transactionToEdit.id);

        if (error) throw error;
      } else {
        // Create new transaction(s)
        const baseDate = new Date();
        const transactionsToInsert = [];
        const numMonths = isRecurring ? parseInt(recurringMonths) : 1;

        for (let i = 0; i < numMonths; i++) {
          const date = addMonths(baseDate, i);
          
          transactionsToInsert.push({
            ...transactionData,
            date: date.toISOString(),
            description: type === 'income' ? description : (isRecurring ? `Parcela ${i + 1}/${numMonths}` : ''),
            points: i === 0 ? 5 : 0, // Only first installment gets points
          });
        }

        const { error } = await supabase
          .from('transactions')
          .insert(transactionsToInsert);

        if (error) throw error;
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving transaction:', error);
      alert('Erro ao salvar transação.');
    } finally {
      setLoading(false);
    }
  };

  const expenseCategories = [
    { id: 'mercado', label: 'Mercado' },
    { id: 'lazer', label: 'Lazer' },
    { id: 'veiculo', label: 'Veículo' },
    { id: 'casa', label: 'Casa' },
    { id: 'educacao', label: 'Educação' },
    { id: 'outros', label: 'Outros' },
  ];

  const incomeCategories = [
    { id: 'salario', label: 'Salário' },
    { id: 'investimento', label: 'Investimento' },
    { id: 'poupanca', label: 'Poupança' },
    { id: 'reserva', label: 'Reserva' },
    { id: 'outros', label: 'Outros' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h2 className="text-lg font-semibold text-gray-900">
            {transactionToEdit 
              ? 'Editar Transação' 
              : type === null 
                ? 'Nova Transação' 
                : type === 'income' 
                  ? 'Nova Receita' 
                  : 'Nova Despesa'
            }
          </h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {type === null ? (
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setType('income')}
                className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-gray-100 hover:border-green-500 hover:bg-green-50 transition-all group"
              >
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ArrowUpCircle className="w-6 h-6 text-green-600" />
                </div>
                <span className="font-medium text-gray-700 group-hover:text-green-700">Receita</span>
              </button>

              <button
                onClick={() => setType('expense')}
                className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-gray-100 hover:border-red-500 hover:bg-red-50 transition-all group"
              >
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ArrowDownCircle className="w-6 h-6 text-red-600" />
                </div>
                <span className="font-medium text-gray-700 group-hover:text-red-700">Despesa</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Fields based on type */}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all"
                  placeholder={type === 'income' ? "Ex: Salário Mensal" : "Ex: Aluguel"}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição <span className="text-gray-400 font-normal">(opcional)</span></label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all"
                  placeholder="Detalhes adicionais"
                />
              </div>


              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">R$</span>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all"
                    placeholder="0,00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                <select
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all bg-white"
                >
                  <option value="" disabled>Selecione uma categoria</option>
                  {(type === 'income' ? incomeCategories : expenseCategories).map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex items-center h-5">
                  <input
                    id="recurring"
                    type="checkbox"
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                </div>
                <div className="flex-1">
                  <label htmlFor="recurring" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Repeat className="w-4 h-4 text-gray-500" />
                    Transação Recorrente
                  </label>
                </div>
              </div>

              {isRecurring && (
                <div className="animate-in slide-in-from-top-2 fade-in duration-200">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Repetir por quantos meses?</label>
                  <input
                    type="number"
                    min="2"
                    max="60"
                    value={recurringMonths}
                    onChange={(e) => setRecurringMonths(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Serão criadas {recurringMonths} transações automaticamente.
                  </p>
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setType(null)}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium transition-colors"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={cn(
                    "flex-1 px-4 py-2 rounded-lg text-white font-medium transition-all shadow-md flex items-center justify-center gap-2",
                    type === 'income' 
                      ? "bg-green-600 hover:bg-green-700 shadow-green-200" 
                      : "bg-red-600 hover:bg-red-700 shadow-red-200"
                  )}
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                  Confirmar
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
