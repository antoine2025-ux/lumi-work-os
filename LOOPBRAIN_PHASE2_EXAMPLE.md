# Loopbrain Phase 2: Example Response & Logs

## Example Request

**Query:** "What projects exist in this workspace?"

**Mode:** `spaces`

**Workspace ID:** `cmj2mzrhx0002pf05s3u31n49`

**User ID:** `cmj2mzeza0000pf05tp7wccbg`

---

## Example Response (LoopbrainResponse)

```json
{
  "mode": "spaces",
  "workspaceId": "cmj2mzrhx0002pf05s3u31n49",
  "userId": "cmj2mzeza0000pf05tp7wccbg",
  "query": "What projects exist in this workspace?",
  "context": {
    "structuredContext": [
      {
        "id": "cmj4o97ro000bpfaxf9vmd7m7",
        "type": "project",
        "title": "testing",
        "summary": "Test project for Loopbrain",
        "status": "active",
        "tags": ["test", "loopbrain"],
        "updatedAt": "2024-01-15T10:30:00Z",
        "relations": [
          {
            "type": "person",
            "id": "cmj2mzeza0000pf05tp7wccbg",
            "label": "owner"
          }
        ]
      }
    ],
    "retrievedItems": []
  },
  "answer": "The workspace currently has 1 active project:\n\n**Project: testing**\n- Status: Active (source: project:cmj4o97ro000bpfaxf9vmd7m7)\n- Priority: Medium (source: project:cmj4o97ro000bpfaxf9vmd7m7)\n- Owner: Tony Em (source: project:cmj4o97ro000bpfaxf9vmd7m7)\n\nThis project includes 1 task that is currently blocked:\n- **Task: testing234** - Status: Blocked (source: task:cmj4px049000xpfaxaq404jwb)",
  "suggestions": [
    {
      "label": "Show project details",
      "action": "navigate",
      "target": "/projects/cmj4o97ro000bpfaxf9vmd7m7"
    }
  ],
  "sourcesUsed": [
    {
      "type": "project",
      "id": "cmj4o97ro000bpfaxf9vmd7m7",
      "title": "testing"
    },
    {
      "type": "task",
      "id": "cmj4px049000xpfaxaq404jwb",
      "title": "testing234"
    },
    {
      "type": "workspace",
      "id": "cmj2mzrhx0002pf05s3u31n49",
      "title": "Loopwell testing"
    }
  ],
  "metadata": {
    "model": "gpt-4-turbo",
    "tokens": {
      "prompt": 1850,
      "completion": 320,
      "total": 2170
    },
    "retrievedCount": 0,
    "context": {
      "sent": {
        "contextObjects": 1,
        "retrievedItems": 0,
        "personalDocs": 0,
        "orgPeople": 0,
        "projectEpics": 0,
        "projectTasks": 0,
        "slackMessages": 0
      },
      "dropped": {
        "contextObjects": 0,
        "retrievedItems": 0,
        "personalDocs": 0,
        "orgPeople": 0,
        "projectEpics": 0,
        "projectTasks": 0,
        "slackMessages": 0
      },
      "totalChars": 1250,
      "ranking": {
        "top": [
          {
            "type": "project",
            "id": "cmj4o97ro000bpfaxf9vmd7m7",
            "score": 118,
            "reasons": ["keyword", "typeBoost", "recency"]
          },
          {
            "type": "task",
            "id": "cmj4px049000xpfaxaq404jwb",
            "score": 45,
            "reasons": ["keyword", "recency"]
          }
        ]
      }
    },
    "citations": {
      "validCount": 3,
      "invalidCount": 0,
      "missing": false
    }
  }
}
```

---

## Example Server Logs

### Request Start Log

```
[INFO] Loopbrain orchestrator started {
  requestId: 'lb-1705312345678-abc123xyz',
  workspaceId: 'cmj2mzrh...',
  userId: 'cmj2mzea...',
  mode: 'spaces',
  queryLength: 38,
  hasProjectId: false,
  hasPageId: false,
  hasTaskId: false
}
```

### Context Packing Log

```
[DEBUG] Loopbrain context packed {
  requestId: 'lb-1705312345678-abc123xyz',
  workspaceId: 'cmj2mzrh...',
  mode: 'spaces',
  contextPack: {
    sent: {
      contextObjects: 1,
      retrievedItems: 0,
      personalDocs: 0,
      orgPeople: 0,
      projectEpics: 0,
      projectTasks: 0,
      slackMessages: 0
    },
    dropped: {
      contextObjects: 0,
      retrievedItems: 0,
      personalDocs: 0,
      orgPeople: 0,
      projectEpics: 0,
      projectTasks: 0,
      slackMessages: 0
    },
    totalChars: 1250
  }
}
```

### Context Ranking Log

```
[DEBUG] Loopbrain context ranked {
  requestId: 'lb-1705312345678-abc123xyz',
  workspaceId: 'cmj2mzrh...',
  mode: 'spaces',
  contextRank: {
    top: [
      {
        type: 'project',
        id: 'cmj4o97ro000bpfaxf9vmd7m7',
        score: 118,
        reasons: ['keyword', 'typeBoost', 'recency']
      },
      {
        type: 'task',
        id: 'cmj4px049000xpfaxaq404jwb',
        score: 45,
        reasons: ['keyword', 'recency']
      }
    ]
  }
}
```

