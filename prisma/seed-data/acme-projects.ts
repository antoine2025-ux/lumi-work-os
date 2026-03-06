/**
 * Acme Analytics — Projects, Epics, and Tasks
 *
 * 5 projects spanning different phases of work.
 * Each project has 2-3 epics and 5-10 tasks with realistic titles.
 * Person keys reference acme-people.ts for owner/assignee lookup.
 */

export interface AcmeEpic {
  key: string
  title: string
  description: string
  color: string
}

export interface AcmeTask {
  title: string
  description: string
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  assigneeKey: string | null
  epicKey: string | null
  points: number | null
  tags: string[]
  daysAgo: number
  dueInDays: number | null
}

export interface AcmeProject {
  key: string
  name: string
  description: string
  status: 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  ownerKey: string
  createdByKey: string
  memberKeys: string[]
  startDaysAgo: number
  endDaysAgo: number | null
  teamKey: string | null
  epics: AcmeEpic[]
  tasks: AcmeTask[]
}

export const ACME_PROJECTS: AcmeProject[] = [
  // ── 1. Q1 Product Launch (COMPLETED) ──────────────────────
  {
    key: 'q1-product-launch',
    name: 'Q1 Product Launch',
    description: 'Launch the core Acme Analytics dashboard to general availability. Includes the drag-and-drop chart builder, data source connectors, and sharing workflows. Target: 50 beta customers migrated to production.',
    status: 'COMPLETED',
    priority: 'HIGH',
    ownerKey: 'emma-thompson',
    createdByKey: 'sarah-chen',
    memberKeys: ['emma-thompson', 'marcus-rodriguez', 'lisa-zhang', 'raj-krishnamurthy', 'daniel-nakamura', 'tyler-okonkwo'],
    startDaysAgo: 120,
    endDaysAgo: 30,
    teamKey: 'frontend',
    epics: [
      { key: 'q1-core-features', title: 'Core Dashboard Features', description: 'Chart builder, data connectors, and layout engine', color: '#3B82F6' },
      { key: 'q1-launch-readiness', title: 'Launch Readiness', description: 'Documentation, onboarding flow, and marketing site', color: '#10B981' },
      { key: 'q1-beta-migration', title: 'Beta Migration', description: 'Migrate existing beta users to production environment', color: '#F59E0B' },
    ],
    tasks: [
      { title: 'Implement drag-and-drop chart builder', description: 'Allow users to create charts by dragging data fields onto a canvas with live preview.', status: 'DONE', priority: 'HIGH', assigneeKey: 'lisa-zhang', epicKey: 'q1-core-features', points: 13, tags: ['frontend', 'core'], daysAgo: 90, dueInDays: null },
      { title: 'Build PostgreSQL data connector', description: 'Implement secure connection to PostgreSQL databases with schema introspection and query builder.', status: 'DONE', priority: 'HIGH', assigneeKey: 'priya-sharma', epicKey: 'q1-core-features', points: 8, tags: ['backend', 'connector'], daysAgo: 85, dueInDays: null },
      { title: 'Build Snowflake data connector', description: 'Implement Snowflake warehouse connector with OAuth and warehouse selection.', status: 'DONE', priority: 'HIGH', assigneeKey: 'james-kim', epicKey: 'q1-core-features', points: 8, tags: ['backend', 'connector'], daysAgo: 80, dueInDays: null },
      { title: 'Design onboarding flow for new users', description: 'Create a 5-step onboarding wizard that connects a data source, builds first chart, and shares a dashboard.', status: 'DONE', priority: 'HIGH', assigneeKey: 'daniel-nakamura', epicKey: 'q1-launch-readiness', points: 5, tags: ['design', 'onboarding'], daysAgo: 75, dueInDays: null },
      { title: 'Write API documentation for public endpoints', description: 'Document all public REST endpoints with examples using OpenAPI spec.', status: 'DONE', priority: 'MEDIUM', assigneeKey: 'noah-williams', epicKey: 'q1-launch-readiness', points: 5, tags: ['docs', 'api'], daysAgo: 60, dueInDays: null },
      { title: 'Set up production monitoring dashboards', description: 'Configure Datadog dashboards for API latency, error rates, and infrastructure metrics.', status: 'DONE', priority: 'HIGH', assigneeKey: 'alex-patel', epicKey: 'q1-launch-readiness', points: 3, tags: ['devops', 'monitoring'], daysAgo: 50, dueInDays: null },
      { title: 'Migrate beta accounts to production environment', description: 'Script to move 50 beta customer accounts, dashboards, and data connections to production.', status: 'DONE', priority: 'URGENT', assigneeKey: 'james-kim', epicKey: 'q1-beta-migration', points: 8, tags: ['backend', 'migration'], daysAgo: 40, dueInDays: null },
      { title: 'Run load test for 1000 concurrent dashboard viewers', description: 'Simulate peak load scenario and validate P99 latency stays under 500ms.', status: 'DONE', priority: 'HIGH', assigneeKey: 'alex-patel', epicKey: 'q1-beta-migration', points: 5, tags: ['devops', 'performance'], daysAgo: 35, dueInDays: null },
    ],
  },

  // ── 2. Enterprise Dashboard (ACTIVE) ──────────────────────
  {
    key: 'enterprise-dashboard',
    name: 'Enterprise Dashboard',
    description: 'Build enterprise-grade features including role-based access control, audit logging, SSO integration, and advanced charting capabilities. Target: close 3 enterprise deals in Q2.',
    status: 'ACTIVE',
    priority: 'HIGH',
    ownerKey: 'raj-krishnamurthy',
    createdByKey: 'emma-thompson',
    memberKeys: ['raj-krishnamurthy', 'james-kim', 'priya-sharma', 'lisa-zhang', 'tyler-okonkwo', 'alex-patel', 'daniel-nakamura'],
    startDaysAgo: 45,
    endDaysAgo: null,
    teamKey: 'backend',
    epics: [
      { key: 'ent-rbac', title: 'RBAC & Permissions', description: 'Role-based access control for dashboards, data sources, and workspace settings', color: '#EF4444' },
      { key: 'ent-sso', title: 'SSO & Compliance', description: 'SAML/OIDC SSO, audit logging, and SOC 2 compliance features', color: '#8B5CF6' },
      { key: 'ent-advanced-charts', title: 'Advanced Charting', description: 'Pivot tables, heatmaps, geo maps, and custom chart plugins', color: '#06B6D4' },
    ],
    tasks: [
      { title: 'Implement RBAC permission model', description: 'Create role hierarchy (Viewer, Editor, Admin, Owner) with granular resource-level permissions.', status: 'IN_REVIEW', priority: 'URGENT', assigneeKey: 'james-kim', epicKey: 'ent-rbac', points: 13, tags: ['backend', 'security'], daysAgo: 30, dueInDays: 5 },
      { title: 'Build permission check middleware', description: 'Express middleware that validates user permissions against resource ACLs on every API call.', status: 'IN_PROGRESS', priority: 'HIGH', assigneeKey: 'priya-sharma', epicKey: 'ent-rbac', points: 8, tags: ['backend', 'security'], daysAgo: 20, dueInDays: 10 },
      { title: 'Design RBAC management UI', description: 'Settings page for managing roles, invitations, and permission assignments.', status: 'DONE', priority: 'HIGH', assigneeKey: 'daniel-nakamura', epicKey: 'ent-rbac', points: 5, tags: ['design'], daysAgo: 25, dueInDays: null },
      { title: 'Implement SAML SSO provider', description: 'SAML 2.0 identity provider integration with Okta and Azure AD support.', status: 'IN_PROGRESS', priority: 'HIGH', assigneeKey: 'noah-williams', epicKey: 'ent-sso', points: 8, tags: ['backend', 'auth'], daysAgo: 15, dueInDays: 14 },
      { title: 'Add audit log for all admin actions', description: 'Record all permission changes, user management actions, and data access events with timestamps.', status: 'TODO', priority: 'HIGH', assigneeKey: 'fatima-al-rashid', epicKey: 'ent-sso', points: 5, tags: ['backend', 'compliance'], daysAgo: 10, dueInDays: 21 },
      { title: 'Build pivot table component', description: 'Interactive pivot table with drag-and-drop row/column configuration and aggregation functions.', status: 'IN_PROGRESS', priority: 'MEDIUM', assigneeKey: 'tyler-okonkwo', epicKey: 'ent-advanced-charts', points: 13, tags: ['frontend', 'charts'], daysAgo: 14, dueInDays: 18 },
      { title: 'Implement geo map visualization', description: 'Choropleth and point map charts using MapboxGL with custom color scales.', status: 'TODO', priority: 'MEDIUM', assigneeKey: 'lisa-zhang', epicKey: 'ent-advanced-charts', points: 8, tags: ['frontend', 'charts'], daysAgo: 7, dueInDays: 28 },
      { title: 'Set up staging environment for enterprise testing', description: 'Isolated staging environment with SSO test IdP and sample enterprise dataset.', status: 'DONE', priority: 'HIGH', assigneeKey: 'alex-patel', epicKey: 'ent-sso', points: 3, tags: ['devops'], daysAgo: 35, dueInDays: null },
      { title: 'Create enterprise pricing page', description: 'Design and implement the enterprise pricing comparison page with feature matrix.', status: 'TODO', priority: 'MEDIUM', assigneeKey: 'maria-santos', epicKey: 'ent-rbac', points: 3, tags: ['frontend', 'marketing'], daysAgo: 5, dueInDays: 30 },
    ],
  },

  // ── 3. Marketing Website Redesign (ACTIVE / planning) ─────
  {
    key: 'marketing-website',
    name: 'Marketing Website Redesign',
    description: 'Redesign acme-analytics.com with updated branding, interactive product demos, and conversion-optimized landing pages. Goal: increase demo request rate from 2% to 5%.',
    status: 'ACTIVE',
    priority: 'MEDIUM',
    ownerKey: 'megan-obrien',
    createdByKey: 'david-wilson',
    memberKeys: ['megan-obrien', 'sophie-dubois', 'yuki-tanaka', 'maria-santos', 'daniel-nakamura'],
    startDaysAgo: 14,
    endDaysAgo: null,
    teamKey: 'marketing',
    epics: [
      { key: 'mktg-design', title: 'Visual Redesign', description: 'New brand identity, component library, and page templates', color: '#EC4899' },
      { key: 'mktg-content', title: 'Content Refresh', description: 'Rewrite all copy, create case studies, and record product demos', color: '#F97316' },
    ],
    tasks: [
      { title: 'Audit current website analytics and identify drop-off points', description: 'Analyze GA4 data to find where visitors drop off in the demo request funnel.', status: 'DONE', priority: 'HIGH', assigneeKey: 'megan-obrien', epicKey: 'mktg-design', points: 3, tags: ['analytics'], daysAgo: 12, dueInDays: null },
      { title: 'Create new brand style guide', description: 'Define updated color palette, typography, iconography, and illustration style.', status: 'IN_PROGRESS', priority: 'HIGH', assigneeKey: 'sophie-dubois', epicKey: 'mktg-design', points: 5, tags: ['design', 'brand'], daysAgo: 10, dueInDays: 7 },
      { title: 'Design homepage wireframes', description: 'Low-fidelity wireframes for the new homepage with hero, feature highlights, social proof, and CTA sections.', status: 'IN_PROGRESS', priority: 'HIGH', assigneeKey: 'daniel-nakamura', epicKey: 'mktg-design', points: 5, tags: ['design'], daysAgo: 8, dueInDays: 10 },
      { title: 'Write customer case study — DataFlow Corp', description: 'Interview DataFlow Corp and write a case study showing 3x faster reporting with Acme.', status: 'TODO', priority: 'MEDIUM', assigneeKey: 'yuki-tanaka', epicKey: 'mktg-content', points: 3, tags: ['content', 'case-study'], daysAgo: 5, dueInDays: 21 },
      { title: 'Write customer case study — TechStart Inc', description: 'Interview TechStart and write a case study about self-serve analytics adoption.', status: 'TODO', priority: 'MEDIUM', assigneeKey: 'yuki-tanaka', epicKey: 'mktg-content', points: 3, tags: ['content', 'case-study'], daysAgo: 5, dueInDays: 28 },
      { title: 'Record interactive product demo video', description: '3-minute product walkthrough showing chart creation, data connection, and sharing.', status: 'TODO', priority: 'HIGH', assigneeKey: 'megan-obrien', epicKey: 'mktg-content', points: 5, tags: ['content', 'video'], daysAgo: 3, dueInDays: 14 },
      { title: 'Implement new homepage in Next.js', description: 'Build the redesigned homepage with responsive layout, animations, and optimized images.', status: 'TODO', priority: 'MEDIUM', assigneeKey: 'maria-santos', epicKey: 'mktg-design', points: 8, tags: ['frontend', 'website'], daysAgo: 2, dueInDays: 35 },
    ],
  },

  // ── 4. Sales Enablement Platform (ON_HOLD / blocked) ──────
  {
    key: 'sales-enablement',
    name: 'Sales Enablement Platform',
    description: 'Internal tool for the sales team: deal tracker, competitive intel repository, and automated proposal generation. Currently blocked on CRM integration API access.',
    status: 'ON_HOLD',
    priority: 'HIGH',
    ownerKey: 'david-wilson',
    createdByKey: 'david-wilson',
    memberKeys: ['david-wilson', 'chris-hernandez', 'aisha-johnson', 'olivia-park', 'noah-williams'],
    startDaysAgo: 60,
    endDaysAgo: null,
    teamKey: 'sales',
    epics: [
      { key: 'sales-crm', title: 'CRM Integration', description: 'Salesforce and HubSpot bi-directional sync', color: '#6366F1' },
      { key: 'sales-content', title: 'Sales Content Hub', description: 'Competitive intel, battlecards, and proposal templates', color: '#14B8A6' },
    ],
    tasks: [
      { title: 'Design deal pipeline board UI', description: 'Kanban board for tracking deals through stages with drag-and-drop and inline editing.', status: 'DONE', priority: 'HIGH', assigneeKey: 'olivia-park', epicKey: 'sales-crm', points: 5, tags: ['design', 'sales'], daysAgo: 50, dueInDays: null },
      { title: 'Implement Salesforce OAuth integration', description: 'Connect to Salesforce API using OAuth 2.0 for bi-directional deal sync.', status: 'BLOCKED', priority: 'URGENT', assigneeKey: 'noah-williams', epicKey: 'sales-crm', points: 8, tags: ['backend', 'integration'], daysAgo: 40, dueInDays: -5 },
      { title: 'Build competitive battlecard template system', description: 'CRUD for competitive intelligence cards with versioning and team-wide sharing.', status: 'IN_PROGRESS', priority: 'MEDIUM', assigneeKey: 'aisha-johnson', epicKey: 'sales-content', points: 5, tags: ['content', 'sales'], daysAgo: 30, dueInDays: 14 },
      { title: 'Create automated proposal PDF generator', description: 'Generate branded PDF proposals from deal data with custom pricing tables.', status: 'TODO', priority: 'MEDIUM', assigneeKey: null, epicKey: 'sales-content', points: 8, tags: ['backend', 'pdf'], daysAgo: 25, dueInDays: null },
      { title: 'Import historical deal data from spreadsheets', description: 'CSV import tool for migrating 2 years of deal history from Google Sheets.', status: 'BLOCKED', priority: 'HIGH', assigneeKey: 'chris-hernandez', epicKey: 'sales-crm', points: 5, tags: ['data', 'migration'], daysAgo: 35, dueInDays: -10 },
      { title: 'Set up Salesforce sandbox environment', description: 'Request sandbox access and configure test data for development.', status: 'BLOCKED', priority: 'URGENT', assigneeKey: 'alex-patel', epicKey: 'sales-crm', points: 2, tags: ['devops', 'blocked'], daysAgo: 45, dueInDays: -15 },
    ],
  },

  // ── 5. Customer Onboarding Automation (ACTIVE) ─────────────
  {
    key: 'customer-onboarding',
    name: 'Customer Onboarding Automation',
    description: 'Automate the customer onboarding workflow: welcome emails, guided setup wizard, health scoring, and CSM assignment. Reduce time-to-value from 14 days to 3 days.',
    status: 'ACTIVE',
    priority: 'MEDIUM',
    ownerKey: 'olivia-park',
    createdByKey: 'emma-thompson',
    memberKeys: ['olivia-park', 'jordan-mitchell', 'priya-sharma', 'maria-santos', 'hannah-foster'],
    startDaysAgo: 30,
    endDaysAgo: null,
    teamKey: 'product',
    epics: [
      { key: 'onb-wizard', title: 'Setup Wizard', description: 'Step-by-step onboarding wizard with progress tracking', color: '#22C55E' },
      { key: 'onb-automation', title: 'Email Automation', description: 'Automated email sequences based on onboarding progress', color: '#A855F7' },
    ],
    tasks: [
      { title: 'Map current onboarding journey and identify friction points', description: 'Interview 10 recent customers and document the current onboarding experience step by step.', status: 'DONE', priority: 'HIGH', assigneeKey: 'jordan-mitchell', epicKey: 'onb-wizard', points: 3, tags: ['research', 'customer'], daysAgo: 28, dueInDays: null },
      { title: 'Design onboarding wizard flow', description: 'Multi-step wizard: connect data source → create first chart → invite team → configure alerts.', status: 'DONE', priority: 'HIGH', assigneeKey: 'olivia-park', epicKey: 'onb-wizard', points: 5, tags: ['design', 'ux'], daysAgo: 22, dueInDays: null },
      { title: 'Implement onboarding progress tracker API', description: 'Backend API to track completion of onboarding steps with webhook notifications.', status: 'IN_PROGRESS', priority: 'HIGH', assigneeKey: 'priya-sharma', epicKey: 'onb-wizard', points: 5, tags: ['backend', 'api'], daysAgo: 14, dueInDays: 7 },
      { title: 'Build guided setup wizard UI', description: 'React wizard component with step validation, progress bar, and skip/back navigation.', status: 'IN_PROGRESS', priority: 'HIGH', assigneeKey: 'maria-santos', epicKey: 'onb-wizard', points: 8, tags: ['frontend', 'onboarding'], daysAgo: 10, dueInDays: 14 },
      { title: 'Create welcome email templates', description: 'Design and code 5 email templates: welcome, data connected, first chart, team invited, setup complete.', status: 'IN_REVIEW', priority: 'MEDIUM', assigneeKey: 'hannah-foster', epicKey: 'onb-automation', points: 3, tags: ['email', 'design'], daysAgo: 18, dueInDays: 3 },
      { title: 'Implement email trigger service', description: 'Event-driven email service that sends onboarding emails based on progress milestones.', status: 'TODO', priority: 'MEDIUM', assigneeKey: 'priya-sharma', epicKey: 'onb-automation', points: 5, tags: ['backend', 'email'], daysAgo: 7, dueInDays: 21 },
      { title: 'Build customer health score calculator', description: 'Scoring model based on login frequency, feature adoption, data freshness, and team size.', status: 'TODO', priority: 'LOW', assigneeKey: 'jordan-mitchell', epicKey: 'onb-automation', points: 5, tags: ['analytics', 'customer'], daysAgo: 5, dueInDays: 35 },
      { title: 'Create CSM assignment rules engine', description: 'Auto-assign CSM based on customer tier, industry, and current CSM workload.', status: 'TODO', priority: 'LOW', assigneeKey: null, epicKey: 'onb-automation', points: 5, tags: ['backend', 'automation'], daysAgo: 3, dueInDays: 42 },
    ],
  },
]
