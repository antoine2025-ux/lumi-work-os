# Spaces Feature: E2E Test Run & UX Assessment

**Date:** 2026-02-24  
**Scope:** Spaces feature — create pages, projects, folders, tasks; link them; explore functionality; intuitiveness and improvement suggestions.

---

## 1. What Was Done

- **Codebase mapping:** Routes, dialogs, APIs, and linking flows for Spaces were mapped.
- **Browser E2E attempt:** 
  - Navigated to `/spaces/home` → **client-side exception** ("Application error: a client-side exception has occurred"). Full-page screenshot confirmed the error; dashboard at `/home` loads fine.
  - Navigated directly to `/w/loopwell/spaces/home` → page **loads** (Spaces nav selected, content area visible). So the bug is tied to the **redirect from `/spaces/home`** (server redirects to `/w/[slug]/spaces/home`) or to the first client render after that redirect.
  - Could not drive UI interactions (create/link) because the browser MCP snapshot did not return element refs in this environment, so clicks could not be targeted.

**Recommendation:** Reproduce the `/spaces/home` error locally (open `/spaces/home` and check the browser console), fix the client exception, then re-run E2E (Playwright or agent) against `/spaces/home` and `/w/[slug]/spaces/home`.

---

## 2. How the Spaces Feature Works (From Code)

### 2.1 Entry Points & Routes

| Entry | URL | Notes |
|-------|-----|------|
| Spaces home (intended) | `/spaces/home` | Server redirects to `/w/[workspaceSlug]/spaces/home`. **Currently throws client error after redirect.** |
| Spaces home (workspace-scoped) | `/w/[workspaceSlug]/spaces/home` | Main Spaces dashboard. **Works when opened directly.** |
| Space detail | `/w/[workspaceSlug]/spaces/[id]` | Single space: content list (projects, pages, child spaces), actions, breadcrumb. |

### 2.2 Create Flows

| Entity | Where | How it’s linked |
|--------|--------|-----------------|
| **Space** | Spaces home → “New Space” | Top-level or child of another space (folder). Name, description, visibility (Public/Private), colour. |
| **Page (wiki)** | Spaces home → “New Page”, or inside a space → “New Page” | **New Page** dialog: choose **Space** from dropdown, enter title → page is created in that space. **Quick Create** (from space detail): title only → page created in current space. |
| **Project** | Spaces home → “New Project”, or space detail → “New Project” | **Create Project** dialog: **Space** is required. From space detail, “New Project” goes to `/w/.../projects/new?spaceId=...` so the form is pre-scoped to that space. |
| **Folder** | Space detail only → “New Folder” | Creates a **child space** under the current space (parentId). No space picker. |
| **Task** | Not created from Spaces UI | Tasks belong to **projects**. Create tasks from the project detail page. Spaces home only shows “View Tasks” (→ projects) and “Today’s Tasks” widget. |

### 2.3 Linking Summary

- **Pages ↔ Spaces:** One-way: every page is created in a chosen space (or current space for Quick Create). No “link existing page to space” in the flows mapped.
- **Projects ↔ Spaces:** One-way: every project is created in a chosen space (required). No “move project to another space” in the flows mapped.
- **Folders ↔ Spaces:** Folders are child spaces; hierarchy is parentId. Breadcrumb on space detail shows parent.
- **Tasks:** Linked only via projects (project → tasks). No direct task–space link in the UI.

---

## 3. Intuitiveness Assessment

### What Works Well

- **Single hub:** Spaces home is a clear hub: Quick Actions (New Page, New Project, New Space, View Tasks), All Spaces list, Recent Pages, Today’s Tasks, LoopBrain.
- **Space as container:** The idea that a space holds projects, pages, and folders is clear from the space detail page and the Content list (with type badges: Project, Page, Folder).
- **Breadcrumb:** Space detail breadcrumb (Spaces > Parent? > This space) supports hierarchy.
- **Visibility:** Public / Private (and Personal for “My Space”) is explicit in create and on cards.
- **Quick Create in context:** From a space, “New Page” and “New Folder” are in-context (current space/parent). “New Project” from space pre-fills the space in the project form.

### Friction & Confusion

