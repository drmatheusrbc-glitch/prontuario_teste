import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gcyfvqzvpetbtzwisxnk.supabase.co';
const supabaseKey = 'sb_publishable_gThU7QaY6lxP1G3KmW0SuA_f3-DOYlw';

export const supabase = createClient(supabaseUrl, supabaseKey);
