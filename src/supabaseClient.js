import { createClient } from '@supabase/supabase-js';
import { CORE_FIELDS } from './config/fieldMappings';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Get user's role
export const getUserRole = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('email', userId)
      .single();

    if (error) throw error;
    return data?.role;
  } catch (error) {
    console.error('Error fetching user role:', error);
    throw error;
  }
};

// Get user's field permissions
export const getFieldPermissions = async (userRole) => {
  try {
    const { data, error } = await supabase
      .from('role_field_permissions')
      .select('field_name')
      .eq('role_name', userRole);

    if (error) throw error;
    
    // Transform into an easily accessible format
    // If a field is in the list, it's visible and editable
    return data.reduce((acc, perm) => {
      acc[perm.field_name] = {
        visible: true,
        editable: true
      };
      return acc;
    }, {});
  } catch (error) {
    console.error('Error fetching field permissions:', error);
    throw error;
  }
};

// Get user's action permissions
export const getActionPermissions = async (userRole) => {
  try {
    const { data, error } = await supabase
      .from('action_permissions')
      .select('action')
      .eq('role', userRole);

    if (error) throw error;

    // Initialize all actions as false
    const actions = {
      create: false,
      read: false,
      update: false,
      delete: false
    };
    
    // Set permitted actions to true
    data.forEach(perm => {
      actions[perm.action] = true;
    });
    
    return actions;
  } catch (error) {
    console.error('Error fetching action permissions:', error);
    throw error;
  }
};

// Get all user permissions
export const getUserPermissions = async (userId) => {
  try {
    console.log("Getting permissions for user:", userId);
    
    // Fetch user role
    const userRole = await getUserRole(userId);
    console.log("User role:", userRole);
    
    if (!userRole) {
      console.warn("No role found for user");
      return {
        actions: { create: false, read: false, update: false, delete: false },
        fields: {}
      };
    }
    
    // Fetch action permissions
    const actions = await getActionPermissions(userRole);
    console.log("Action permissions:", actions);
    
    // Fetch field permissions
    const fieldPermissionsData = await getFieldPermissions(userRole);
    console.log("Field permissions:", fieldPermissionsData);
    
    // Initialize field visibility to false for all fields
    const fields = {};
    Object.keys(CORE_FIELDS.TABLE).forEach(fieldId => {
      fields[fieldId] = {
        visible: false,
        editable: false
      };
    });
    
    // Update permissions for fields that are explicitly allowed
    Object.keys(fieldPermissionsData).forEach(fieldName => {
      if (fields[fieldName]) {
        fields[fieldName] = fieldPermissionsData[fieldName];
      }
    });
    
    return {
      actions,
      fields
    };
    
  } catch (error) {
    console.error('Error in getUserPermissions:', error);
    return {
      actions: { create: false, read: false, update: false, delete: false },
      fields: {}
    };
  }
};

// Check if user is external
export const isExternalUser = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('email', userId)
      .single();

    if (error) throw error;
    return data.role === 'external';
  } catch (error) {
    console.error('Error checking user role:', error);
    throw error;
  }
};

// Get vessels assigned to user
export const getUserVessels = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('user_vessels')
      .select(`
        vessel_id,
        vessels!inner (
          vessel_id,
          vessel_name
        )
      `)
      .eq('user_id', userId);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching user vessels:', error);
    throw error;
  }
};

// Check specific permission
export const checkPermission = async (userId, action, field = null) => {
  try {
    const permissions = await getUserPermissions(userId);
    
    // Check action permission
    if (action && !permissions.actions[action]) {
      return false;
    }

    // Check field permission if provided
    if (field && !permissions.fields[field]?.visible) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error checking permission:', error);
    throw error;
  }
};

// Get defects based on user permissions
export const getDefects = async (userId, vesselIds) => {
  try {
    const isExternal = await isExternalUser(userId);

    let query = supabase
      .from('defects register')
      .select('*')
      .eq('is_deleted', false)
      .in('vessel_id', vesselIds)
      .order('Date Reported', { ascending: false });

    // Add external visibility filter for external users
    if (isExternal) {
      query = query.eq('external_visibility', true);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;

  } catch (error) {
    console.error('Error fetching defects:', error);
    throw error;
  }
};

// Save defect with permission check
export const saveDefect = async (userId, defectData, isNew = false) => {
  try {
    // Check permissions
    const canPerformAction = await checkPermission(
      userId, 
      isNew ? 'create' : 'update'
    );

    if (!canPerformAction) {
      throw new Error('Permission denied');
    }

    if (isNew) {
      const { data, error } = await supabase
        .from('defects register')
        .insert([defectData])
        .select('*')
        .single();

      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase
        .from('defects register')
        .update(defectData)
        .eq('id', defectData.id)
        .select('*')
        .single();

      if (error) throw error;
      return data;
    }
  } catch (error) {
    console.error('Error saving defect:', error);
    throw error;
  }
};

// Delete defect with permission check
export const deleteDefect = async (userId, defectId) => {
  try {
    const canDelete = await checkPermission(userId, 'delete');
    if (!canDelete) {
      throw new Error('Permission denied');
    }

    const { error } = await supabase
      .from('defects register')
      .update({
        is_deleted: true,
        deleted_by: userId,
        deleted_at: new Date().toISOString()
      })
      .eq('id', defectId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting defect:', error);
    throw error;
  }
};