# Phase 1 API Response Messages

**Purpose:** Exact error and success messages for Phase 1 validation

---

## Cross-Space Attachment Error (400)

**Endpoint:** `POST /api/projects/[projectId]/documentation`

**Scenario:** Project `spaceId="space-A"`, WikiPage `spaceId="space-B"` (both populated)

**Request:**
```http
POST /api/projects/proj-abc123/documentation
Content-Type: application/json

{
  "wikiPageId": "page-xyz789"
}
```

**Response:**
```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": "Wiki page must belong to the same space as the project. Project space and wiki page space do not match."
}
```

**Location:** `src/app/api/projects/[projectId]/documentation/route.ts:222-224`

**User-Friendly:** ✅ Yes - Clear explanation

---

## Same-Space Attachment Success (201)

**Endpoint:** `POST /api/projects/[projectId]/documentation`

**Scenario:** Project and WikiPage have same `spaceId` (or both null for legacy)

**Request:**
```http
POST /api/projects/proj-abc123/documentation
Content-Type: application/json

{
  "wikiPageId": "page-same-space"
}
```

**Response:**
```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "id": "doc-clx123abc456",
  "wikiPageId": "page-same-space",
  "order": 0,
  "createdAt": "2025-01-12T15:30:45.123Z",
  "wikiPage": {
    "id": "page-same-space",
    "title": "My Documentation",
    "slug": "my-documentation",
    "workspace_type": "team",
    "spaceId": "space-team-789",  // ✅ Now included
    "updatedAt": "2025-01-12T14:20:30.456Z"
  }
}
```

**Location:** `src/app/api/projects/[projectId]/documentation/route.ts:306-318`

---

## Legacy Attachment (One/Both Null) - Allowed

**Scenario:** Project `spaceId=null`, WikiPage `spaceId="space-A"` (or vice versa)

**Response:**
```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "id": "doc-legacy-123",
  "wikiPageId": "page-legacy-456",
  "order": 0,
  "createdAt": "2025-01-12T15:30:45.123Z",
  "wikiPage": {
    "id": "page-legacy-456",
    "title": "Legacy Page",
    "slug": "legacy-page",
    "workspace_type": "team",
    "spaceId": null,  // ✅ Included (null for legacy pages)
    "updatedAt": "2025-01-12T14:20:30.456Z"
  }
}
```

**Note:** Warning logged to console but request succeeds (Phase 1 backward compatibility)

---

## Summary

### Error Message Quality ✅

**Cross-Space Error:**
- Message: `"Wiki page must belong to the same space as the project. Project space and wiki page space do not match."`
- Status: `400 Bad Request`
- User-Friendly: ✅ Yes - Clear, actionable message

**Recommendation:** 
- Error message is clear and user-friendly
- No UI changes needed for Phase 1
- Consider adding space names in Phase 2: `"Wiki page 'My Page' is in 'Space B' but project is in 'Space A'"`

### Success Response ✅

**Same-Space Success:**
- Returns standard `ProjectDocumentation` DTO
- Includes nested `wikiPage` object
- Status: `201 Created`
- Format: Standard JSON response

---

**End of API Messages Documentation**
