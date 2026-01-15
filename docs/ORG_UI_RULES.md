# Org UI Discipline

Rules for Org UI development to ensure consistency and maintainability.

---

## ✅ Mandatory

### Use Existing UI Components

- **Source**: `src/components/ui/*`
- **Purpose**: Maintain visual consistency across Loopwell
- **Examples**: Buttons, dialogs, tables, forms from the UI library

### Follow Existing Layouts

- **Reference**: Existing Loopwell layouts and patterns
- **Purpose**: Users expect familiar navigation and structure
- **Examples**: Sidebar navigation, page headers, card layouts

### Prefer Composition

- Use existing components to build new features
- Avoid creating new primitives when existing ones work
- Extend rather than replace

---

## ❌ Forbidden

### Custom UI Kits

- Do not introduce new UI component libraries
- Do not create duplicate implementations of existing components

### Duplicate Primitives

- Do not create new table components if `src/components/ui/*` has tables
- Do not create new dialog components if existing dialogs work
- Do not create new button components if existing buttons work

### Inline Styling Systems

- Do not introduce new CSS-in-JS libraries
- Do not create component-specific styling systems
- Use Tailwind classes and existing component patterns

---

## Visual Consistency

### Keep Org Pages Consistent

Org pages should visually align with:
- Overview tabs
- Org Chart views
- Other Loopwell modules

### Use Existing Patterns

- Follow established patterns for:
  - Page layouts
  - Navigation
  - Data displays
  - Forms and inputs
  - Error states
  - Loading states

---

## Examples

### ✅ Good

```typescript
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Table } from "@/components/ui/table";

export function OrgPeopleTable() {
  return (
    <Table>
      {/* Use existing Table component */}
    </Table>
  );
}
```

### ❌ Bad

```typescript
// Don't create custom table component
export function OrgPeopleTable() {
  return (
    <div className="custom-table">
      {/* Custom styling and structure */}
    </div>
  );
}
```

---

## See Also

- [Engineering Ground Rules](./ORG_ENGINEERING_GROUND_RULES.md)
- Existing UI components in `src/components/ui/*`

