/**
 * User time off for profile page
 *
 * Queries PersonAvailability (type=UNAVAILABLE) and approved LeaveRequests
 * for upcoming absences, and computes PTO balance from VACATION + OTHER.
 */

import { prisma } from "@/lib/db";
import {
  startOfDay,
  startOfYear,
  endOfYear,
  differenceInDays,
} from "date-fns";

export interface TimeOffAbsence {
  id: string;
  startDate: Date;
  endDate: Date;
  type: string;
  status: string;
  daysCount: number;
}

export interface PendingLeaveRequest {
  id: string;
  startDate: Date;
  endDate: Date;
  leaveType: string;
  daysCount: number;
  status: string;
}

export interface TimeOffData {
  upcomingAbsences: TimeOffAbsence[];
  pendingRequests: PendingLeaveRequest[];
  remainingPTO: number;
  usedPTO: number;
  totalPTO: number;
}

const TOTAL_PTO_DAYS = 20;
const PTO_REASONS = ["VACATION", "OTHER"] as const;
export async function getUserTimeOff(
  userId: string,
  workspaceId: string
): Promise<TimeOffData> {
  const today = startOfDay(new Date());
  const yearStart = startOfYear(new Date());
  const yearEnd = endOfYear(new Date());

  const [upcomingAvailability, yearRecords, approvedLeaveRequests, pendingLeaveRequests] = await Promise.all([
    prisma.personAvailability.findMany({
      where: {
        workspaceId,
        personId: userId,
        type: "UNAVAILABLE",
        OR: [
          { endDate: { gte: today } },
          { endDate: null },
        ],
      },
      orderBy: { startDate: "asc" },
      take: 5,
      select: {
        id: true,
        startDate: true,
        endDate: true,
        reason: true,
      },
    }),
    prisma.personAvailability.findMany({
      where: {
        workspaceId,
        personId: userId,
        type: "UNAVAILABLE",
        reason: { in: [...PTO_REASONS] },
        startDate: { lte: yearEnd },
        OR: [
          { endDate: { gte: yearStart } },
          { endDate: null },
        ],
      },
      select: {
        startDate: true,
        endDate: true,
      },
    }),
    prisma.leaveRequest.findMany({
      where: {
        workspaceId,
        personId: userId,
        status: "APPROVED",
        endDate: { gte: today },
      },
      orderBy: { startDate: "asc" },
      take: 5,
      select: {
        id: true,
        startDate: true,
        endDate: true,
        leaveType: true,
      },
    }),
    prisma.leaveRequest.findMany({
      where: {
        workspaceId,
        personId: userId,
        status: "PENDING",
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        leaveType: true,
        status: true,
      },
    }),
  ]);

  const fromAvailability: TimeOffAbsence[] = upcomingAvailability.map((r) => {
    const end = r.endDate ?? r.startDate;
    const daysCount = differenceInDays(end, r.startDate) + 1;
    return {
      id: r.id,
      startDate: r.startDate,
      endDate: r.endDate ?? r.startDate,
      type: r.reason ?? "OTHER",
      status: "approved",
      daysCount: Math.max(1, daysCount),
    };
  });

  const fromLeaveRequests: TimeOffAbsence[] = approvedLeaveRequests.map((r) => {
    const daysCount = differenceInDays(r.endDate, r.startDate) + 1;
    return {
      id: r.id,
      startDate: r.startDate,
      endDate: r.endDate,
      type: r.leaveType === "VACATION" ? "VACATION" : r.leaveType === "SICK" ? "SICK_LEAVE" : "OTHER",
      status: "approved",
      daysCount: Math.max(1, daysCount),
    };
  });

  const seen = new Set<string>();
  const upcomingAbsences = [...fromAvailability, ...fromLeaveRequests]
    .filter((a) => {
      const key = `${a.startDate.toISOString()}-${a.endDate.toISOString()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
    .slice(0, 5);

  const usedPTO = yearRecords.reduce((sum, r) => {
    const end = r.endDate ?? r.startDate;
    const start = r.startDate;
    const effectiveEnd = end > yearEnd ? yearEnd : end;
    const effectiveStart = start < yearStart ? yearStart : start;
    if (effectiveEnd < effectiveStart) return sum;
    return sum + differenceInDays(effectiveEnd, effectiveStart) + 1;
  }, 0);

  const remainingPTO = Math.max(0, TOTAL_PTO_DAYS - usedPTO);

  const pendingRequests: PendingLeaveRequest[] = pendingLeaveRequests.map((r) => ({
    id: r.id,
    startDate: r.startDate,
    endDate: r.endDate,
    leaveType: r.leaveType,
    daysCount: differenceInDays(r.endDate, r.startDate) + 1,
    status: r.status,
  }));

  return {
    upcomingAbsences,
    pendingRequests,
    remainingPTO,
    usedPTO,
    totalPTO: TOTAL_PTO_DAYS,
  };
}
