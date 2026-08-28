// The fixed catalog of things a role can be allowed to do. Custom roles are granted a subset;
// the "admin" system role implicitly has all of them.
export const PERMISSIONS = {
  "users.manage": "Manage users & teams",
  "roles.manage": "Manage roles & permissions",
  "settings.manage": "Edit organization settings",
  "sources.manage": "Manage lead sources & webhooks",
  "templates.manage": "Manage message templates",
  "leads.delete": "Delete leads",
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as PermissionKey[];

// Defaults for the two shared system roles.
export const SYSTEM_ROLE_PERMISSIONS: Record<string, PermissionKey[]> = {
  admin: ALL_PERMISSIONS,
  member: [],
};
