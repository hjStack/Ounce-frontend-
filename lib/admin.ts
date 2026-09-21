import type { Member, RoleClaim } from "../types/api";


function roleName(role: RoleClaim | undefined) {
    if (typeof role === "string") return role;
    return role?.authority ?? role?.role ?? role?.name ?? "";
}

function isAdminRole(role: string | undefined) {
    const normalized = role?.trim().toUpperCase();
    return normalized === "ADMIN" || normalized === "ROLE_ADMIN";
}

export function hasAdminAccess(user: Member | null | undefined) {
    if (!user) return false;

    const directRoles = [user.role, user.authority];
    const roleClaims = [...(user.authorities ?? []), ...(user.roles ?? [])];

    return (
        directRoles.some(isAdminRole) ||
        roleClaims.some((role) => isAdminRole(roleName(role)))
    );
}
