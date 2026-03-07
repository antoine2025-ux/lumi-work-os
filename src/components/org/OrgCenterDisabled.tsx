export function OrgCenterDisabled() {
  return (
    <div className="px-10 pt-10">
      <div className="max-w-lg rounded-2xl border border-border bg-background p-6 text-[13px] text-foreground">
        <div className="text-[15px] font-semibold text-foreground">
          Org Center temporarily unavailable
        </div>
        <p className="mt-2 text-[12px] text-muted-foreground">
          We&apos;re currently performing maintenance on Org Center.
          <br />
          Please check back later.
        </p>
      </div>
    </div>
  );
}

