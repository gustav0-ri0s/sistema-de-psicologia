export enum UserRole {
    ADMIN = 'admin',
    SUPERVISOR = 'supervisor',
    SUBDIRECTOR = 'subdirector',
    DOCENTE = 'docente',
    DOCENTE_INGLES = 'docente_ingles',
    SECRETARIA = 'secretaria',
    PSICOLOGA = 'psicologa',
    AUXILIAR = 'auxiliar',
    ADMINISTRATIVO = 'administrativo',
    STUDENT = 'student',
    PARENT = 'parent',
}

export interface Profile {
    id: string;
    email: string;
    role: UserRole;
    full_name: string;
    created_at: string;
    birth_date?: string;
    dni?: string;
    active?: boolean;
}

export interface PsychAttention {
    id?: string;
    psychologist_id?: string;
    student_id?: string | null;
    student_name: string;
    grade: string;
    date: string;
    time: string;
    reason: string;
    observations: string;
    recommendations: string;
    created_at?: string;
    psychologist_name?: string;
}

export interface PsychAppointment {
    id?: string;
    psychologist_id?: string;
    student_id?: string | null;
    student_name: string;
    grade: string;
    date: string;
    time: string;
    status: 'pending' | 'completed' | 'cancelled';
    created_at?: string;
}

export interface PsychReminder {
    id?: string;
    psychologist_id?: string;
    title: string;
    description: string;
    type: 'info' | 'warning' | 'success';
    is_completed?: boolean;
    created_at?: string;
}

export interface PsychAppointmentSuggestion {
    id: string;
    incident_id: string;
    incident_correlative: string;
    student_name: string;
    student_grade?: string;
    suggested_by: string;
    suggested_by_name: string;
    reason?: string;
    status: 'pending' | 'accepted' | 'dismissed';
    created_at: string;
}

