# Lumi Work OS - UI Mockup

## 🎨 Main Dashboard Layout

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 🌟 Lumi Work OS                    🔍 Search projects...     🔔 👤 Antoine     │
├─────────────────────────────────────────────────────────────────────────────────┤
│ 📁 Projects    │ ┌─────────────────────────────────────────────────────────────┐ │
│ 📚 Wiki        │ │ Project: Website Redesign                    👥 3 online   │ │
│ 🤖 AI Assistant│ ├─────────────────────────────────────────────────────────────┤ │
│ ⚙️ Settings    │ │ To Do (5)        │ In Progress (3)    │ Done (12)          │ │
│                │ │ ┌─────────────┐  │ ┌─────────────┐    │ ┌─────────────┐    │ │
│                │ │ │ Design Home │  │ │ Code Header │    │ │ Setup DB    │    │ │
│                │ │ │ 👤 Sarah    │  │ │ 👤 Mike     │    │ │ 👤 Alex     │    │ │
│                │ │ │ ⏰ Due: 2d  │  │ │ ⏰ Due: 1d  │    │ │ ✅ Complete │    │ │
│                │ │ │ 🔴 High     │  │ │ 🟡 Medium   │    │ │ 🟢 Low      │    │ │
│                │ │ └─────────────┘  │ └─────────────┘    │ └─────────────┘    │ │
│                │ │ ┌─────────────┐  │ ┌─────────────┐    │ ┌─────────────┐    │ │
│                │ │ │ Create Logo │  │ │ Test Forms  │    │ │ Deploy API  │    │ │
│                │ │ │ 👤 Tom      │  │ │ 👤 Sarah    │    │ │ 👤 Mike     │    │ │
│                │ │ │ ⏰ Due: 3d  │  │ │ ⏰ Due: 2d  │    │ │ ✅ Complete │    │ │
│                │ │ │ 🟡 Medium   │  │ │ 🔴 High     │    │ │ 🟢 Low      │    │ │
│                │ │ └─────────────┘  │ └─────────────┘    │ └─────────────┘    │ │
│                │ └─────────────────────────────────────────────────────────────┘ │
│                │ ┌─────────────────────────────────────────────────────────────┐ │
│                │ │ 💬 Activity Feed (Live)                                   │ │
│                │ │ • Sarah updated "Design Home" task                        │ │
│                │ │ • Mike joined the project                                 │ │
│                │ │ • Alex completed "Setup DB" task                          │ │
│                │ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 🎯 Key Design Elements

### 1. Clean Header
- **Logo**: Simple, memorable
- **Search**: Prominent, helpful
- **Notifications**: Subtle bell icon
- **Profile**: Clean avatar + name

### 2. Minimal Sidebar
- **Icons only** (with labels on hover)
- **Active state** highlighting
- **Collapsible** on mobile
- **Consistent spacing**

### 3. Main Content Area
- **Three-column layout**:
  - **Left**: Project view (Kanban/List)
  - **Center**: Task details (when selected)
  - **Right**: Activity feed (real-time)

### 4. Task Cards
- **Clean white background**
- **Soft shadows** for depth
- **Rounded corners** (8px)
- **Subtle hover effects**
- **Clear information hierarchy**

## 🎨 Color Scheme

### Primary Colors:
- **Blue**: #3B82F6 (Primary actions)
- **Gray**: #6B7280 (Secondary text)
- **Green**: #10B981 (Success states)
- **Red**: #EF4444 (Error states)
- **Yellow**: #F59E0B (Warning states)

### Background Colors:
- **Main**: #FAFAFA (Off-white)
- **Cards**: #FFFFFF (Pure white)
- **Borders**: #E5E7EB (Light gray)

## 🔄 Real-time Features

### Presence Indicators:
- **Small colored dots** (4px) on avatars
- **Green**: Online
- **Yellow**: Away
- **Gray**: Offline

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

## 📱 Responsive Design

### Mobile (< 768px):
```
┌─────────────────────────────────┐
│ 🌟 Lumi    🔍    🔔    👤      │
├─────────────────────────────────┤
│ ☰ Menu                         │
├─────────────────────────────────┤
│ Project: Website Redesign       │
│ 👥 3 online                     │
├─────────────────────────────────┤
│ To Do (5)                       │
│ ┌─────────────────────────────┐ │
│ │ Design Home                 │ │
│ │ 👤 Sarah  ⏰ 2d  🔴 High   │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ Create Logo                 │ │
│ │ 👤 Tom    ⏰ 3d  🟡 Medium │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│ In Progress (3)                 │
│ ┌─────────────────────────────┐ │
│ │ Code Header                 │ │
│ │ 👤 Mike   ⏰ 1d  🟡 Medium │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

### Tablet (768px - 1024px):
```
┌─────────────────────────────────────────────────────────┐
│ 🌟 Lumi Work OS    🔍 Search...    🔔 👤 Antoine       │
├─────────────────────────────────────────────────────────┤
│ 📁 Projects │ ┌─────────────────────────────────────────┐ │
│ 📚 Wiki     │ │ Project: Website Redesign    👥 3 online│ │
│ 🤖 AI       │ ├─────────────────────────────────────────┤ │
│ ⚙️ Settings │ │ To Do (5)        │ In Progress (3)      │ │
│             │ │ ┌─────────────┐  │ ┌─────────────┐      │ │
│             │ │ │ Design Home │  │ │ Code Header │      │ │
│             │ │ │ 👤 Sarah    │  │ │ 👤 Mike     │      │ │
│             │ │ │ ⏰ Due: 2d  │  │ │ ⏰ Due: 1d  │      │ │
│             │ │ └─────────────┘  │ └─────────────┘      │ │
│             │ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## 🚀 Implementation Strategy

### Phase 1: Core Layout (Week 1)
1. Clean header with search
2. Simplified sidebar
3. Main content area
4. Basic task cards

### Phase 2: Real-time Features (Week 2)
1. Subtle presence indicators
2. Live updates with animations
3. Notification system
4. Activity feed

### Phase 3: Advanced Features (Week 3)
1. Drag & drop (smooth animations)
2. Keyboard shortcuts
3. Advanced filtering
4. Custom views

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
