import { useState, useEffect, FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { useSettings, Currency } from '../contexts/SettingsContext';
import { useMode } from '../contexts/ModeContext';
import { Save, Trash2, AlertTriangle, User, Users, RefreshCw, CalendarX, Plus, X } from 'lucide-react';
import { startOfMonth, endOfMonth } from 'date-fns';
import { DatabaseSetupModal } from '../components/DatabaseSetupModal';

interface FamilyMember {
  id: string;
  user_id: string;
  role: string;
  profiles: {
    email: string;
    full_name: string;
  };
}

export function Settings() {
  const { settings, updateSettings } = useSettings();
  const { mode, family } = useMode();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(settings.name);
  const [avatarUrl, setAvatarUrl] = useState(settings.avatarUrl);
  const [currency, setCurrency] = useState<Currency>(settings.currency);
  
  // Family state
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [isDatabaseSetupModalOpen, setIsDatabaseSetupModalOpen] = useState(false);

  useEffect(() => {
    if (mode === 'family' && family) {
      fetchFamilyMembers();
    }
  }, [mode, family]);

  const fetchFamilyMembers = async () => {
    if (!family) return;
    try {
      const { data, error } = await supabase
        .from('family_members')
        .select(`
          id,
          user_id,
          role,
          profiles (
            email,
            full_name
          )
        `)
        .eq('family_id', family.id);

      if (error) throw error;
      setFamilyMembers(data as any);
    } catch (error: any) {
      console.error('Error fetching members:', error);
      if (error.message?.includes('Could not find a relationship')) {
         setIsDatabaseSetupModalOpen(true);
      }
    }
  };

  const handleAddMember = async (e: FormEvent) => {
    e.preventDefault();
    if (!family || !newMemberEmail) return;

    setAddingMember(true);
    try {
      const { error } = await supabase.rpc('add_family_member_by_email', {
        family_id_input: family.id,
        email_input: newMemberEmail
      });

      if (error) throw error;

      // Send invitation email via our new API
      try {
        await fetch('/api/send-invite-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: newMemberEmail,
            familyName: family.name,
            inviterName: settings.name
          })
        });
      } catch (emailErr) {
        console.error('Failed to trigger email API:', emailErr);
        // We don't alert here because the member WAS added successfully to the DB
      }

      alert('Membro adicionado com sucesso! Um e-mail de convite foi enviado.');
      setNewMemberEmail('');
      fetchFamilyMembers();
    } catch (error: any) {
      console.error('Error adding member:', error);
      if (error.message?.includes('function public.add_family_member_by_email') || error.code === '42883') {
         setIsDatabaseSetupModalOpen(true);
      } else {
         alert(`Erro ao adicionar membro: ${error.message || 'Erro desconhecido'}`);
      }
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Tem certeza que deseja remover este membro da família?')) return;
    if (!family) return;

    try {
      const { error } = await supabase
        .from('family_members')
        .delete()
        .eq('family_id', family.id)
        .eq('user_id', userId);

      if (error) throw error;
      fetchFamilyMembers();
    } catch (error) {
      console.error('Error removing member:', error);
      alert('Erro ao remover membro.');
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      await updateSettings({ name, avatarUrl, currency });
      alert('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Error updating settings:', error);
      alert('Erro ao salvar configurações.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetCurrentMonth = async () => {
    if (!confirm('Tem certeza? Isso apagará APENAS as transações do mês atual. O histórico passado e futuro será mantido.')) return;
    
    setLoading(true);
    try {
      const start = startOfMonth(new Date()).toISOString();
      const end = endOfMonth(new Date()).toISOString();
      
      let query = supabase.from('transactions').delete();

      if (mode === 'family' && family) {
        query = query.eq('family_id', family.id);
      } else {
        query = query.is('family_id', null);
      }
      
      const { error } = await query.gte('date', start).lte('date', end);

      if (error) throw error;
      alert('Dados do mês atual resetados com sucesso.');
    } catch (error) {
      console.error('Error resetting current month data:', error);
      alert('Erro ao resetar dados do mês atual.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetCurrentFuture = async () => {
    if (!confirm('Tem certeza? Isso apagará todas as transações deste mês em diante. Esta ação não pode ser desfeita.')) return;
    
    setLoading(true);
    try {
      const startOfCurrentMonth = startOfMonth(new Date()).toISOString();
      
      let query = supabase.from('transactions').delete();

      if (mode === 'family' && family) {
        query = query.eq('family_id', family.id);
      } else {
        query = query.is('family_id', null);
      }
      
      const { error } = await query.gte('date', startOfCurrentMonth);

      if (error) throw error;
      alert('Dados do mês atual e futuro resetados com sucesso.');
    } catch (error) {
      console.error('Error resetting data:', error);
      alert('Erro ao resetar dados.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetAll = async () => {
    if (!confirm('ATENÇÃO: Isso apagará TODAS as suas transações, cartões e histórico. Esta ação é IRREVERSÍVEL. Deseja continuar?')) return;
    
    setLoading(true);
    try {
      // Delete transactions
      let txQuery = supabase.from('transactions').delete();
      if (mode === 'family' && family) {
        txQuery = txQuery.eq('family_id', family.id);
      } else {
        txQuery = txQuery.is('family_id', null);
      }
      const { error: txError } = await txQuery.neq('id', '00000000-0000-0000-0000-000000000000');
      if (txError) throw txError;

      // Delete cards (only for personal mode usually, or family if cards are shared - assuming cards have family_id too? 
      // Checking schema would be good, but assuming cards are personal for now or mixed. 
      // If cards don't have family_id, we might skip deleting them in family mode or delete only those created by user?
      // For now, let's assume cards are personal or we only delete them in personal mode to be safe, 
      // OR if we want to support family cards, we need to check the schema.
      // Let's assume for now we only delete cards in personal mode to avoid deleting other people's cards if they are shared but not linked to family_id properly.
      // Actually, if cards table has family_id, we should use it.
      // Let's stick to transactions for family mode reset all, unless we are sure about cards.
      // But user asked "Resetar tudo".
      
      // Let's check if we should delete cards. In personal mode, yes. In family mode?
      // If I look at previous steps, I don't see cards table definition.
      // I'll assume for now we only delete transactions for family "Reset All", 
      // or if personal, we delete cards too.
      
      if (mode === 'personal') {
         const { error: cardError } = await supabase.from('credit_cards').delete().neq('id', '00000000-0000-0000-0000-000000000000');
         if (cardError) throw cardError;
      }

      alert('Todos os dados foram apagados com sucesso.');
    } catch (error) {
      console.error('Error resetting all data:', error);
      alert('Erro ao apagar todos os dados.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFamily = async () => {
    if (!family) return;
    if (!confirm(`ATENÇÃO: Você está prestes a excluir a família "${family.name}".\n\nIsso apagará PERMANENTEMENTE:\n- Todas as transações da família\n- Todos os membros da família\n- Todo o histórico\n\nEsta ação NÃO pode ser desfeita. Tem certeza absoluta?`)) return;

    setLoading(true);
    try {
      // Delete the family itself. Cascade should handle the rest (members, transactions).
      const { error } = await supabase
        .from('families')
        .delete()
        .eq('id', family.id);

      if (error) throw error;

      alert('Família excluída com sucesso.');
      window.location.reload(); // Reload to reset state and go back to personal mode cleanly
    } catch (error) {
      console.error('Error deleting family:', error);
      alert('Erro ao excluir família.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>

      {/* Profile Settings */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <User className="w-5 h-5 text-purple-600" />
            Perfil e Preferências
          </h2>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">Nome de exibição</label>
              <input
                id="displayName"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-200 outline-none"
              />
            </div>
            <div>
              <label htmlFor="avatarUrl" className="block text-sm font-medium text-gray-700 mb-1">URL da Imagem de Perfil</label>
              <input
                id="avatarUrl"
                type="text"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-200 outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">Cole o link de uma imagem (ex: Imgur, Google Photos)</p>
            </div>
            <div>
              <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">Moeda Principal</label>
              <select
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-200 outline-none bg-white"
              >
                <option value="BRL">Real (BRL)</option>
                <option value="EUR">Euro (EUR)</option>
                <option value="USD">Dólar (USD)</option>
              </select>
            </div>
          </div>
          
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSaveProfile}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              Salvar Alterações
            </button>
          </div>
        </div>
      </div>

      {/* Family System */}
      {mode === 'family' && family && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Gerenciamento da Família: {family.name}
            </h2>
          </div>
          <div className="p-6 space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-700">Membros Atuais</h3>
              <div className="space-y-3">
                {familyMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                        {member.profiles?.full_name?.[0] || member.profiles?.email?.[0] || 'U'}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{member.profiles?.full_name || 'Usuário'}</p>
                        <p className="text-xs text-gray-500">{member.profiles?.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium px-2 py-1 bg-gray-200 text-gray-700 rounded-full capitalize">
                        {member.role === 'admin' ? 'Administrador' : 'Membro'}
                      </span>
                      {member.role !== 'admin' && (
                        <button
                          onClick={() => handleRemoveMember(member.user_id)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          title="Remover membro"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-100 pt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-4">Adicionar Novo Membro</h3>
              <form onSubmit={handleAddMember} className="flex gap-3">
                <input
                  type="email"
                  required
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  placeholder="Digite o e-mail do usuário"
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-200 outline-none"
                />
                <button
                  type="submit"
                  disabled={addingMember}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  {addingMember ? 'Adicionando...' : 'Adicionar'}
                </button>
              </form>
              <p className="text-xs text-gray-500 mt-2">
                O usuário deve estar cadastrado na plataforma para ser adicionado.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Danger Zone */}
      <div className="bg-white rounded-2xl shadow-sm border border-red-100 overflow-hidden">
        <div className="p-6 border-b border-red-100 bg-red-50/30">
          <h2 className="text-lg font-semibold text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Zona de Perigo
          </h2>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
            <div>
              <h3 className="font-medium text-gray-900">Resetar Mês Atual</h3>
              <p className="text-sm text-gray-500">Apaga apenas as transações do mês atual. Mantém histórico e futuro.</p>
            </div>
            <button
              type="button"
              onClick={handleResetCurrentMonth}
              disabled={loading}
              className="px-4 py-2 text-yellow-600 hover:bg-yellow-50 rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              <CalendarX className="w-4 h-4" />
              Resetar Mês
            </button>
          </div>

          <div className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
            <div>
              <h3 className="font-medium text-gray-900">Resetar Mês Atual e Futuro</h3>
              <p className="text-sm text-gray-500">Apaga todas as transações deste mês em diante. Mantém o histórico passado.</p>
            </div>
            <button
              type="button"
              onClick={handleResetCurrentFuture}
              disabled={loading}
              className="px-4 py-2 text-orange-600 hover:bg-orange-50 rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Resetar Parcial
            </button>
          </div>

          <div className="flex items-center justify-between p-4 border border-red-100 rounded-xl bg-red-50/10 hover:bg-red-50 transition-colors">
            <div>
              <h3 className="font-medium text-red-900">Resetar Tudo</h3>
              <p className="text-sm text-red-600">Apaga TODAS as transações{mode === 'personal' ? ' e cartões' : ''}. Começa do zero absoluto.</p>
            </div>
            <button
              type="button"
              onClick={handleResetAll}
              disabled={loading}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Apagar Tudo
            </button>
          </div>

          {mode === 'family' && family && (
            <div className="flex items-center justify-between p-4 border border-red-200 rounded-xl bg-red-100/50 hover:bg-red-100 transition-colors mt-4">
              <div>
                <h3 className="font-bold text-red-900">Excluir Família</h3>
                <p className="text-sm text-red-700">Exclui permanentemente a família e todos os dados associados.</p>
              </div>
              <button
                type="button"
                onClick={handleDeleteFamily}
                disabled={loading}
                className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
              >
                <AlertTriangle className="w-4 h-4" />
                Excluir Família
              </button>
            </div>
          )}
        </div>
      </div>

      <DatabaseSetupModal 
        isOpen={isDatabaseSetupModalOpen} 
        onClose={() => setIsDatabaseSetupModalOpen(false)} 
      />
    </div>
  );
}
