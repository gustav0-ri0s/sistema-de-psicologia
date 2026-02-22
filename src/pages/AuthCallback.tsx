import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

const AuthCallback: React.FC = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const handleCallback = async () => {
            const hash = window.location.hash.substring(1);
            const params = new URLSearchParams(hash);

            const access_token = params.get('access_token');
            const refresh_token = params.get('refresh_token');
            const returnTo = params.get('returnTo') || '/';

            if (access_token && refresh_token) {
                try {
                    const { error } = await supabase.auth.setSession({
                        access_token,
                        refresh_token,
                    });

                    if (error) throw error;

                    window.history.replaceState(null, '', window.location.pathname);
                    navigate(returnTo, { replace: true });
                } catch (error) {
                    console.error('Error setting session:', error);
                    window.location.href = `${import.meta.env.VITE_PORTAL_URL}?view=login&error=session_error`;
                }
            } else {
                window.location.href = `${import.meta.env.VITE_PORTAL_URL}?view=login`;
            }
        };

        handleCallback();
    }, [navigate]);

    return (
        <div className="h-screen flex flex-col items-center justify-center bg-gray-50">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 font-black text-primary uppercase tracking-widest text-xs">Autenticando...</p>
        </div>
    );
};

export default AuthCallback;
