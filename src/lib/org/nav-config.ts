/**
 * Org Navigation Configuration
 * 
 * Centralized configuration for org module navigation items with role-based access control.
 * This module defines all nav items and provides utilities for filtering based on user role.
 */

import {
  User,
  Users,
  Building2,
  Activity,
  Settings,
  LayoutGrid,
} from "lucide-react";

export type NavItemRole = 'VIEWER' | 'MEMBER' | 'ADMIN' | 'OWNER';

export type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredRole: NavItemRole;
};

/**
 * My Profile section items
 */
export const MY_PROFILE_ITEMS: NavItem[] = [
  { href: '/profile', label: 'My Profile', icon: User, requiredRole: 'VIEWER' },
];

/**
 * My Team section items
 */
export const MY_TEAM_ITEMS: NavItem[] = [
  { href: '/my-team', label: 'Team Overview', icon: Users, requiredRole: 'VIEWER' },
];

/**
 * Organization section items
 */
export const ORG_SECTION_ITEMS: NavItem[] = [
  { href: '/chart', label: 'Org Chart', icon: Building2, requiredRole: 'VIEWER' },
];

/**
 * Admin section items
 */
export const ADMIN_SECTION_ITEMS: NavItem[] = [
  { href: '/people', label: 'People', icon: Users, requiredRole: 'ADMIN' },
  { href: '/management', label: 'Org Management', icon: LayoutGrid, requiredRole: 'ADMIN' },
  { href: '/admin', label: 'Health', icon: Activity, requiredRole: 'ADMIN' },
  { href: '/admin/settings', label: 'Settings', icon: Settings, requiredRole: 'ADMIN' },
];

/**
 * Role hierarchy for access control
 */
const ROLE_HIERARCHY: Record<NavItemRole, number> = {
  VIEWER: 1,
  MEMBER: 2,
  ADMIN: 3,
  OWNER: 4,
};

/**
 * Check if user role meets required role level
 */
export function hasRequiredRole(userRole: NavItemRole, requiredRole: NavItemRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Filter nav items based on user role
 */
export function filterNavItems(
  items: NavItem[],
  userRole: NavItemRole
): NavItem[] {
  return items.filter(item => {
    // Check role requirement
    return hasRequiredRole(userRole, item.requiredRole);
  });
}
