"use client";

type RolePillGroupProps = {
  baseRole: string; // "OWNER" | "ADMIN" | "MEMBER"
  customRoleName?: string | null;
};

export function RolePillGroup({ baseRole, customRoleName }: RolePillGroupProps) {
  const baseLabel =
    baseRole === "OWNER"
      ? "Owner"
      : baseRole === "ADMIN"
      ? "Admin"
      : "Member";

  const baseColorClass =
    baseRole === "OWNER"
      ? "bg-purple-100 text-purple-800"
      : baseRole === "ADMIN"
      ? "bg-emerald-100 text-emerald-800"
      : "bg-slate-100 text-slate-800";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${baseColorClass}`}
      >
        {baseLabel}
      </span>
      {customRoleName && (
        <span className="inline-flex items-center rounded-full border border-blue-500/60 bg-blue-500/10 px-2 py-0.5 text-[11px] text-blue-100">
          {customRoleName}
        </span>
      )}
    </div>
  );
}

