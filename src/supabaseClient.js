import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Get user's role from users table
export const getUserRole = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data?.role;
  } catch (error) {
    console.error('Error fetching user role:', error);
    throw error;
  }
};

// Get field permissions for a role
export const getFieldPermissions = async (roleName) => {
  try {
    const { data, error } = await supabase
      .from('role_field_permissions')
      .select('field_name')
      .eq('role_name', roleName);

    if (error) throw error;
    
    // Convert to a map of field names
    return data.reduce((acc, { field_name }) => {
      acc[field_name] = true;
      return acc;
    }, {});
  } catch (error) {
    console.error('Error fetching field permissions:', error);
    throw error;
  }
};

// Get action permissions for a role
export const getActionPermissions = async (roleName) => {
  try {
    const { data, error } = await supabase
      .from('action_permissions')
      .select('action_name')
      .eq('role_name', roleName);

    if (error) throw error;
    
    // Convert to a map of action names
    return data.reduce((acc, { action_name }) => {
      acc[action_name] = true;
      return acc;
    }, {});
  } catch (error) {
    console.error('Error fetching action permissions:', error);
    throw error;
  }
};

// Get all permissions for a user (combines all permission checks)
export const getUserPermissions = async (userId) => {
  try {
    // Get user's role
    const userRole = await getUserRole(userId);
    if (!userRole) throw new Error('User role not found');

    // Get permissions in parallel
    const [fieldPermissions, actionPermissions] = await Promise.all([
      getFieldPermissions(userRole),
      getActionPermissions(userRole)
    ]);

    // Determine if user is external
    const isExternal = userRole === 'external';

    return {
      role: userRole,
      fieldPermissions,
      actionPermissions,
      isExternal,
      // Map common actions to permissions
      can: {
        read: actionPermissions['read'] || false,
        create: actionPermissions['create'] || false,
        update: actionPermissions['update'] || false,
        delete: actionPermissions['delete'] || false
      }
    };
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    throw error;
  }
};

// Helper to check if a defect is visible to external users
export const isDefectVisibleToExternal = (defect) => {
  return defect.external_visibility === true;
};
