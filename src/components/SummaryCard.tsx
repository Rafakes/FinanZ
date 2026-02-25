import { ArrowUp, ArrowDown, CreditCard, Landmark } from 'lucide-react';
import { cn } from '../lib/utils';

interface SummaryCardProps {
  title: string;
  amount: string;
  type: 'balance' | 'income' | 'expense' | 'credit';
  trend?: string;
}

export function SummaryCard({ title, amount, type, trend }: SummaryCardProps) {
  const styles = {
    balance: {
      icon: Landmark,
      iconBg: 'bg-blue-500',
      iconColor: 'text-white',
    },
    income: {
      icon: ArrowUp,
      iconBg: 'bg-green-500',
      iconColor: 'text-white',
    },
    expense: {
      icon: ArrowDown,
      iconBg: 'bg-red-500',
      iconColor: 'text-white',
    },
    credit: {
      icon: CreditCard,
      iconBg: 'bg-teal-600',
      iconColor: 'text-white',
    },
  };

  const style = styles[type];
  const Icon = style.icon;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-sm text-gray-500 font-medium mb-1 flex items-center gap-1">
            {title}
            <span className="text-gray-300 text-xs">›</span>
          </p>
          <h3 className="text-2xl font-bold text-gray-900 tracking-tight">{amount}</h3>
        </div>
        <div className={cn("p-3 rounded-full shadow-sm", style.iconBg)}>
          <Icon className={cn("w-5 h-5", style.iconColor)} />
        </div>
      </div>
      {trend && (
        <div className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full w-fit">
            <span>{trend}</span>
        </div>
      )}
    </div>
  );
}
