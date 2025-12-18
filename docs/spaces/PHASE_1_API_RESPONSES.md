# Phase 1 API Response Examples

**Purpose:** Document actual API response formats for validation

---

## Error Response: Cross-Space Attachment

**Endpoint:** `POST /api/projects/[projectId]/documentation`

**Scenario:** Project has `spaceId="space-A"`, WikiPage has `spaceId="space-B"`

**Request:**
```json
{
  "wikiPageId": "page-in-space-b"
}
```

**Response:**
```json
{
  "error": "Wiki page must belong to the same space as the project. Project space and wiki page space do not match."
}
```

**Status:** `400 Bad Request`

**Location:** `src/app/api/projects/[projectId]/documentation/route.ts:222-224`

---

## Success Response: Same-Space Attachment

**Endpoint:** `POST /api/projects/[projectId]/documentation`

**Scenario:** Project and WikiPage have same `spaceId` (or both null for legacy)

**Request:**
```json
{
  "wikiPageId": "page-in-same-space"
}
```

**Response:**
```json
{
  "id": "doc-abc123",
  "wikiPageId": "page-xyz789",
  "order": 0,
  "createdAt": "2025-01-XXT12:34:56.789Z",
  "wikiPage": {
    "id": "page-xyz789",
    "title": "Project Documentation",
    "slug": "project-documentation",
    "workspace_type": "team",
    "updatedAt": "2025-01-XXT12:34:56.789Z"
  }
}
```

**Status:** `201 Created`

**Location:** `src/app/api/projects/[projectId]/documentation/route.ts:306-318`

---

## Legacy Attachment (One/Both Null)

**Scenario:** Project has `spaceId=null`, WikiPage has `spaceId="space-A"` (or vice versa)

**Behavior:**
- ✅ **Allowed** (Phase 1 allows legacy attachments)
- ⚠️ **Warning logged** to console: `"Legacy space mismatch: Project ... spaceId=null, WikiPage ... spaceId=space-A"`
- ✅ **Returns 201** (success)

**Note:** This is intentional for Phase 1 backward compatibility. Phase 2 will enforce strict matching.

---

## GET /api/spaces Response

**Endpoint:** `GET /api/spaces`

**Response:**
```json
{
  "spaces": [
    {
      "id": "space-team-123",
      "name": "Team Space",
      "description": "Default team space for all workspace members",
      "type": "TEAM",
      "visibility": "PUBLIC",
      "ownerId": null,
      "owner": null,
      "createdAt": "2025-01-XXT...",
      "updatedAt": "2025-01-XXT...",
      "_count": {
        "members": 0,
        "projects": 5,
        "wikiPages": 12
      }
    },
    {
      "id": "space-personal-456",
      "name": "Personal Space",
      "description": "Personal space for user",
      "type": "PERSONAL",
      "visibility": "PRIVATE",
      "ownerId": "user-789",
      "owner": {
        "id": "user-789",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "createdAt": "2025-01-XXT...",
      "updatedAt": "2025-01-XXT...",
      "_count": {
        "members": 0,
        "projects": 0,
        "wikiPages": 3
      }
    }
  ]
}
```

---

## GET /api/projects/[projectId] Response (with spaceId)

**Response includes:**
```json
{
  "id": "project-123",
  "name": "My Project",
  "workspaceId": "workspace-456",
  "spaceId": "space-team-789",  // ✅ Phase 1: Canonical Space ID
  "projectSpaceId": "project-space-abc",  // Legacy: Still included
  "projectSpace": {
    "id": "project-space-abc",
    "name": "General",
    "visibility": "PUBLIC"
  },
  // ... other fields
}
```

---

## GET /api/wiki/pages Response (with spaceId)

**Response includes:**
```json
{
  "data": [
    {
      "id": "page-123",
      "title": "My Wiki Page",
      "slug": "my-wiki-page",
      "workspaceId": "workspace-456",
      "spaceId": "space-team-789",  // ✅ Phase 1: Canonical Space ID
      "workspace_type": "team",  // Legacy: Still included
      "permissionLevel": "team",  // Legacy: Still included
      // ... other fields
    }
  ],
  "pagination": { ... }
}
```

**With spaceId filter:** `GET /api/wiki/pages?workspaceId=...&spaceId=space-123`
- Returns only pages with `spaceId=space-123` (or null if `includeLegacy=true`)

---

## Summary

### Error Messages ✅

**Cross-Space Attachment:**
```
"Wiki page must belong to the same space as the project. Project space and wiki page space do not match."
```
- **Status:** 400
- **User-Friendly:** ✅ Yes - Clear explanation

### Success Responses ✅

**Same-Space Attachment:**
- Returns `ProjectDocumentation` object with `wikiPage` included
- **Status:** 201
- **Format:** Standard DTO with nested wikiPage data

### Legacy Support ✅

- One/both `spaceId` null → Allowed (with warning)
- Both populated but different → Blocked (400 error)
- Both populated and same → Allowed (201 success)

---

**End of API Response Documentation**
