# Lumi Work OS - Architecture Pages

## Overview
This document describes the new architecture pages that provide interactive diagrams and comprehensive documentation for the Lumi Work OS system.

## Pages Created

### 1. Main Architecture Page
**URL:** `/architecture`
**File:** `src/app/(dashboard)/architecture/page.tsx`

- Overview of the system architecture
- Quick stats and technology stack
- Links to interactive diagram and documentation
- Key features and capabilities overview

### 2. Interactive Diagram Page
**URL:** `/architecture/diagram`
**File:** `src/app/(dashboard)/architecture/diagram/page.tsx`

- Interactive system architecture diagram
- Clickable components with detailed information
- System interaction flows
- Dependency analysis
- Real-time component relationships

### 3. Documentation Page
**URL:** `/architecture/docs`
**File:** `src/app/(dashboard)/architecture/docs/page.tsx`

- Comprehensive system documentation
- Detailed explanations of each layer
- Communication patterns
- Data flow diagrams
- Design patterns and best practices

## Features

### Interactive Diagram
- **Clickable Components**: Click any system component to see detailed information
- **Visual Connections**: Arrows show how components connect and depend on each other
- **Color-coded Layers**: Different colors for different types of components
- **Real-time Information**: Detailed descriptions, dependencies, and connections

### System Interactions
- **Authentication Flow**: Complete user login process
- **Wiki Content Flow**: How content is created and managed
- **AI Assistant Flow**: AI chat and content generation process
- **Real-time Collaboration**: Live editing and updates
- **Project Management Flow**: Task and project management

### Documentation
- **System Layers**: Detailed explanation of each architectural layer
- **Communication Patterns**: How different systems communicate
- **Data Flow**: How data moves through the system
- **Design Patterns**: Architectural patterns and best practices
- **Technology Stack**: Complete list of technologies used

## Navigation

The architecture pages are accessible through:
1. **Main Navigation**: "Architecture" link in the header navigation
2. **Direct URLs**: 
   - `/architecture` - Main overview page
   - `/architecture/diagram` - Interactive diagram
   - `/architecture/docs` - Comprehensive documentation

## Technical Details

### Components
- Built with Next.js 15 and React 19
- Uses shadcn/ui components for consistent styling
- TypeScript for type safety
- Responsive design for all screen sizes

### Data Structure
- System nodes with positions, connections, and metadata
- Interactive flows with step-by-step processes
- Dependency mapping between components
- Real-time component relationships

### Styling
- Color-coded components by type
- Hover effects and animations
- Responsive grid layouts
- Consistent with Lumi design system

## Usage

1. **For Developers**: Use the interactive diagram to understand system architecture
2. **For Documentation**: Reference the docs page for detailed explanations
3. **For Onboarding**: New team members can explore the system structure
4. **For Planning**: Use dependency information for system modifications

## Future Enhancements

- [ ] Add search functionality for components
- [ ] Implement zoom and pan for the diagram
- [ ] Add export functionality for diagrams
- [ ] Include performance metrics
- [ ] Add system health indicators
- [ ] Implement real-time system monitoring

## Maintenance

To update the architecture diagrams:
1. Modify the `systemNodes` array in the diagram page
2. Update the `systemInteractions` array for flow changes
3. Add new components to the appropriate layer
4. Update connections and dependencies as needed
5. Test the interactive functionality

The architecture pages provide a comprehensive view of the Lumi Work OS system, making it easy to understand how all components work together and depend on each other.
