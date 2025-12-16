import { deriveIssues } from "../deriveIssues";

test("detects missing fields deterministically", () => {
  const people = [
    { id: "1", managerId: null, team: null, role: null },
    { id: "2", managerId: "1", team: "Ops", role: "Lead" },
  ];

  const issues = deriveIssues(people);
  expect(issues.length).toBe(1);
  expect(issues[0].personId).toBe("1");
  expect(issues[0].issues).toEqual([
    "MISSING_MANAGER",
    "MISSING_TEAM",
    "MISSING_ROLE",
  ]);
});

test("filters out people with no issues", () => {
  const people = [
    { id: "1", managerId: "a", team: "Ops", role: "Lead" },
    { id: "2", managerId: "a", team: "Ops", role: "Dev" },
  ];

  const issues = deriveIssues(people);
  expect(issues.length).toBe(0);
});

test("handles partial missing fields", () => {
  const people = [
    { id: "1", managerId: null, team: "Ops", role: "Lead" },
    { id: "2", managerId: "1", team: null, role: "Dev" },
    { id: "3", managerId: "1", team: "Ops", role: null },
  ];

  const issues = deriveIssues(people);
  expect(issues.length).toBe(3);
  expect(issues[0].issues).toEqual(["MISSING_MANAGER"]);
  expect(issues[1].issues).toEqual(["MISSING_TEAM"]);
  expect(issues[2].issues).toEqual(["MISSING_ROLE"]);
});

test("handles teamName and teamId variants", () => {
  const people = [
    { id: "1", managerId: "a", teamName: "Ops", role: "Lead" },
    { id: "2", managerId: "a", teamId: "team-123", role: "Dev" },
    { id: "3", managerId: "a", team: null, teamName: null, teamId: null, role: "Dev" },
  ];

  const issues = deriveIssues(people);
  expect(issues.length).toBe(1);
  expect(issues[0].personId).toBe("3");
  expect(issues[0].issues).toEqual(["MISSING_TEAM"]);
});

test("handles title and role variants", () => {
  const people = [
    { id: "1", managerId: "a", team: "Ops", title: "Lead" },
    { id: "2", managerId: "a", team: "Ops", role: "Dev" },
    { id: "3", managerId: "a", team: "Ops", title: null, role: null },
  ];

  const issues = deriveIssues(people);
  expect(issues.length).toBe(1);
  expect(issues[0].personId).toBe("3");
  expect(issues[0].issues).toEqual(["MISSING_ROLE"]);
});

