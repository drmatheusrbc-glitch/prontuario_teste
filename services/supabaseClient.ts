import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gcyfvqzvpetbtzwisxnk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjeWZ2cXp2cGV0YnR6d2lzeG5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2Nzk3NjksImV4cCI6MjA3OTI1NTc2OX0.ncG88xJtmA6CZbJ2tBs5hAb7twzxBpGeXQNHotwq7os';

export const supabase = createClient(supabaseUrl, supabaseKey);