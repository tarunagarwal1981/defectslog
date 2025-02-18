// src/hooks/useFields.js

import { useMemo } from 'react';
import { CORE_FIELDS } from '../config/fieldMappings';

export const useFields = (permissions, type = 'DIALOG') => {
  const fields = useMemo(() => {
    if (!permissions?.fields) return [];

    return Object.entries(CORE_FIELDS[type])
      .filter(([fieldId]) => permissions.fields[fieldId]?.visible)
      .sort((a, b) => a[1].displayOrder - b[1].displayOrder)
      .map(([_, field]) => field);
  }, [permissions, type]);

  return fields;
};