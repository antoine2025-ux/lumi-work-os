# API Debug Overlay (dev-only)

The API Debug Overlay is a small floating panel that helps you inspect recent API calls during development.

- Only available when `NODE_ENV=development`.
- Mounted globally in `src/app/layout.tsx`.
- Powered by `useApiAction` + the internal `api-debug` event bus.

## How to use

- Click the "API debug" button in the bottom-right corner of the app (dev only).
- The panel lists the last N (currently 30) API calls triggered via `useApiAction`.
- Each row includes:
  - HTTP status
  - Method
  - Path (including query)
  - Duration (ms)
  - Optional trace label and error message

## Filters

- **Status filter**
  - All
  - Success (ok)
  - Errors (non-ok)

- **Label filter**
  - All
  - A dropdown of all `traceLabel` values seen in recent calls (e.g. `OrgMemberUpdateRole`, `OrgInviteCreate`, `OrgDelete`).

Combine filters to zoom in on specific flows, like:

- Status: Errors + Label: `OrgInviteCreate`
- Status: All + Label: `OrgOwnershipTransfer`

## Clear

- Click "Clear" to wipe the current in-memory log.
- The next API call will repopulate the list.

## Org flows and trace labels

Org-related `useApiAction` hooks include `traceLabel` values that show up in the overlay:

- `OrgMemberUpdateRole`
- `OrgMemberRemove`
- `OrgLeave`
- `OrgInviteCreate`
- `OrgOwnershipTransfer`
- `OrgDelete`

Use these to quickly filter down to Org flows when debugging.

## Notes

- The overlay is purely a dev tool; it never renders in production.
- Only calls made through `useApiAction` are tracked by default.
- You can manually emit events from other code using `emitApiDebugEvent` if needed.

