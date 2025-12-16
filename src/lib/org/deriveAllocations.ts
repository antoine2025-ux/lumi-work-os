export type AllocationWindow = {
  projectId: string;
  fraction: number; // 0..1
  startDate: Date;
  endDate?: Date;
};

export function activeAllocationsAt(
  windows: AllocationWindow[],
  at: Date = new Date()
) {
  return windows.filter(
    (w) => w.startDate <= at && (!w.endDate || w.endDate >= at)
  );
}

export function sumAllocationFraction(
  windows: AllocationWindow[],
  at: Date = new Date()
) {
  const active = activeAllocationsAt(windows, at);
  return active.reduce((sum, w) => sum + (w.fraction || 0), 0);
}

