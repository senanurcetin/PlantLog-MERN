/** Explicit RBAC rules shared by routes, controllers and policy tests. */
export const canManageAssets = (role?: string): boolean =>
    role === 'admin' || role === 'supervisor';

export const canEditLog = (role: string | undefined, authorId: string, userId?: string): boolean =>
    canManageAssets(role) || (role === 'operator' && Boolean(userId) && authorId === userId);
