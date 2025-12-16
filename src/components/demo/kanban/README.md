# Kanban Board Demo Components

This directory contains two demo UI templates for the Project Kanban Board view that replace the current Jira-like layout with a more minimalistic, calm, and modern experience.

## Components

### 1. MinimalBoard (`MinimalBoard.tsx`)

A visually clean and breathable board view inspired by Notion + Linear.

**Features:**
- Light neutral background (`bg-neutral-50`) with soft shadows (`shadow-sm`)
- 5-column grid layout (`grid grid-cols-5 gap-4`)
- Circular status icons with soft gray text
- Task cards with no borders, only hover effects (`hover:bg-neutral-100`)
- Additional details revealed on hover (description, priority, points)
- Floating "+" icons for adding tasks
- Gentle entry animations with Framer Motion (`fade-in-up`)

**Status Icons:**
- 🕓 To Do
- ⚙️ In Progress  
- 👀 In Review
- ✅ Done
- ⛔ Blocked

### 2. FocusBoard (`FocusBoard.tsx`)

A calm single-column view that helps users focus on one stage at a time.

**Features:**
- Single column visible at a time with dropdown selection
- Animated transitions between statuses using Framer Motion (`slide-in/out`)
- Centered layout with fixed max width (`max-w-3xl mx-auto`)
- Larger task cards with soft radial progress rings
- Backdrop blur effect for focused workspace (`backdrop-blur-md bg-white/70`)
- Enhanced task details with due date warnings
- Progress visualization with circular progress indicators

## Usage

### Basic Import
```tsx
import { MinimalBoard, FocusBoard } from '@/components/demo/kanban'

// Use in your component
<MinimalBoard />
<FocusBoard />
```

### With Custom Styling
```tsx
<MinimalBoard className="mt-4" />
<FocusBoard className="custom-class" />
```

### Integration Example
See `integration-example.tsx` for examples of how to integrate these components into your existing project page.

## Demo Page

Visit `/demo` to see both components in action with a live preview and detailed feature descriptions.

## Styling Guidelines

- **Typography**: `font-sans text-neutral-800`
- **Colors**: Neutral palette with soft grays and whites
- **Animations**: Subtle motion transitions for entering/leaving elements
- **Shadows**: Soft shadows (`shadow-sm`, `shadow-md`) for depth
- **Borders**: Minimal borders, mostly using `border-0` for clean look
- **Hover Effects**: Gentle color transitions (`hover:bg-neutral-100`)

## Mock Data

Both components use the same mock data structure with tasks across all statuses:
- **todo**: 3 tasks
- **inProgress**: 2 tasks  
- **inReview**: 1 task
- **done**: 2 tasks
- **blocked**: 1 task

Each task includes:
- `id`, `title`, `description`
- `assignee` (name, avatar, initials)
- `dueDate`, `points`, `priority`
- `progress` (for FocusBoard only)

## Dependencies

- **Framer Motion**: For animations and transitions
- **Shadcn UI**: For base components (Card, Button, Avatar, Badge, etc.)
- **Lucide React**: For icons
- **Tailwind CSS**: For styling and responsive design

## Brand Identity

Both templates reinforce Lumi's brand identity of:
- **Clarity**: Clean, readable interfaces
- **Flow**: Smooth animations and transitions  
- **Calm**: Minimalistic design with neutral colors
- **Modern**: Contemporary UI patterns and interactions
