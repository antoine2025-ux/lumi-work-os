# Lumi Work OS - UI Design Strategy

## 🎯 Design Philosophy: "Calm Productivity"

### Core Principles:
1. **Minimal Visual Noise** - Clean, uncluttered interface
2. **Focused Information** - Only show what's necessary
3. **Subtle Real-time** - Presence without distraction
4. **Progressive Disclosure** - Show details when needed
5. **Consistent Spacing** - 8px grid system
6. **Soft Colors** - Muted, professional palette

## 🏗️ Layout Structure

### Main Dashboard Layout:
```
┌─────────────────────────────────────────────────────────┐
│ Header: Logo | Search | Notifications | Profile        │
├─────────────────────────────────────────────────────────┤
│ Sidebar: Projects | Wiki | AI | Settings               │
├─────────────────────────────────────────────────────────┤
│ Main Content Area                                       │
│ ┌─────────────────┬─────────────────┬─────────────────┐ │
│ │ Project View    │ Task Details    │ Activity Feed   │ │
│ │ (Kanban/List)   │ (Side Panel)    │ (Real-time)     │ │
│ └─────────────────┴─────────────────┴─────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## 🎨 Visual Design System

### Color Palette:
- **Primary**: Soft blue (#3B82F6) - Calm, trustworthy
- **Secondary**: Warm gray (#6B7280) - Professional
- **Success**: Soft green (#10B981) - Subtle success
- **Warning**: Soft amber (#F59E0B) - Gentle alerts
- **Error**: Soft red (#EF4444) - Non-aggressive errors
- **Background**: Off-white (#FAFAFA) - Easy on eyes
- **Surface**: Pure white (#FFFFFF) - Clean cards

### Typography:
- **Headings**: Inter (clean, modern)
- **Body**: Inter (readable, friendly)
- **Code**: JetBrains Mono (technical clarity)

### Spacing System:
- **xs**: 4px
- **sm**: 8px
- **md**: 16px
- **lg**: 24px
- **xl**: 32px
- **2xl**: 48px

## 🔄 Real-time Features (Subtle Integration)

### Presence Indicators:
- **Online**: Small green dot (4px)
- **Away**: Small yellow dot (4px)
- **Offline**: Small gray dot (4px)
- **Position**: Top-right of avatars

### Live Updates:
- **Subtle animations** (200ms ease-in-out)
- **Soft glow** on updated items
- **Gentle slide-in** for new items
- **No jarring movements**

### Notifications:
- **Toast style** (top-right corner)
- **Soft shadows** and rounded corners
- **Auto-dismiss** after 4 seconds
- **Quiet sound** (optional)

## 📋 Task Management UI

### Kanban Board:
```
┌─────────────────────────────────────────────────────────┐
│ Project: Website Redesign                    👥 3 users │
├─────────────────────────────────────────────────────────┤
│ To Do (5)        │ In Progress (3)    │ Done (12)       │
│ ┌─────────────┐  │ ┌─────────────┐    │ ┌─────────────┐ │
│ │ Task Card   │  │ │ Task Card   │    │ │ Task Card   │ │
│ │ 👤 Avatar   │  │ │ 👤 Avatar   │    │ │ 👤 Avatar   │ │
│ │ ⏰ Due: 2d  │  │ │ ⏰ Due: 1d  │    │ │ ✅ Complete │ │
│ └─────────────┘  │ └─────────────┘    │ └─────────────┘ │
│ ┌─────────────┐  │ ┌─────────────┐    │ ┌─────────────┐ │
│ │ Task Card   │  │ │ Task Card   │    │ │ Task Card   │ │
│ │ 👤 Avatar   │  │ │ 👤 Avatar   │    │ │ 👤 Avatar   │ │
│ │ ⏰ Due: 3d  │  │ │ ⏰ Due: 2d  │    │ │ ✅ Complete │ │
│ └─────────────┘  │ └─────────────┘    │ └─────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Task Card Design:
- **Clean white background**
- **Soft shadow** (0 1px 3px rgba(0,0,0,0.1))
- **Rounded corners** (8px)
- **Subtle border** (1px solid #E5E7EB)
- **Hover effect** (slight lift + shadow increase)

## 🎯 Competitive Advantages

### vs Asana:
- **Less cluttered** - Remove unnecessary UI elements
- **Better focus** - Single-column layout for tasks
- **Cleaner colors** - Muted palette vs bright colors
- **Subtle animations** - Less distracting than Asana's

### vs Monday.com:
- **Simpler interface** - Remove complex color coding
- **Better hierarchy** - Clear information structure
- **Calmer design** - Less overwhelming visual noise
- **Focused workflow** - Streamlined task management

### vs Notion:
- **Faster loading** - Optimized for speed
- **Better real-time** - True collaboration features
- **Cleaner editing** - Less complex formatting options
- **Focused purpose** - PM tool, not general workspace

## 🚀 Implementation Priority

### Phase 1: Core Layout
1. Clean header with search
2. Simplified sidebar
3. Main content area
4. Basic task cards

### Phase 2: Real-time Features
1. Subtle presence indicators
2. Live updates with animations
3. Notification system
4. Activity feed

### Phase 3: Advanced Features
1. Drag & drop (smooth animations)
2. Keyboard shortcuts
3. Advanced filtering
4. Custom views

## 📱 Responsive Design

### Mobile (< 768px):
- **Collapsible sidebar**
- **Single column layout**
- **Touch-friendly buttons**
- **Swipe gestures**

### Tablet (768px - 1024px):
- **Two-column layout**
- **Larger touch targets**
- **Optimized spacing**

### Desktop (> 1024px):
- **Three-column layout**
- **Full feature set**
- **Keyboard shortcuts**
- **Hover effects**

## 🎨 Component Library

### Buttons:
- **Primary**: Blue background, white text
- **Secondary**: White background, blue border
- **Ghost**: Transparent background, blue text
- **Danger**: Red background, white text

### Cards:
- **Elevated**: White background, shadow
- **Flat**: White background, border
- **Interactive**: Hover effects, cursor pointer

### Forms:
- **Clean inputs** with subtle borders
- **Focused states** with blue accent
- **Error states** with red accent
- **Success states** with green accent

## 🔧 Technical Implementation

### CSS Framework:
- **Tailwind CSS** for utility classes
- **Custom components** for complex UI
- **CSS Grid** for layouts
- **Flexbox** for components

### Animation Library:
- **Framer Motion** for smooth animations
- **CSS Transitions** for simple effects
- **GSAP** for complex animations (if needed)

### State Management:
- **React Context** for global state
- **Zustand** for complex state
- **React Query** for server state
