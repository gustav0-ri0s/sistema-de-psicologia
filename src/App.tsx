import React, { useState, useEffect, useContext } from 'react';
import { Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from './supabase';
import { UserRole, Profile, PsychAttention, PsychAppointment, PsychReminder } from './types';
import AuthCallback from './pages/AuthCallback';
import RequireAuth from './components/RequireAuth';
import StudentSearchModal from './components/StudentSearchModal';
import {
  LogOut, User, Calendar, Plus, FileText, AlertCircle,
  Download, School, Search, X, Home as HomeIcon, Clock,
  CheckCircle, ChevronRight, Trash2, Edit2, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from './lib/utils';
import { generateAttentionPDF } from './lib/pdf';

// --- Constants ---
const IDLE_TIMEOUT = 2 * 60 * 60 * 1000;
const CHECK_INTERVAL = 60 * 1000;
const ACTIVITY_KEY = 'vc_psych_last_activity';
const ALLOWED_ROLE = UserRole.PSICOLOGA;

// --- Auth Context ---
export const AuthContext = React.createContext<{
  user: Profile | null;
  loading: boolean;
  logout: () => void;
}>({
  user: null,
  loading: true,
  logout: () => { }
});

// --- Reusable UI Components ---

const Button = ({ className, variant = 'primary', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost' }) => {
  const variants = {
    primary: 'bg-primary text-white hover:bg-primary/90 shadow-sm',
    secondary: 'bg-secondary text-white hover:bg-secondary/90 shadow-sm',
    danger: 'bg-red-500 text-white hover:bg-red-600 shadow-sm',
    outline: 'border border-gray-200 text-gray-700 hover:bg-gray-50',
    ghost: 'text-gray-600 hover:bg-gray-100'
  };
  return (
    <button
      className={cn('px-4 py-2 rounded-lg font-medium transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2', variants[variant], className)}
      {...props}
    />
  );
};

const Input = ({ label, rightElement, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string, rightElement?: React.ReactNode }) => (
  <div className="flex flex-col gap-1 w-full relative">
    {label && <label className="text-sm font-semibold text-secondary">{label}</label>}
    <div className="relative flex items-center">
      <input className={cn("w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all bg-white", rightElement ? "pr-12" : "")} {...props} />
      {rightElement && (
        <div className="absolute right-2 flex items-center justify-center">
          {rightElement}
        </div>
      )}
    </div>
  </div>
);

const TextArea = ({ label, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) => (
  <div className="flex flex-col gap-1 w-full">
    {label && <label className="text-sm font-semibold text-secondary">{label}</label>}
    <textarea className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all min-h-[100px] bg-white resize-none" {...props} />
  </div>
);

const Card = ({ children, className, ...props }: { children: React.ReactNode, className?: string } & React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("bg-white rounded-2xl shadow-sm border border-gray-100 p-6", className)} {...props}>
    {children}
  </div>
);

const Badge = ({ children, variant = 'default' }: { children: React.ReactNode, variant?: 'default' | 'success' | 'warning' | 'danger' }) => {
  const variants = {
    default: 'bg-gray-100 text-gray-600',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    danger: 'bg-red-100 text-red-700'
  };
  return (
    <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider", variants[variant])}>
      {children}
    </span>
  );
};

// --- Layout ---

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();

  const isPsicologa = user?.role === UserRole.PSICOLOGA;

  const menuItems = isPsicologa ? [
    { icon: HomeIcon, label: 'Inicio', path: '/' },
    { icon: Calendar, label: 'Agenda', path: '/schedule' },
    { icon: AlertCircle, label: 'Recordatorios', path: '/reminders' },
    { icon: FileText, label: 'Historial', path: '/history' },
    { icon: Plus, label: 'Registrar Atención', path: '/new' },
  ] : [
    { icon: FileText, label: 'Historial', path: '/history' },
  ];

  const handleGoToPortal = () => {
    window.location.href = import.meta.env.VITE_PORTAL_URL || 'https://portal-vc-academico.vercel.app';
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Sidebar Desktop */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col sticky top-0 h-screen hidden md:flex">
        <div className="p-6 flex items-center gap-3 border-b border-gray-50">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
            <School size={24} />
          </div>
          <div>
            <h2 className="font-bold text-gray-800 leading-none">Valores y Ciencias</h2>
            <span className="text-[10px] text-secondary font-bold uppercase tracking-widest">Psicología</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium",
                location.pathname === item.path
                  ? "bg-primary/10 text-primary"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon size={20} />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-50 space-y-2">
          <div className="bg-gray-50 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-primary shadow-sm border border-gray-100">
              <User size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-800 truncate">{user?.full_name}</p>
              <p className="text-[10px] text-secondary font-bold uppercase">
                {user?.role === UserRole.ADMIN ? 'Administrativo' : user?.role === UserRole.SUPERVISOR ? 'Supervisor(a)' : 'Psicólogo(a)'}
              </p>
            </div>
          </div>
          <button
            onClick={handleGoToPortal}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:bg-gray-50 transition-all font-medium text-sm"
          >
            <HomeIcon size={18} />
            Volver al Portal
          </button>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-all font-medium"
          >
            <LogOut size={20} />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="md:hidden bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <School className="text-primary" size={24} />
            <h2 className="font-bold text-gray-800">Psicología VC</h2>
          </div>
          <button
            onClick={logout}
            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={20} />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

// --- Pages ---

const Home = () => {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState({ totalAttentions: 0, todayAppointments: 0 });
  const [appointments, setAppointments] = useState<PsychAppointment[]>([]);
  const [reminders, setReminders] = useState<PsychReminder[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    if (user) fetchDashboardData();
    return () => clearInterval(timer);
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;
    const today = format(new Date(), 'yyyy-MM-dd');

    const [attCount, apptToday, appts, rems] = await Promise.all([
      supabase.from('psych_attentions').select('id', { count: 'exact', head: true }).eq('psychologist_id', user.id),
      supabase.from('psych_appointments').select('id', { count: 'exact', head: true }).eq('psychologist_id', user.id).eq('date', today).eq('status', 'pending'),
      supabase.from('psych_appointments').select('*').eq('psychologist_id', user.id).eq('status', 'pending').order('date', { ascending: true }).order('time', { ascending: true }).limit(5),
      supabase.from('psych_reminders').select('*').eq('psychologist_id', user.id).eq('is_completed', false).order('created_at', { ascending: false }).limit(3),
    ]);

    setStats({
      totalAttentions: attCount.count ?? 0,
      todayAppointments: apptToday.count ?? 0,
    });
    if (appts.data) setAppointments(appts.data);
    if (rems.data) setReminders(rems.data);
  };

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayAppts = appointments.filter(a => a.date === todayStr);

  const handleCompleteReminder = async (id: string) => {
    // Animación optimista
    setReminders(prev => prev.filter(r => r.id !== id));
    await supabase.from('psych_reminders').update({ is_completed: true }).eq('id', id);
    fetchDashboardData();
  };

  return (
    <div className="p-6 md:p-10 space-y-8">
      {/* Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">¡Hola, {user?.full_name?.split(' ')[0]}!</h1>
          <p className="text-gray-500 mt-1">Bienvenido(a) de nuevo a tu panel de psicología.</p>
        </div>
        <Card className="flex items-center gap-4 py-3 px-6 bg-primary text-white border-none shadow-lg shadow-primary/20">
          <Clock size={24} />
          <div className="text-right">
            <p className="text-2xl font-bold leading-none">{format(currentTime, 'HH:mm:ss')}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">
              {format(currentTime, "EEEE, d 'de' MMMM", { locale: es })}
            </p>
          </div>
        </Card>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="flex items-center gap-5">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
            <FileText size={28} />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Total Atenciones</p>
            <p className="text-3xl font-bold text-gray-900">{stats.totalAttentions}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-5">
          <div className="w-14 h-14 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center">
            <Calendar size={28} />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Citas Hoy</p>
            <p className="text-3xl font-bold text-gray-900">{stats.todayAppointments}</p>
          </div>
        </Card>
        <Card
          onClick={() => navigate('/new')}
          className="flex items-center gap-5 bg-gradient-to-br from-primary to-primary/80 text-white border-none cursor-pointer hover:shadow-lg hover:shadow-primary/30 transition-all group"
        >
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <Plus size={28} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold opacity-80 uppercase tracking-wider">Acceso Rápido</p>
            <div className="text-lg font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
              Registrar Atención <ChevronRight size={20} />
            </div>
          </div>
        </Card>
      </div>

      {/* Agenda & Reminders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="flex flex-col h-full">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Calendar className="text-primary" size={20} />
              <h3 className="font-bold text-gray-800 text-lg">Agenda de Hoy</h3>
            </div>
            <Link to="/schedule" className="text-primary text-sm font-bold hover:underline">Ver todo</Link>
          </div>
          <div className="flex-1 space-y-4">
            {todayAppts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-3">
                  <Clock size={24} />
                </div>
                <p className="text-gray-500 text-sm">No hay citas programadas para hoy.</p>
              </div>
            ) : (
              todayAppts.map(appt => (
                <div key={appt.id} className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="text-center min-w-[60px]">
                    <p className="text-lg font-bold text-primary leading-none">{appt.time?.slice(0, 5)}</p>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-800">{appt.student_name}</p>
                    <p className="text-xs text-secondary">{appt.grade}</p>
                  </div>
                  <Button variant="ghost" className="p-2" onClick={() => navigate('/new', { state: { appt } })}>
                    <ChevronRight size={20} />
                  </Button>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="flex flex-col h-full">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="text-primary" size={20} />
              <h3 className="font-bold text-gray-800 text-lg">Recordatorios</h3>
            </div>
            <Link to="/reminders" className="text-primary text-sm font-bold hover:underline">Gestionar</Link>
          </div>
          <div className="space-y-4">
            {reminders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <p className="text-gray-500 text-sm">No hay recordatorios pendientes.</p>
              </div>
            ) : (
              reminders.map(reminder => (
                <div
                  key={reminder.id}
                  className={cn(
                    "p-4 rounded-xl border flex gap-3 group relative overflow-hidden transition-all hover:shadow-md cursor-pointer",
                    reminder.type === 'warning' ? "bg-yellow-50 border-yellow-100" :
                      reminder.type === 'success' ? "bg-green-50 border-green-100" :
                        "bg-blue-50 border-blue-100"
                  )}
                  onClick={() => handleCompleteReminder(reminder.id!)}
                >
                  <div className="absolute inset-0 bg-white/60 opacity-0 group-hover:opacity-100 transition-opacity z-0 flex items-center justify-end px-6 backdrop-blur-[1px]">
                    <span className="font-bold text-gray-700 flex items-center gap-2"><Check size={20} /> Tachar</span>
                  </div>
                  <div className={cn(
                    "mt-0.5 relative z-10",
                    reminder.type === 'warning' ? "text-yellow-600" :
                      reminder.type === 'success' ? "text-green-600" : "text-blue-600"
                  )}>
                    {reminder.type === 'warning' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
                  </div>
                  <div className="relative z-10 w-full">
                    <p className={cn("text-sm font-bold",
                      reminder.type === 'warning' ? "text-yellow-800" :
                        reminder.type === 'success' ? "text-green-800" : "text-blue-800"
                    )}>{reminder.title}</p>
                    <p className={cn("text-xs mt-1",
                      reminder.type === 'warning' ? "text-yellow-700" :
                        reminder.type === 'success' ? "text-green-700" : "text-blue-700"
                    )}>{reminder.description}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

const Schedule = () => {
  const { user } = useContext(AuthContext);
  const [appointments, setAppointments] = useState<PsychAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showStudentSearch, setShowStudentSearch] = useState(false);
  const [formData, setFormData] = useState({ student_name: '', grade: '', date: '', time: '' });
  const navigate = useNavigate();

  const fetchAppointments = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('psych_appointments')
      .select('*')
      .eq('psychologist_id', user.id)
      .eq('status', 'pending')
      .order('date', { ascending: true })
      .order('time', { ascending: true });
    if (data) setAppointments(data);
    setLoading(false);
  };

  useEffect(() => { if (user) fetchAppointments(); }, [user]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const { error } = await supabase.from('psych_appointments').insert([{
      ...formData,
      psychologist_id: user.id,
      status: 'pending'
    }]);
    if (!error) {
      setShowModal(false);
      fetchAppointments();
      setFormData({ student_name: '', grade: '', date: '', time: '' });
    }
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('psych_appointments').update({ status }).eq('id', id);
    fetchAppointments();
  };

  return (
    <div className="p-6 md:p-10">
      <StudentSearchModal
        isOpen={showStudentSearch}
        onClose={() => setShowStudentSearch(false)}
        onSelect={(name, grade) => setFormData({ ...formData, student_name: name, grade })}
      />
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Agenda de Citas</h1>
          <p className="text-secondary">Programación de sesiones psicológicas</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus size={18} />
          Programar Cita
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid gap-4">
          {appointments.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-gray-300">
              <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No hay citas pendientes.</p>
            </div>
          ) : (
            appointments.map(appt => (
              <Card key={appt.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center font-bold text-sm">
                    {appt.time?.slice(0, 5)}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800">{appt.student_name}</h4>
                    <p className="text-xs text-secondary">{appt.grade} • {format(new Date(appt.date + 'T00:00:00'), "d 'de' MMMM", { locale: es })}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" className="text-green-600 hover:bg-green-50" onClick={() => navigate('/new', { state: { appt } })}>
                    <CheckCircle size={18} /> Registrar Atención
                  </Button>
                  <Button variant="outline" className="text-red-500 hover:bg-red-50" onClick={() => updateStatus(appt.id!, 'cancelled')}>
                    <X size={18} /> Cancelar
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative z-10">
              <h3 className="text-xl font-bold text-gray-800 mb-6">Programar Nueva Cita</h3>
              <form onSubmit={handleAdd} className="space-y-4">
                <Input
                  label="Estudiante"
                  required
                  value={formData.student_name}
                  onChange={e => setFormData({ ...formData, student_name: e.target.value })}
                  rightElement={
                    <button type="button" onClick={() => setShowStudentSearch(true)} className="p-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-md transition-colors">
                      <Search size={18} />
                    </button>
                  }
                />
                <Input label="Grado" required value={formData.grade} onChange={e => setFormData({ ...formData, grade: e.target.value })} />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Fecha" type="date" required value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                  <Input label="Hora" type="time" required value={formData.time} onChange={e => setFormData({ ...formData, time: e.target.value })} />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setShowModal(false)}>Cancelar</Button>
                  <Button type="submit" className="flex-1">Programar</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Reminders = () => {
  const { user } = useContext(AuthContext);
  const [reminders, setReminders] = useState<PsychReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ title: '', description: '', type: 'info' as 'info' | 'warning' | 'success' });

  const fetchReminders = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('psych_reminders')
      .select('*')
      .eq('psychologist_id', user.id)
      .order('is_completed', { ascending: true })
      .order('created_at', { ascending: false });
    if (data) setReminders(data);
    setLoading(false);
  };

  useEffect(() => { if (user) fetchReminders(); }, [user]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (editingId) {
      const { error } = await supabase.from('psych_reminders').update({ ...formData }).eq('id', editingId);
      if (!error) {
        setShowModal(false);
        fetchReminders();
        setFormData({ title: '', description: '', type: 'info' });
        setEditingId(null);
      }
    } else {
      const { error } = await supabase.from('psych_reminders').insert([{ ...formData, psychologist_id: user.id }]);
      if (!error) {
        setShowModal(false);
        fetchReminders();
        setFormData({ title: '', description: '', type: 'info' });
      }
    }
  };

  const handleEdit = (reminder: PsychReminder) => {
    setFormData({ title: reminder.title, description: reminder.description, type: reminder.type });
    setEditingId(reminder.id!);
    setShowModal(true);
  };

  const toggleComplete = async (reminder: PsychReminder) => {
    const updated = !reminder.is_completed;
    setReminders(prev => prev.map(r => r.id === reminder.id ? { ...r, is_completed: updated } : r));
    await supabase.from('psych_reminders').update({ is_completed: updated }).eq('id', reminder.id);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('psych_reminders').delete().eq('id', id);
    setReminders(prev => prev.filter(r => r.id !== id));
  };

  return (
    <div className="p-6 md:p-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Recordatorios</h1>
          <p className="text-secondary">Gestiona tus notas y avisos importantes</p>
        </div>
        <Button onClick={() => { setEditingId(null); setFormData({ title: '', description: '', type: 'info' }); setShowModal(true); }}>
          <Plus size={18} /> Nuevo Recordatorio
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid gap-4">
          {reminders.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-gray-300">
              <AlertCircle size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No hay recordatorios registrados.</p>
            </div>
          ) : (
            reminders.map(reminder => (
              <Card key={reminder.id} className={cn(
                "flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-4 transition-all duration-300",
                reminder.type === 'warning' ? "border-l-yellow-400" :
                  reminder.type === 'success' ? "border-l-green-400" : "border-l-blue-400",
                reminder.is_completed && "opacity-60 bg-gray-50 border-gray-300 border-l-gray-400 grayscale filter"
              )}>
                <div className="flex items-start gap-4">
                  <div className={cn("p-3 rounded-xl",
                    reminder.is_completed ? "bg-gray-100 text-gray-500" :
                      reminder.type === 'warning' ? "bg-yellow-50 text-yellow-600" :
                        reminder.type === 'success' ? "bg-green-50 text-green-600" : "bg-blue-50 text-blue-600"
                  )}>
                    {reminder.type === 'warning' ? <AlertCircle size={24} /> : <CheckCircle size={24} />}
                  </div>
                  <div>
                    <h4 className={cn("font-bold transition-all", reminder.is_completed ? "text-gray-500 line-through" : "text-gray-800")}>{reminder.title}</h4>
                    <p className={cn("text-sm transition-all", reminder.is_completed ? "text-gray-400 line-through" : "text-secondary")}>{reminder.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" className={cn("p-2", reminder.is_completed ? "text-blue-500 hover:bg-blue-50" : "text-green-600 hover:bg-green-50")} onClick={() => toggleComplete(reminder)} title={reminder.is_completed ? "Desmarcar" : "Marcar como hecho"}>
                    <Check size={18} />
                  </Button>
                  <Button variant="outline" className="p-2 text-primary hover:bg-primary/10" onClick={() => handleEdit(reminder)} title="Editar">
                    <Edit2 size={18} />
                  </Button>
                  <Button variant="outline" className="p-2 text-red-500 hover:bg-red-50 border-red-100" onClick={() => handleDelete(reminder.id!)} title="Eliminar">
                    <Trash2 size={18} />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative z-10">
              <h3 className="text-xl font-bold text-gray-800 mb-6">{editingId ? 'Editar Recordatorio' : 'Nuevo Recordatorio'}</h3>
              <form onSubmit={handleAdd} className="space-y-4">
                <Input label="Título" required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                <TextArea label="Descripción" required value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold text-secondary">Prioridad</label>
                  <select
                    className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all bg-white"
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                  >
                    <option value="info">Informativo (Azul)</option>
                    <option value="warning">Importante (Amarillo)</option>
                    <option value="success">Completado (Verde)</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setShowModal(false)}>Cancelar</Button>
                  <Button type="submit" className="flex-1">Guardar</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const History = () => {
  const { user } = useContext(AuthContext);
  const [attentions, setAttentions] = useState<PsychAttention[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const navigate = useNavigate();

  const isPsicologa = user?.role === UserRole.PSICOLOGA;

  const fetchAttentions = async () => {
    if (!user) return;

    let query = supabase
      .from('psych_attentions')
      .select('*')
      .order('date', { ascending: false })
      .order('time', { ascending: false });

    if (isPsicologa) {
      query = query.eq('psychologist_id', user.id);
    }

    const { data } = await query;
    if (data) setAttentions(data);
    setLoading(false);
  };

  useEffect(() => { if (user) fetchAttentions(); }, [user]);

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este registro?')) return;
    await supabase.from('psych_attentions').delete().eq('id', id);
    setAttentions(prev => prev.filter(a => a.id !== id));
  };

  const filteredAttentions = attentions.filter(attention => {
    const matchesName = attention.student_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDate = filterDate ? attention.date === filterDate : true;
    return matchesName && matchesDate;
  });

  return (
    <div className="p-6 md:p-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Historial de Atenciones</h1>
          <p className="text-secondary">Consulta y descarga registros anteriores</p>
        </div>
        {isPsicologa && (
          <Button onClick={() => navigate('/new')}>
            <Plus size={18} /> Registrar Atención
          </Button>
        )}
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-8 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text" placeholder="Buscar por estudiante..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="md:w-48 relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="date"
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
            value={filterDate} onChange={e => setFilterDate(e.target.value)}
          />
        </div>
        {(searchTerm || filterDate) && (
          <Button variant="ghost" onClick={() => { setSearchTerm(''); setFilterDate(''); }}>
            <X size={18} /> Limpiar
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : filteredAttentions.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-gray-300">
          <FileText size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No se encontraron registros.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredAttentions.map(attention => (
            <Card key={attention.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-md transition-shadow">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-gray-800">{attention.student_name}</h3>
                  <Badge>{attention.grade}</Badge>
                </div>
                <div className="flex gap-4 text-xs text-secondary font-medium">
                  <span className="flex items-center gap-1"><Calendar size={12} /> {format(new Date(attention.date + 'T00:00:00'), "dd/MM/yyyy")}</span>
                  <span className="flex items-center gap-1"><Clock size={12} /> {attention.time?.slice(0, 5)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" className="p-2 text-primary hover:bg-primary/10" onClick={() => generateAttentionPDF({ ...attention, psychologist_name: attention.psychologist_name || user?.full_name })} title="Descargar PDF"><Download size={18} /></Button>
                {isPsicologa && (
                  <Button variant="outline" className="p-2 text-red-500 hover:bg-red-50" onClick={() => handleDelete(attention.id!)} title="Eliminar"><Trash2 size={18} /></Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

const NewAttention = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [showStudentSearch, setShowStudentSearch] = useState(false);

  const apptFromState = location.state?.appt as PsychAppointment | undefined;

  const [formData, setFormData] = useState({
    student_name: apptFromState?.student_name || '',
    grade: apptFromState?.grade || '',
    date: apptFromState?.date || format(new Date(), 'yyyy-MM-dd'),
    time: apptFromState?.time?.slice(0, 5) || format(new Date(), 'HH:mm'),
    reason: '',
    observations: '',
    recommendations: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    const { error } = await supabase.from('psych_attentions').insert([{
      ...formData,
      psychologist_id: user.id,
    }]);

    if (!error) {
      // If came from appointment, mark it as completed
      if (apptFromState?.id) {
        await supabase.from('psych_appointments').update({ status: 'completed' }).eq('id', apptFromState.id);
      }
      navigate('/history');
    } else {
      alert('Error al guardar el registro: ' + error.message);
    }
    setLoading(false);
  };

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Registrar Atención</h1>
        <p className="text-secondary">Complete los detalles de la sesión psicológica</p>
      </div>

      <Card>
        <StudentSearchModal
          isOpen={showStudentSearch}
          onClose={() => setShowStudentSearch(false)}
          onSelect={(name, grade) => setFormData({ ...formData, student_name: name, grade })}
        />
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Input
              label="Estudiante"
              required
              value={formData.student_name}
              onChange={e => setFormData({ ...formData, student_name: e.target.value })}
              rightElement={
                <button type="button" onClick={() => setShowStudentSearch(true)} className="p-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-md transition-colors">
                  <Search size={18} />
                </button>
              }
            />
            <Input label="Grado y Sección" required value={formData.grade} onChange={e => setFormData({ ...formData, grade: e.target.value })} />
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <Input label="Fecha" type="date" required value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
            <Input label="Hora" type="time" required value={formData.time} onChange={e => setFormData({ ...formData, time: e.target.value })} />
          </div>
          <TextArea label="Motivo de Consulta" required value={formData.reason} onChange={e => setFormData({ ...formData, reason: e.target.value })} />
          <TextArea label="Observaciones" required value={formData.observations} onChange={e => setFormData({ ...formData, observations: e.target.value })} />
          <TextArea label="Recomendaciones" required value={formData.recommendations} onChange={e => setFormData({ ...formData, recommendations: e.target.value })} />

          <div className="flex gap-4 justify-end pt-4">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar Registro'}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

// --- Main App with Supabase Auth ---

const MainApp = () => {
  const { user } = useContext(AuthContext);
  if (!user) return null;

  const isPsicologa = user.role === UserRole.PSICOLOGA;

  return (
    <Layout>
      <AnimatePresence mode="wait">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          <Routes>
            <Route path="/" element={isPsicologa ? <Home /> : <Navigate to="/history" replace />} />
            {isPsicologa && <Route path="/schedule" element={<Schedule />} />}
            {isPsicologa && <Route path="/reminders" element={<Reminders />} />}
            <Route path="/history" element={<History />} />
            {isPsicologa && <Route path="/new" element={<NewAttention />} />}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </Layout>
  );
};

export default function App() {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function handleSession(session: any) {
      if (!mounted) return;
      if (session?.user) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (mounted) setUser(profile as Profile);
        } catch (err) {
          console.error('Profile fetch error:', err);
          handleLogout();
        }
      } else {
        if (mounted) setUser(null);
      }
      if (mounted) setLoading(false);
    }

    async function getInitialSession() {
      const { data: { session } } = await supabase.auth.getSession();
      handleSession(session);
    }

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) handleSession(session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Idle timeout
  useEffect(() => {
    if (!user) return;

    const checkIdleTimeout = () => {
      const lastActivity = localStorage.getItem(ACTIVITY_KEY);
      if (lastActivity) {
        const timeSinceLastActivity = Date.now() - parseInt(lastActivity, 10);
        if (timeSinceLastActivity > IDLE_TIMEOUT) {
          handleLogout();
          return true;
        }
      }
      return false;
    };

    if (checkIdleTimeout()) return;

    const updateActivity = () => {
      localStorage.setItem(ACTIVITY_KEY, Date.now().toString());
    };

    updateActivity();

    const events = ['mousedown', 'keydown', 'mousemove', 'scroll', 'touchstart'];
    events.forEach(eventName => window.addEventListener(eventName, updateActivity));

    const interval = setInterval(checkIdleTimeout, CHECK_INTERVAL);

    return () => {
      events.forEach(eventName => window.removeEventListener(eventName, updateActivity));
      clearInterval(interval);
    };
  }, [user]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error during signOut:', err);
    }
    setUser(null);
    localStorage.removeItem(ACTIVITY_KEY);
    const portalUrl = import.meta.env.VITE_PORTAL_URL || 'https://portal-vc-academico.vercel.app';
    window.location.href = `${portalUrl}?view=login`;
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-white">
      <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-2xl animate-spin shadow-xl shadow-primary/20"></div>
      <p className="mt-6 font-black text-secondary uppercase tracking-[0.3em] text-[10px] animate-pulse">Iniciando Sistema...</p>
    </div>
  );

  return (
    <AuthContext.Provider value={{ user, loading, logout: handleLogout }}>
      <Routes>
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route
          path="/*"
          element={
            <RequireAuth allowedRoles={[UserRole.PSICOLOGA, UserRole.ADMIN, UserRole.SUPERVISOR]}>
              <MainApp />
            </RequireAuth>
          }
        />
      </Routes>
    </AuthContext.Provider>
  );
}
