import type { UserRole } from "@/lib/auth/roles";

export const permissionModules = [
  "dashboard",
  "companies",
  "contacts",
  "leads",
  "deals",
  "tasks",
  "products",
  "proposals",
  "pipelines",
  "automations",
  "team",
] as const;

export const permissionActions = [
  "view",
  "create",
  "update",
  "delete",
  "manage",
  "approve",
] as const;

export type PermissionModule = (typeof permissionModules)[number];
export type PermissionAction = (typeof permissionActions)[number];
export type PermissionMatrix = Record<
  PermissionModule,
  Partial<Record<PermissionAction, boolean>>
>;

const fullAccess: Partial<Record<PermissionAction, boolean>> = {
  view: true,
  create: true,
  update: true,
  delete: true,
  manage: true,
  approve: true,
};

const sellerWrite: Partial<Record<PermissionAction, boolean>> = {
  view: true,
  create: true,
  update: true,
};

const viewOnly: Partial<Record<PermissionAction, boolean>> = {
  view: true,
};

export const rolePermissions: Record<UserRole, PermissionMatrix> = {
  admin: {
    dashboard: fullAccess,
    companies: fullAccess,
    contacts: fullAccess,
    leads: fullAccess,
    deals: fullAccess,
    tasks: fullAccess,
    products: fullAccess,
    proposals: fullAccess,
    pipelines: fullAccess,
    automations: fullAccess,
    team: fullAccess,
  },
  manager: {
    dashboard: viewOnly,
    companies: sellerWrite,
    contacts: sellerWrite,
    leads: sellerWrite,
    deals: sellerWrite,
    tasks: sellerWrite,
    products: viewOnly,
    proposals: { ...sellerWrite, approve: true },
    pipelines: viewOnly,
    automations: viewOnly,
    team: { view: true, create: true, update: true, manage: true },
  },
  seller: {
    dashboard: viewOnly,
    companies: sellerWrite,
    contacts: sellerWrite,
    leads: sellerWrite,
    deals: sellerWrite,
    tasks: sellerWrite,
    products: viewOnly,
    proposals: sellerWrite,
    pipelines: viewOnly,
    automations: viewOnly,
    team: {},
  },
  readonly: {
    dashboard: viewOnly,
    companies: viewOnly,
    contacts: viewOnly,
    leads: viewOnly,
    deals: viewOnly,
    tasks: viewOnly,
    products: viewOnly,
    proposals: viewOnly,
    pipelines: viewOnly,
    automations: viewOnly,
    team: {},
  },
};

export function hasPermission(
  role: UserRole,
  module: PermissionModule,
  action: PermissionAction,
) {
  return Boolean(rolePermissions[role]?.[module]?.[action]);
}

