/**
 * Loopbrain Snapshot Tests
 * 
 * Validates that all Q1–Q9 endpoints return stable, schema-consistent responses.
 * Uses normalized snapshots to avoid flakiness from dynamic IDs and timestamps.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { normalizeLoopbrainResponse } from '../testing/normalize';
import fs from 'node:fs';
import path from 'node:path';

// Base URL for API calls (assumes dev server running)
const BASE_URL = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

// Load fixture IDs
let fixtures: {
  orgId: string;
  workspaceId: string;
  people: {
    alexId: string;
    samId: string;
    danaId: string;
    chrisId: string;
  };
  projects: {
    paymentsId: string;
    incidentId: string;
    expansionId: string;
    cleanupId: string;
  };
};

// Fixed timeframe for Q4/Q9
const timeframeStart = '2025-12-16T00:00:00.000Z';
const timeframeEnd = '2026-01-31T00:00:00.000Z';

beforeAll(() => {
  // Load fixture IDs
  const fixturePath = path.join(process.cwd(), 'loopbrain-fixtures.json');
  if (!fs.existsSync(fixturePath)) {
    throw new Error(
      `Fixture file not found: ${fixturePath}\n` +
      'Run: npm run seed:loopbrain'
    );
  }
  const fixtureData = fs.readFileSync(fixturePath, 'utf-8');
  fixtures = JSON.parse(fixtureData);
});

async function callEndpoint(url: string): Promise<any> {
  const response = await fetch(url);
  
  if (response.status >= 500) {
    const text = await response.text();
    throw new Error(`Server error ${response.status}: ${text}`);
  }
  
  const text = await response.text();
  if (!text || text.trim() === '') {
    throw new Error(`Empty response from ${url} (status: ${response.status})`);
  }
  
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(`Invalid JSON from ${url} (status: ${response.status}): ${text.substring(0, 200)}`);
  }
}

describe('Loopbrain Q1–Q9 Snapshot Tests', () => {
  describe('Q1: Who owns this?', () => {
    it('should return stable response for healthy project', async () => {
      const url = `${BASE_URL}/api/loopbrain/q1?projectId=${fixtures.projects.paymentsId}`;
      const response = await callEndpoint(url);
      const normalized = normalizeLoopbrainResponse(response);
      expect(normalized).toMatchSnapshot();
    });
  });

  describe('Q2: Who decides this?', () => {
    it('should return stable response for healthy project', async () => {
      const url = new URL(`/api/loopbrain/q2?projectId=${fixtures.projects.paymentsId}`, BASE_URL).toString();
      const response = await callEndpoint(url);
      const normalized = normalizeLoopbrainResponse(response);
      expect(normalized).toMatchSnapshot();
    });
  });

  describe('Q3: Who should be working on this?', () => {
    it('should return stable response for constrained project', async () => {
      const url = new URL(`/api/loopbrain/org/q3`, BASE_URL).toString();
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: fixtures.projects.incidentId }),
      });
      
      if (response.status >= 500) {
        const text = await response.text();
        throw new Error(`Server error ${response.status}: ${text}`);
      }
      
      const text = await response.text();
      if (!text || text.trim() === '') {
        throw new Error(`Empty response from ${url} (status: ${response.status})`);
      }
      
      const data = JSON.parse(text);
      const normalized = normalizeLoopbrainResponse(data.ok ? data.result : data);
      expect(normalized).toMatchSnapshot();
    });
  });

  describe('Q4: Do we have capacity in timeframe?', () => {
    it('should return stable response for constrained project', async () => {
      const url = new URL(`/api/loopbrain/org/q4?projectId=${fixtures.projects.incidentId}&start=${timeframeStart}&end=${timeframeEnd}`, BASE_URL).toString();
      const response = await callEndpoint(url);
      const normalized = normalizeLoopbrainResponse(response);
      expect(normalized).toMatchSnapshot();
    });
  });

  describe('Q5: Who is unavailable and when do they return?', () => {
    it('should return stable response for unavailable person', async () => {
      const url = new URL(`/api/loopbrain/q5?personId=${fixtures.people.danaId}`, BASE_URL).toString();
      const response = await callEndpoint(url);
      const normalized = normalizeLoopbrainResponse(response);
      expect(normalized).toMatchSnapshot();
    });
  });

  describe('Q6: Who can cover?', () => {
    it('should return stable response for healthy project', async () => {
      const url = new URL(`/api/loopbrain/q6?projectId=${fixtures.projects.paymentsId}`, BASE_URL).toString();
      const response = await callEndpoint(url);
      const normalized = normalizeLoopbrainResponse(response);
      expect(normalized).toMatchSnapshot();
    });
  });

  describe('Q7: Is this aligned with role responsibilities?', () => {
    it('should return stable response for role-misaligned project', async () => {
      const url = new URL(`/api/loopbrain/q7?projectId=${fixtures.projects.cleanupId}`, BASE_URL).toString();
      const response = await callEndpoint(url);
      const normalized = normalizeLoopbrainResponse(response);
      expect(normalized).toMatchSnapshot();
    });
  });

  describe('Q8: Is responsibility clear or fragmented?', () => {
    it('should return stable response for fragmented project', async () => {
      const url = new URL(`/api/loopbrain/q8?projectId=${fixtures.projects.expansionId}`, BASE_URL).toString();
      const response = await callEndpoint(url);
      const normalized = normalizeLoopbrainResponse(response);
      expect(normalized).toMatchSnapshot();
    });
  });

  describe('Q9: Should we proceed, reassign, delay, or request support?', () => {
    it('should return stable response for constrained project', async () => {
      const url = new URL(`/api/loopbrain/q9?projectId=${fixtures.projects.incidentId}&start=${timeframeStart}&end=${timeframeEnd}`, BASE_URL).toString();
      const response = await callEndpoint(url);
      const normalized = normalizeLoopbrainResponse(response);
      expect(normalized).toMatchSnapshot();
    });
  });
});

