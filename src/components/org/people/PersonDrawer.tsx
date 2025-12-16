"use client";

import { X, Copy, ExternalLink, Building2, Users, Briefcase, Mail, User } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { OrgPerson } from "@/types/org";

type PersonDrawerProps = {
  person: OrgPerson | null;
  isOpen: boolean;
  onClose: () => void;
  orgId?: string;
};

function getInitials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || "?";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}

export function PersonDrawer({ person, isOpen, onClose, orgId }: PersonDrawerProps) {
  if (!person) return null;

  const initials = getInitials(person.name);
  const hasOrgId = !!orgId;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-lg bg-slate-900 border-white/10 text-slate-100"
        onInteractOutside={(e) => {
          // Allow closing on outside click
        }}
      >
        <DialogHeader className="space-y-4 pb-4 border-b border-white/10">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <Avatar className="h-16 w-16 border border-white/10 shrink-0">
              <AvatarFallback className="bg-slate-800 text-slate-200 text-lg font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>

            {/* Name + Role */}
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl font-semibold text-slate-100 mb-1">
                {person.name || "Unknown"}
              </DialogTitle>
              {person.role && (
                <p className="text-sm text-slate-400">{person.role}</p>
              )}
            </div>

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Key Facts */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Details
            </h3>
            <div className="space-y-2.5">
              {/* Email */}
              {person.email && (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Mail className="h-4 w-4 text-slate-500 shrink-0" />
                    <span className="text-sm text-slate-400 truncate">{person.email}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(person.email!)}
                    className="h-7 px-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                  >
                    <Copy className="h-3.5 w-3.5 mr-1" />
                    Copy
                  </Button>
                </div>
              )}

              {/* Department */}
              {person.department && (
                <div className="flex items-center gap-2.5">
                  <Building2 className="h-4 w-4 text-slate-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-slate-500">Department</span>
                    <p className="text-sm text-slate-200 truncate">{person.department}</p>
                  </div>
                </div>
              )}

              {/* Team */}
              {person.team && (
                <div className="flex items-center gap-2.5">
                  <Users className="h-4 w-4 text-slate-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-slate-500">Team</span>
                    <p className="text-sm text-slate-200 truncate">{person.team}</p>
                  </div>
                </div>
              )}

              {/* Role (if not already shown in header) */}
              {person.role && (
                <div className="flex items-center gap-2.5">
                  <Briefcase className="h-4 w-4 text-slate-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-slate-500">Role</span>
                    <p className="text-sm text-slate-200 truncate">{person.role}</p>
                  </div>
                </div>
              )}

              {/* Location (if available) */}
              {person.location && (
                <div className="flex items-center gap-2.5">
                  <User className="h-4 w-4 text-slate-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-slate-500">Location</span>
                    <p className="text-sm text-slate-200 truncate">{person.location}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Links */}
          {hasOrgId && (
            <div className="space-y-3 pt-4 border-t border-white/10">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Quick Links
              </h3>
              <div className="space-y-2">
                {/* View in Org Chart */}
                <Link
                  href={`/org/org-chart${person.departmentId ? `?departmentId=${person.departmentId}` : ""}`}
                  className={cn(
                    "flex items-center justify-between gap-2",
                    "px-3 py-2 rounded-lg",
                    "bg-slate-800/50 hover:bg-slate-800",
                    "text-sm text-slate-200",
                    "transition-colors"
                  )}
                  onClick={onClose}
                >
                  <span>View in Org Chart</span>
                  <ExternalLink className="h-4 w-4 text-slate-400" />
                </Link>

                {/* View in Structure (if department available) */}
                {person.departmentId && (
                  <Link
                    href={`/org/structure?departmentId=${person.departmentId}`}
                    className={cn(
                      "flex items-center justify-between gap-2",
                      "px-3 py-2 rounded-lg",
                      "bg-slate-800/50 hover:bg-slate-800",
                      "text-sm text-slate-200",
                      "transition-colors"
                    )}
                    onClick={onClose}
                  >
                    <span>View in Structure</span>
                    <ExternalLink className="h-4 w-4 text-slate-400" />
                  </Link>
                )}

                {/* Filter by Team */}
                {person.teamId && (
                  <Link
                    href={`/org/people?teamId=${person.teamId}`}
                    className={cn(
                      "flex items-center justify-between gap-2",
                      "px-3 py-2 rounded-lg",
                      "bg-slate-800/50 hover:bg-slate-800",
                      "text-sm text-slate-200",
                      "transition-colors"
                    )}
                    onClick={onClose}
                  >
                    <span>View Team Members</span>
                    <ExternalLink className="h-4 w-4 text-slate-400" />
                  </Link>
                )}

                {/* Filter by Department */}
                {person.departmentId && (
                  <Link
                    href={`/org/people?departmentId=${person.departmentId}`}
                    className={cn(
                      "flex items-center justify-between gap-2",
                      "px-3 py-2 rounded-lg",
                      "bg-slate-800/50 hover:bg-slate-800",
                      "text-sm text-slate-200",
                      "transition-colors"
                    )}
                    onClick={onClose}
                  >
                    <span>View Department Members</span>
                    <ExternalLink className="h-4 w-4 text-slate-400" />
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