### Project Query Debug Log (if applicable)

```
[DEBUG] Project query packing debug {
  requestId: 'lb-1705312345678-abc123xyz',
  query: 'What projects exist in this workspace?',
  projectsInOriginalContext: 1,
  projectsInPackedContext: 1,
  projectsInSources: 1,
  projectIds: ['cmj4o97ro000bpfaxf9vmd7m7'],
  projectTitles: ['testing']
}
```

### LLM Call Log

```
[DEBUG] Loopbrain LLM call completed {
  requestId: 'lb-1705312345678-abc123xyz',
  workspaceId: 'cmj2mzrh...',
  mode: 'spaces',
  llmTimeMs: 2340,
  slackTimeMs: 0,
  promptLength: 1850,
  responseLength: 320,
  tokens: {
    prompt: 1850,
    completion: 320,
    total: 2170
  },
  model: 'gpt-4-turbo'
}
```

### Request Completion Log

```
[INFO] Loopbrain orchestrator completed {
  requestId: 'lb-1705312345678-abc123xyz',
  workspaceId: 'cmj2mzrh...',
  userId: 'cmj2mzea...',
  mode: 'spaces',
  queryLength: 38,
  totalTimeMs: 3456,
  contextLoad: 856,
  llmCall: 2340,
  slackActions: 0,
  contextSources: {
    projects: 1,
    tasks: 1,
    pages: 0,
    epics: 0,
    people: 0,
    retrieved: 0
  },
  tokens: {
    prompt: 1850,
    completion: 320,
    total: 2170
  },
  citations: {
    validCount: 3,
    invalidCount: 0,
    missing: false
  },
  sourcesUsedCount: 3
}
```

---

## Citation Extraction & Validation

### Extracted Citations from Answer

```typescript
const citations = extractCitations(answer)
// Returns:
[
  { type: 'project', id: 'cmj4o97ro000bpfaxf9vmd7m7' },
  { type: 'project', id: 'cmj4o97ro000bpfaxf9vmd7m7' },
  { type: 'task', id: 'cmj4px049000xpfaxaq404jwb' }
]
```

### Citation Validation

```typescript
const validation = validateCitations(citations, sourcesUsed)
// Returns:
{
  valid: [
    { type: 'project', id: 'cmj4o97ro000bpfaxf9vmd7m7' },
    { type: 'project', id: 'cmj4o97ro000bpfaxf9vmd7m7' },
    { type: 'task', id: 'cmj4px049000xpfaxaq404jwb' }
  ],
  invalid: [],
  missing: false
}
```

### Sources Used Array

```typescript
sourcesUsed = [
  {
    type: 'project',
    id: 'cmj4o97ro000bpfaxf9vmd7m7',
    title: 'testing'
  },
  {
    type: 'task',
    id: 'cmj4px049000xpfaxaq404jwb',
    title: 'testing234'
  },
  {
    type: 'workspace',
    id: 'cmj2mzrhx0002pf05s3u31n49',
    title: 'Loopwell testing'
  }
]
```

---

## Example with Missing Citations

If the LLM answer doesn't include citations, a footer is automatically appended:

### Answer with Missing Citations

```
The workspace has 1 active project called "testing".

---
**Sources used:**
- testing (source: project:cmj4o97ro000bpfaxf9vmd7m7)
- testing234 (source: task:cmj4px049000xpfaxaq404jwb)
- Loopwell testing (source: workspace:cmj2mzrhx0002pf05s3u31n49)
```

### Metadata for Missing Citations

```json
{
  "metadata": {
    "citations": {
      "validCount": 0,
      "invalidCount": 0,
      "missing": true
    }
  }
}
```

---

## Example with Invalid Citations

If the LLM cites a source that wasn't sent to the model:

### Answer with Invalid Citation

```
Project Alpha is active. (source: project:invalid-id-123)
```

### Processing

1. Citation extracted: `{ type: 'project', id: 'invalid-id-123' }`
2. Validation finds it's not in `sourcesUsed`
3. Invalid citation replaced: `(source: unknown)`
4. Warning logged:

```
[WARN] Invalid citations found in LLM response {
  requestId: 'lb-1705312345678-abc123xyz',
  workspaceId: 'cmj2mzrh...',
  invalidCitations: [
    { type: 'project', id: 'invalid-id-123' }
  ]
}
```

### Final Answer

```
Project Alpha is active. (source: unknown)
```

### Metadata

```json
{
  "metadata": {
    "citations": {
      "validCount": 0,
      "invalidCount": 1,
      "missing": false
    }
  }
}
```

---

## Key Phase 2 Features Demonstrated

1. ✅ **sourcesUsed array** - Lists all sources sent to the model
2. ✅ **Citation extraction** - Extracts `(source: type:id)` patterns from answer
3. ✅ **Citation validation** - Validates against sourcesUsed
4. ✅ **Invalid citation handling** - Replaces invalid citations with `(source: unknown)`
5. ✅ **Missing citation footer** - Appends sources footer if no citations found
6. ✅ **Metadata tracking** - `metadata.citations` with validCount, invalidCount, missing
7. ✅ **Debug logging** - Comprehensive logs for debugging citation issues
8. ✅ **UI sources display** - `sourcesUsed` available in response for UI rendering

