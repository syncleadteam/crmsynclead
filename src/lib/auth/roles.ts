export const userRoles = ["admin", "manager", "seller", "readonly"] as const;

export type UserRole = (typeof userRoles)[number];

export const roleLabels: Record<UserRole, string> = {
  admin: "Admin",
  manager: "Gestor",
  seller: "Vendedor",
  readonly: "Somente leitura",
};

export function canManageUsers(role: UserRole) {
  return role === "admin";
}

export function canManageTeams(role: UserRole) {
  return role === "admin" || role === "manager";
}
