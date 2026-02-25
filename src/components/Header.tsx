import { useState, useRef, useEffect } from 'react';
import { Bell, ChevronDown, ChevronLeft, ChevronRight, Settings, LogOut, Trophy } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useSettings } from '../contexts/SettingsContext';
import { useMode } from '../contexts/ModeContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface Notification {
  id: string;
  message: string;
  read: boolean;
  created_at: string;
}

interface HeaderProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  transactionSuccess?: number;
}

export function Header({ currentDate, onDateChange, transactionSuccess }: HeaderProps) {
  const { settings } = useSettings();
  const { mode, family } = useMode();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [userPoints, setUserPoints] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications();
    
    // Subscribe to realtime notifications
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const subscription = supabase
        .channel('notifications')
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        }, (payload) => {
          setNotifications(prev => [payload.new as Notification, ...prev]);
          setUnreadCount(prev => prev + 1);
        })
        .subscribe();

      return subscription;
    };

    const subPromise = setupSubscription();

    return () => {
      subPromise.then(sub => sub?.unsubscribe());
    };
  }, []);

  useEffect(() => {
    if (mode === 'family' && family) {
      fetchUserPoints();
    }
  }, [mode, family, transactionSuccess]);

  const fetchUserPoints = async () => {
    if (!family) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const start = startOfMonth(new Date()).toISOString();
    
    const { data, error } = await supabase
      .from('transactions')
      .select('points')
      .eq('family_id', family.id)
      .eq('user_id', user.id)
      .gte('date', start);
    
    if (data) {
      const total = data.reduce((acc, curr) => acc + (curr.points || 0), 0);
      setUserPoints(total);
    }
  };

  const fetchNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) {
      setNotifications(data as Notification[]);
      setUnreadCount(data.filter(n => !n.read).length);
    }
  };

  const markAsRead = async () => {
    if (unreadCount === 0) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);
    
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handlePrevMonth = () => {
    onDateChange(subMonths(currentDate, 1));
  };

  const handleNextMonth = () => {
    onDateChange(addMonths(currentDate, 1));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-gray-50/50 md:bg-transparent">
      <div className="flex items-center gap-4">
        <div className="bg-white px-2 py-1 rounded-full border border-gray-200 shadow-sm flex items-center gap-2">
          <button onClick={handlePrevMonth} className="p-1 hover:bg-gray-100 rounded-full text-gray-500">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-gray-700 min-w-[100px] text-center capitalize">
            {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
          </span>
          <button onClick={handleNextMonth} className="p-1 hover:bg-gray-100 rounded-full text-gray-500">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-6">
        {/* Points Display (Family Mode Only) */}
        {mode === 'family' && (
          <div className="hidden md:flex bg-gradient-to-r from-yellow-100 to-orange-100 border border-yellow-200 rounded-full px-4 py-1.5 items-center gap-2 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
            <Trophy className="w-4 h-4 text-yellow-600" />
            <div className="flex items-baseline gap-1">
              <span className="text-xs font-bold text-yellow-800 uppercase tracking-wide">Meus Pontos:</span>
              <span className="text-sm font-bold text-yellow-700">{userPoints}</span>
            </div>
          </div>
        )}

        {/* Notifications */}
        <div className="relative" ref={notificationRef}>
          <button 
            onClick={() => {
              setShowNotifications(!showNotifications);
              if (!showNotifications) markAsRead();
            }}
            className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
              <div className="p-3 border-b border-gray-100 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-700">Notificações</h3>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    Nenhuma notificação
                  </div>
                ) : (
                  notifications.map(notif => (
                    <div key={notif.id} className={`p-3 border-b border-gray-50 text-sm ${notif.read ? 'bg-white' : 'bg-blue-50/50'}`}>
                      <p className="text-gray-800">{notif.message}</p>
                      <span className="text-xs text-gray-400 mt-1 block">
                        {new Date(notif.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-3 pl-6 border-l border-gray-200 hover:opacity-80 transition-opacity"
          >
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-gray-900">{settings.name}</p>
              <p className="text-xs text-gray-500">Basic</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-yellow-100 border-2 border-white shadow-sm overflow-hidden">
              <img 
                src={settings.avatarUrl || "https://picsum.photos/seed/user/200/200"} 
                alt="User" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="p-1 rounded-full hover:bg-gray-100">
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
            </div>
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <button 
                onClick={() => {
                  navigate('/settings');
                  setIsProfileOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
              >
                <Settings className="w-4 h-4" />
                Configurações
              </button>
              <div className="h-px bg-gray-100 my-1"></div>
              <button 
                onClick={handleLogout}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
