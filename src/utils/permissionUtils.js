// src/utils/permissionUtils.js

export const checkPermission = (permissions, action, field = null) => {
  if (!permissions) return false;

  // Check action permission
  if (action && !permissions.actions[action]) {
    return false;
  }

  // Check field permission if provided
  if (field && !permissions.fields[field]?.visible) {
    return false;
  }

  return true;
};

export const canEdit = (permissions, field) => {
  if (!permissions?.fields[field]) return false;
  return permissions.fields[field].editable;
};

export const getVisibleFields = (permissions, fields) => {
  if (!permissions?.fields) return [];
  return fields.filter(field => permissions.fields[field.id]?.visible);
};