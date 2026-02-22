import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabase';
import { UserRole, Profile } from '../types';
import { ShieldAlert, LogOut, ChevronLeft } from 'lucide-react';

interface RequireAuthProps {
    children: React.ReactNode;
    allowedRoles: UserRole[];
}

const RequireAuth: React.FC<RequireAuthProps> = ({ children, allowedRoles }) => {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<Profile | null>(null);
    const [forbidden, setForbidden] = useState(false);
    const location = useLocation();

    useEffect(() => {
        let isMounted = true;

        const checkAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();

                if (!session) {
                    if (isMounted) {
                        const currentUrl = window.location.origin + location.pathname + location.search;
                        window.location.href = `${import.meta.env.VITE_PORTAL_URL}?view=login&returnTo=${encodeURIComponent(currentUrl)}`;
                    }
                    return;
                }

                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();

                if (error || !profile) {
                    console.error('Error fetching profile:', error);
                    if (isMounted) setLoading(false);
                    return;
                }

                const userProfile = profile as Profile;
                const userRole = (userProfile.role || '').toUpperCase().trim();
                const isAllowed = allowedRoles.some(role => role.toUpperCase().trim() === userRole);

                if (isMounted) {
                    if (!isAllowed) {
                        setForbidden(true);
                    } else {
                        setUser(userProfile);
                    }
                    setLoading(false);
                }
            } catch (err) {
                console.error('Auth check error:', err);
                if (isMounted) setLoading(false);
            }
        };

        checkAuth();

        return () => {
            isMounted = false;
        };
    }, [allowedRoles, location.pathname]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.href = `${import.meta.env.VITE_PORTAL_URL}?view=login`;
    };

    if (loading) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-gray-50">
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 font-black text-primary uppercase tracking-widest text-xs">Verificando Credenciales...</p>
            </div>
        );
    }

    if (forbidden) {
        return (
            <div className="h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl border-4 border-red-50">
                    <div className="bg-red-500 p-10 text-white text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-full opacity-10">
                            <ShieldAlert className="w-64 h-64 -ml-20 -mt-20 rotate-12" />
                        </div>
                        <div className="bg-white/20 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 relative z-10">
                            <ShieldAlert className="w-12 h-12 text-white" />
                        </div>
                        <h2 className="text-3xl font-black italic tracking-tighter relative z-10 uppercase">403 - Acceso Denegado</h2>
                    </div>

                    <div className="p-10 text-center space-y-6">
                        <div className="space-y-4">
                            <p className="text-gray-600 font-bold leading-relaxed">
                                Lo sentimos, no tiene los <span className="text-red-500 font-black uppercase underline decoration-2 underline-offset-4">permisos necesarios</span> para acceder a este módulo.
                            </p>
                            <p className="text-xs text-gray-400 font-medium uppercase tracking-widest">
                                Contacte al administrador si cree que esto es un error.
                            </p>
                        </div>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => window.history.back()}
                                className="w-full bg-gray-100 text-gray-900 font-black py-4 rounded-2xl hover:bg-gray-200 transition-all flex items-center justify-center space-x-2 active:scale-95"
                            >
                                <ChevronLeft className="w-5 h-5" />
                                <span className="uppercase tracking-tight">Volver</span>
                            </button>

                            <button
                                onClick={handleLogout}
                                className="w-full bg-gray-900 text-white font-black py-4 rounded-2xl hover:bg-black transition-all flex items-center justify-center space-x-2 shadow-xl active:scale-95"
                            >
                                <LogOut className="w-5 h-5" />
                                <span className="uppercase tracking-tight">Cerrar Sesión</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return <>{children}</>;
};

export default RequireAuth;
