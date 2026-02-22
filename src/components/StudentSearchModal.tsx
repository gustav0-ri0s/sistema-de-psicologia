import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Search, X, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Student {
    id: string;
    first_name: string;
    last_name: string;
    classrooms?: {
        level: string;
        grade: string;
        section: string;
    };
}

interface StudentSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (studentName: string, gradeAndSection: string) => void;
}

const StudentSearchModal: React.FC<StudentSearchModalProps> = ({ isOpen, onClose, onSelect }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setSearchTerm('');
            setStudents([]);
        }
    }, [isOpen]);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (searchTerm.length >= 2) {
                searchStudents();
            } else {
                setStudents([]);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    const searchStudents = async () => {
        setLoading(true);

        let query = supabase
            .from('students')
            .select(`
                id,
                first_name,
                last_name,
                classrooms:classrooms!students_classroom_id_fkey(level, grade, section)
            `);

        const words = searchTerm.trim().split(/\s+/).filter(w => w.length > 0);
        words.forEach(word => {
            query = query.or(`first_name.ilike.%${word}%,last_name.ilike.%${word}%`);
        });

        const { data, error } = await query.limit(10);

        if (error) {
            console.error(error);
        } else {
            setStudents(data as any);
        }
        setLoading(false);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
                    <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh] relative z-10">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                <Search className="text-primary" size={20} />
                                Buscar Estudiante
                            </h3>
                            <button onClick={onClose} className="text-gray-400 hover:bg-gray-200 p-2 rounded-xl transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-4 border-b border-gray-100 relative bg-white">
                            <Search className="absolute left-7 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar por nombres o apellidos..."
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium text-gray-800 box-border"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                autoFocus
                            />
                        </div>

                        <div className="overflow-y-auto p-3 flex-1 min-h-[100px] bg-gray-50/30">
                            {loading ? (
                                <div className="flex justify-center py-10">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                </div>
                            ) : students.length > 0 ? (
                                <div className="space-y-2">
                                    {students.map(student => {
                                        const fullName = `${student.first_name || ''} ${student.last_name || ''}`.trim();
                                        let gradeStr = 'Sin grado asignado';
                                        if (student.classrooms) {
                                            const c = student.classrooms as any;
                                            const levelStr = c.level ? c.level.charAt(0).toUpperCase() + c.level.slice(1) : '';
                                            gradeStr = `${c.grade} ${c.section} - ${levelStr}`;
                                        }

                                        return (
                                            <button
                                                key={student.id}
                                                className="w-full bg-white hover:bg-primary/5 p-4 rounded-xl transition-all shadow-sm flex items-center justify-between group border border-gray-100 hover:border-primary/20 text-left active:scale-[0.98]"
                                                onClick={() => {
                                                    onSelect(fullName, gradeStr);
                                                    onClose();
                                                }}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors border border-gray-100">
                                                        <User size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-800 text-lg">{fullName}</p>
                                                        <p className="text-sm font-semibold text-secondary">{gradeStr}</p>
                                                    </div>
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            ) : searchTerm.length >= 2 ? (
                                <div className="text-center py-12 text-gray-500 font-medium">
                                    No se encontraron estudiantes con ese nombre.
                                </div>
                            ) : (
                                <div className="text-center py-12 text-gray-400 font-medium">
                                    Escribe al menos 2 caracteres para comenzar a buscar.
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default StudentSearchModal;
