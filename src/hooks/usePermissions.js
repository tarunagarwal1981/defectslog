// src/hooks/usePermissions.js

import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export const usePermissions = (userRole) => {
  const [permissions, setPermissions] = useState({
    fields: {},
    actions: {},
    loading: true,
    error: null
  });

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        // Fetch field permissions
        const { data: fieldPerms, error: fieldError } = await supabase
          .from('role_field_permissions')
          .select('*')
          .eq('role_name', userRole);

        if (fieldError) throw fieldError;

        // Fetch action permissions
        const { data: actionPerms, error: actionError } = await supabase
          .from('action_permissions')
          .select('*')
          .eq('role', userRole)
          .eq('resource', 'defects');

        if (actionError) throw actionError;

        // Transform permissions into easily accessible format
        const fieldPermissions = fieldPerms.reduce((acc, perm) => {
          acc[perm.field_name] = {
            visible: true,
            editable: true
          };
          return acc;
        }, {});

        const actionPermissions = actionPerms.reduce((acc, perm) => {
          acc[perm.action] = true;
          return acc;
        }, {});

        setPermissions({
          fields: fieldPermissions,
          actions: actionPermissions,
          loading: false,
          error: null
        });

      } catch (error) {
        console.error('Error fetching permissions:', error);
        setPermissions(prev => ({
          ...prev,
          loading: false,
          error: error.message
        }));
      }
    };

    if (userRole) {
      fetchPermissions();
    }
  }, [userRole]);

  return permissions;
};