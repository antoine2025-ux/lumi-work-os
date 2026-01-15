export default function OrgVisualQAPage() {
  return (
    <div className="px-10 pt-8 pb-10 text-[13px] text-slate-200">
      <h1 className="text-[16px] font-semibold text-slate-50">Org Center Visual QA</h1>
      <p className="mt-1 text-[12px] text-slate-500">
        Use this page to verify spacing, typography, colors, and visual consistency.
      </p>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="hover-card rounded-2xl border border-slate-800 bg-[#020617] p-6">
          <h2 className="text-[14px] font-semibold text-slate-100">Headers</h2>
          <p className="mt-1 text-[12px] text-slate-500">Check consistent padding & hierarchy.</p>
        </div>

        <div className="hover-card rounded-2xl border border-slate-800 bg-[#020617] p-6">
          <h2 className="text-[14px] font-semibold text-slate-100">Cards</h2>
          <p className="mt-1 text-[12px] text-slate-500">Ensure uniform rounded corners, spacing, borders.</p>
        </div>

        <div className="hover-card rounded-2xl border border-slate-800 bg-[#020617] p-6">
          <h2 className="text-[14px] font-semibold text-slate-100">Sidebar</h2>
          <p className="mt-1 text-[12px] text-slate-500">Check active, hover, focus states.</p>
        </div>

        <div className="hover-card rounded-2xl border border-slate-800 bg-[#020617] p-6">
          <h2 className="text-[14px] font-semibold text-slate-100">Tables & Lists</h2>
          <p className="mt-1 text-[12px] text-slate-500">Verify row hover, spacing, alignment.</p>
        </div>

        <div className="hover-card rounded-2xl border border-slate-800 bg-[#020617] p-6">
          <h2 className="text-[14px] font-semibold text-slate-100">Buttons</h2>
          <p className="mt-1 text-[12px] text-slate-500">Check hover, active, focus, disabled states.</p>
        </div>

        <div className="hover-card rounded-2xl border border-slate-800 bg-[#020617] p-6">
          <h2 className="text-[14px] font-semibold text-slate-100">Empty States</h2>
          <p className="mt-1 text-[12px] text-slate-500">Verify consistent styling and messaging.</p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <div className="rounded-2xl border border-slate-800 bg-[#020617] p-6">
          <h2 className="mb-3 text-[14px] font-semibold text-slate-100">Typography Scale</h2>
          <div className="space-y-2">
            <div className="text-[20px] font-semibold text-slate-100">Page Title (20px)</div>
            <div className="text-[14px] font-semibold text-slate-100">Section Title (14px)</div>
            <div className="text-[13px] text-slate-200">Body Text (13px)</div>
            <div className="text-[12px] text-slate-400">Secondary Text (12px)</div>
            <div className="text-[11px] text-slate-500">Meta Text (11px)</div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#020617] p-6">
          <h2 className="mb-3 text-[14px] font-semibold text-slate-100">Color Palette</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="space-y-1">
              <div className="h-12 rounded-lg bg-slate-100"></div>
              <div className="text-[11px] text-slate-400">slate-100</div>
            </div>
            <div className="space-y-1">
              <div className="h-12 rounded-lg bg-slate-300"></div>
              <div className="text-[11px] text-slate-400">slate-300</div>
            </div>
            <div className="space-y-1">
              <div className="h-12 rounded-lg bg-slate-500"></div>
              <div className="text-[11px] text-slate-400">slate-500</div>
            </div>
            <div className="space-y-1">
              <div className="h-12 rounded-lg bg-blue-600"></div>
              <div className="text-[11px] text-slate-400">blue-600</div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#020617] p-6">
          <h2 className="mb-3 text-[14px] font-semibold text-slate-100">Spacing Scale</h2>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-blue-400"></div>
              <span className="text-[12px] text-slate-300">gap-2 (0.5rem)</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="h-2 w-2 rounded-full bg-blue-400"></div>
              <span className="text-[12px] text-slate-300">gap-4 (1rem)</span>
            </div>
            <div className="flex items-center gap-6">
              <div className="h-2 w-2 rounded-full bg-blue-400"></div>
              <span className="text-[12px] text-slate-300">gap-6 (1.5rem)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

