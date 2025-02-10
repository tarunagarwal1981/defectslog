import { supabase } from '../supabaseClient';

export const fetchUserPermissions = async (userId, roleId) => {
  try {
    // Fetch field permissions
    const { data: fieldPermissions, error: fieldError } = await supabase
      .from('role_field_permissions')
      .select('*')
      .eq('role_id', roleId);

    if (fieldError) throw fieldError;

    // Fetch action permissions
    const { data: actionPermissions, error: actionError } = await supabase
      .from('action_permissions')
      .select('*')
      .eq('role_id', roleId);

    if (actionError) throw actionError;

    // Process permissions
    const allowedFields = fieldPermissions.map(perm => perm.field_name);
    const actions = actionPermissions.reduce((acc, perm) => {
      acc[perm.action_name] = perm.is_allowed;
      return acc;
    }, {});

    return {
      allowedFields,
      actions,
    };
  } catch (error) {
    console.error('Error fetching permissions:', error);
    throw error;
  }
};

export const filterDefectsByPermissions = (defects, userRole, permissions) => {
  return defects.filter(defect => {
    // For external users, only show defects with external_visibility = true
    if (userRole === 'external' && !defect.external_visibility) {
      return false;
    }
    return true;
  });
};

export const filterDefectFieldsByPermissions = (defect, allowedFields) => {
  if (!allowedFields) return defect;
  
  const filteredDefect = {};
  allowedFields.forEach(field => {
    if (defect.hasOwnProperty(field)) {
      filteredDefect[field] = defect[field];
    }
  });
  return filteredDefect;
};
