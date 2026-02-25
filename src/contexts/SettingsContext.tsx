import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

export type Currency = 'BRL' | 'EUR' | 'USD';

interface UserSettings {
  name: string;
  avatarUrl: string;
  currency: Currency;
}

interface SettingsContextType {
  settings: UserSettings;
  updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
  formatMoney: (amount: number) => string;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>({
    name: 'Usuário',
    avatarUrl: '',
    currency: 'BRL',
  });

  useEffect(() => {
    // Load settings from Supabase user metadata
    const loadSettings = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setSettings({
          name: user.user_metadata.full_name || 'Usuário',
          avatarUrl: user.user_metadata.avatar_url || '',
          currency: (user.user_metadata.currency as Currency) || 'BRL',
        });
      }
    };
    loadSettings();
  }, []);

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: newSettings.name,
        avatar_url: newSettings.avatarUrl,
        currency: newSettings.currency,
      },
    });

    if (error) throw error;

    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const formatMoney = (amount: number) => {
    const localeMap: Record<Currency, string> = {
      BRL: 'pt-BR',
      EUR: 'pt-PT',
      USD: 'en-US',
    };

    return amount.toLocaleString(localeMap[settings.currency], {
      style: 'currency',
      currency: settings.currency,
      minimumFractionDigits: 2,
    });
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, formatMoney }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
