import { test, expect } from "vitest";
import { deriveCompleteness } from "../deriveCompleteness";

test("empty org returns zero completeness", () => {
  expect(deriveCompleteness([])).toEqual({
    reportingLines: 0,
    teams: 0,
    roles: 0,
  });
});

test("partial org computes correctly", () => {
  const people = [
    { id: "1", managerId: "a", team: "X", role: "Dev" },
    { id: "2", managerId: null, team: "X", role: null },
  ];

  const result = deriveCompleteness(people);
  expect(result.reportingLines).toBe(50);
  expect(result.teams).toBe(100);
  expect(result.roles).toBe(50);
});

test("complete org returns 100%", () => {
  const people = [
    { id: "1", managerId: "a", team: "X", role: "Dev" },
    { id: "2", managerId: "1", team: "Y", role: "Lead" },
  ];

  const result = deriveCompleteness(people);
  expect(result.reportingLines).toBe(100);
  expect(result.teams).toBe(100);
  expect(result.roles).toBe(100);
});

test("handles teamName and teamId variants", () => {
  const people = [
    { id: "1", managerId: "a", teamName: "X", role: "Dev" },
    { id: "2", managerId: "a", teamId: "team-123", role: "Dev" },
    { id: "3", managerId: "a", team: null, role: "Dev" },
  ];

  const result = deriveCompleteness(people);
  expect(result.teams).toBe(67); // 2 out of 3 have teams
});

test("handles title and role variants", () => {
  const people = [
    { id: "1", managerId: "a", team: "X", title: "Dev" },
    { id: "2", managerId: "a", team: "X", role: "Lead" },
    { id: "3", managerId: "a", team: "X", title: null, role: null },
  ];

  const result = deriveCompleteness(people);
  expect(result.roles).toBe(67); // 2 out of 3 have roles
});

