import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xqfykowofjswojwgdcmj.supabase.co';
const supabaseKey = 'sb_publishable_JJbQ8nbviraPOE-zV8eX6w_fa9lb7R1';

export const supabase = createClient(supabaseUrl, supabaseKey);