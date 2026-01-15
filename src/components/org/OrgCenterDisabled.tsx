export function OrgCenterDisabled() {
  return (
    <div className="px-10 pt-10">
      <div className="max-w-lg rounded-2xl border border-slate-800 bg-[#020617] p-6 text-[13px] text-slate-200">
        <div className="text-[15px] font-semibold text-slate-100">
          Org Center temporarily unavailable
        </div>
        <p className="mt-2 text-[12px] text-slate-500">
          We're currently performing maintenance on Org Center.
          <br />
          Please check back later.
        </p>
      </div>
    </div>
  );
}

