import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Add helper functions for permissions
export const getUserRole = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('role_id')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data?.role_id;
  } catch (error) {
    console.error('Error fetching user role:', error);
    throw error;
  }
};
