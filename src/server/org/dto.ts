/**
 * DTO (Data Transfer Object) types for Org API responses.
 * These types define the contract between server and client.
 */

export type OrgAvailabilityStatus =
  | "UNKNOWN"
  | "AVAILABLE"
  | "PARTIALLY_AVAILABLE"
  | "UNAVAILABLE";

export type OrgPersonDTO = {
  id: string;
  userId: string;
  fullName: string;
  email: string | null;
  title: string | null;
  department: { id: string; name: string } | null;
  team: { id: string; name: string } | null;
  manager: { id: string; fullName: string } | null;
  directReports: Array<{ id: string; fullName: string }>;
  availabilityStatus: OrgAvailabilityStatus;
  availabilityUpdatedAt: string | null;
  availabilityStale: boolean;
};

export type OrgPeopleListDTO = {
  people: Array<Pick<
    OrgPersonDTO,
    "id" | "userId" | "fullName" | "email" | "title" | "department" | "team" | "manager" | "availabilityStatus" | "availabilityUpdatedAt" | "availabilityStale"
  >>;
};

export type OrgStructureDTO = {
  departments: Array<{
    id: string;
    name: string;
    ownerPersonId: string | null;
    teams: Array<{
      id: string;
      name: string;
      ownerPersonId: string | null;
      memberCount: number;
    }>;
  }>;
  teams: Array<{
    id: string;
    name: string;
    departmentId: string | null;
    ownerPersonId: string | null;
    memberCount: number;
  }>;
};

export type OrgOwnershipDTO = {
  coverage: {
    teams: { total: number; owned: number; unowned: number };
    departments: { total: number; owned: number; unowned: number };
  };
  unowned: Array<
    | { entityType: "TEAM"; entityId: string; name: string; departmentName: string | null; suggestedOwnerPersonId: string | null }
    | { entityType: "DEPARTMENT"; entityId: string; name: string; suggestedOwnerPersonId: string | null }
  >;
  assignments: Array<{
    id: string;
    entityType: "TEAM" | "DEPARTMENT";
    entityId: string;
    owner: { id: string; fullName: string };
  }>;
};

