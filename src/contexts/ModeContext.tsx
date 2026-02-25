import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

export type AppMode = 'personal' | 'family';

interface Family {
  id: string;
  name: string;
  created_by: string;
}

interface ModeContextType {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  family: Family | null;
  createFamily: (name: string) => Promise<void>;
  loading: boolean;
}

const ModeContext = createContext<ModeContextType | undefined>(undefined);

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AppMode>('personal');
  const [family, setFamily] = useState<Family | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkFamilyStatus();
  }, []);

  const checkFamilyStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if user is part of a family
      const { data, error } = await supabase
        .from('family_members')
        .select('family_id, families(id, name, created_by)')
        .eq('user_id', user.id)
        .single();

      if (data && data.families) {
        // @ts-ignore
        setFamily(data.families);
      }
    } catch (error: any) {
      // Ignore "table not found" errors during initialization as the user might not have set up the DB yet
      if (error.code === '42P01' || error.message?.includes('relation') && error.message?.includes('does not exist')) {
        return;
      }
      console.error('Error checking family status:', error);
    } finally {
      setLoading(false);
    }
  };

  const createFamily = async (name: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // 1. Create Family
      const { data: newFamily, error: familyError } = await supabase
        .from('families')
        .insert({ name, created_by: user.id })
        .select()
        .single();

      if (familyError) {
        console.error('Supabase family create error:', familyError);
        throw new Error(`Erro ao criar tabela família: ${familyError.message}`);
      }

      if (!newFamily) throw new Error('Família criada mas nenhum dado retornado');

      // 2. Add creator as member
      const { error: memberError } = await supabase
        .from('family_members')
        .insert({
          family_id: newFamily.id,
          user_id: user.id,
          role: 'admin'
        });

      if (memberError) {
        console.error('Supabase member create error:', memberError);
        // Try to rollback family creation if member creation fails (optional but good practice)
        await supabase.from('families').delete().eq('id', newFamily.id);
        throw new Error(`Erro ao adicionar membro: ${memberError.message}`);
      }

      setFamily(newFamily);
      setMode('family');
    } catch (error) {
      console.error('Error creating family:', error);
      throw error;
    }
  };

  return (
    <ModeContext.Provider value={{ mode, setMode, family, createFamily, loading }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  const context = useContext(ModeContext);
  if (context === undefined) {
    throw new Error('useMode must be used within a ModeProvider');
  }
  return context;
}
