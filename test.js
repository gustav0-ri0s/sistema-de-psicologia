import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://tywfdovkrfjoirdcdlxi.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5d2Zkb3ZrcmZqb2lyZGNkbHhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMzEyNzksImV4cCI6MjA4NTcwNzI3OX0.qqkdcJ3uFX3Ji_p-AjbSwGXfk8PtSCLMyM8Jj2GKMP4');

async function test() {
    const searchTerm = 'arya';
    const { data, error } = await supabase
        .from('students')
        .select(`
        id,
        first_name,
        last_name,
        classrooms!students_classroom_id_fkey (
          level,
          grade,
          section
        )
      `)
        .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%`)
        .limit(10);
    console.log('Error:', error);
    console.log('Data:', JSON.stringify(data, null, 2));
}
test();