1. **Two “New Page” experiences**
   - From Spaces home: must pick a **Space** in a dropdown (and see “(Personal)” etc.). Makes sense but adds a step.
   - From space detail: only title (Quick Create). Fast but the difference between “New Page” from home vs from inside a space is not explained; users might not know that the former asks for space and the latter doesn’t.

2. **“View Tasks” vs tasks in Spaces**
   - “View Tasks” goes to **projects**, not to a “Tasks” space. The label doesn’t say “Projects” or “View projects & tasks.” Users might expect a task list or a space called “Tasks.”

3. **Folder = child space**
   - “New Folder” creates a **space** with a parent. The word “Folder” is intuitive for hierarchy, but the type badge on content is “Folder” while the model is “space (child).” Minor terminology split.

4. **Where to create a task**
   - Tasks are not created from Spaces. You must go to a project. No shortcut from a space’s project row to “Add task” (only to the project). For “create pages, projects, folders, tasks” from one place, task creation is the odd one out.

5. **Moving / re-linking**
   - No visible “Move to another space” for projects or pages. If you pick the wrong space at creation, the path to fix it is unclear (likely project settings or wiki page settings elsewhere).

6. **Empty state**
   - Space detail says “No content yet. Add a project or wiki page to get started.” It doesn’t mention folders; adding “or folder” would match the “New Folder” action.

---

## 4. Improvement Suggestions

### P0 – Fix & Harden

- **Fix `/spaces/home` client error** so the main entry point works after redirect. Check browser console when loading `/spaces/home`; likely a missing guard (e.g. `workspaceSlug` or workspace context) or Loopbrain/assistant context when the redirect lands.
- **Add E2E coverage for Spaces:** at least: open Spaces home (after fix), create space, open it, create page and project linked to that space, create folder, and assert they appear in the space’s Content list.

### P1 – Clarity & Consistency

- **Unify “New Page” copy:** e.g. “New Page” from home with subtitle “Choose a space, then add a title” and “New Page” in a space with “Add a page to [Space name]” so the two flows are clearly different.
- **Rename or clarify “View Tasks”:** e.g. “Projects & tasks” or “View projects” so it’s clear you’re going to projects (where tasks live).
- **Empty state copy:** In space detail, change to “No content yet. Add a project, page, or folder to get started.”

### P2 – Linking & Discovery

- **Move / re-link:** Consider “Move to another space” (or “Change space”) for projects and wiki pages in their settings or in the space detail (e.g. row menu).
- **Task shortcut from Spaces:** From a project row on space detail, add “Add task” (or “New task”) that deep-links to the project’s task creation (e.g. `/w/.../projects/[id]?addTask=1` or a modal that creates a task in that project).
- **Link existing page to space:** If the model allows it, support “Add existing page to this space” from space detail so pages can be associated with a space after creation.

### P3 – Polish

- **Filter default:** On space detail, “Content” filter defaults to “All.” If a space has many items, consider remembering last filter (e.g. in URL or local state).
- **Folder terminology:** Either use “Folder” consistently in API/UI (and document that it’s a child space) or expose “Subspace” in the UI and keep “Folder” only in a few places for familiarity.
- **Onboarding hint:** First time on Spaces home, a short tooltip or banner: “Spaces organize projects and docs. Create a space, then add projects and pages to it.”

---

## 5. Summary

| Aspect | Rating | Notes |
|--------|--------|------|
| **Concept** | Good | Spaces as containers for projects, pages, and folders is clear. |
| **Create flows** | Good | Creating space, page, project, folder is possible; project and page are explicitly linked to a space. |
| **Task flow** | Partial | Tasks only via projects; no create-task-from-Spaces. |
| **Entry point** | Broken | `/spaces/home` throws client error; use `/w/[slug]/spaces/home` until fixed. |
| **Linking** | One-way at create | No move/re-link or “add existing page to space” in the flows reviewed. |
| **Copy & discovery** | Mixed | “View Tasks” and empty state could be clearer; “New Page” in two contexts could be explained. |

Implementing the P0 fix and P1 copy/empty-state changes would make the Spaces feature stable and noticeably clearer for users doing the flow you described (create pages, projects, folders, tasks and link them).
