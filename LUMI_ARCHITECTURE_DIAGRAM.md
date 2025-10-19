# Lumi Work OS - System Architecture Diagram

## Overview
This document provides a comprehensive architectural diagram showing how the different systems in the Lumi Work OS interact with each other.

## System Architecture - Visual Flowchart

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                EXTERNAL SERVICES                               │
├─────────────────┬─────────────────┬─────────────────┬─────────────────────────┤
│   OpenAI GPT-4  │  Google OAuth   │   PostgreSQL    │      Redis Cache        │
│      API        │                 │    Database     │                         │
└─────────┬───────┴─────────────────┴─────────┬───────┴─────────────────────────┘
          │                                   │
          │                                   │
┌─────────▼─────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
├─────────────────┬─────────────────┬─────────────────────────────────────────┤
│  Next.js 15     │  Mobile App     │        Desktop App                      │
│   Web App       │   (Planned)     │        (Planned)                        │
└─────────┬───────┴─────────────────┴─────────────────────────────────────────┘
          │
          │
┌─────────▼─────────────────────────────────────────────────────────────────────┐
│                           FRONTEND COMPONENTS                                │
├─────────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────┤
│Dashboard│   Wiki  │Projects │  Tasks  │   AI    │Onboarding│OrgChart│Realtime│
│         │ System  │Management│Management│Assistant│ System  │        │Collaboration│
└─────────┴────┬────┴────┬────┴────┬────┴────┬────┴────┬────┴────┬────┴────┬────┘
               │         │         │         │         │         │         │
               │         │         │         │         │         │         │
┌───────────────▼─────────▼─────────▼─────────▼─────────▼─────────▼─────────▼─────┐
│                              API LAYER                                       │
├─────────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────┤
│   Auth  │   Wiki  │Project  │  Task   │   AI    │Onboarding│  Org   │ Search  │
│   API   │   API   │  API    │  API    │  API    │   API    │  API   │  API    │
└─────────┴────┬────┴────┬────┴────┬────┴────┬────┴────┬────┴────┬────┴────┬────┘
               │         │         │         │         │         │         │
               │         │         │         │         │         │         │
┌───────────────▼─────────▼─────────▼─────────▼─────────▼─────────▼─────────▼─────┐
│                            CORE SERVICES                                     │
├─────────┬─────────┬─────────┬─────────┬─────────┬─────────────────────────────┤
│   Auth  │Database │Realtime │   AI    │ Cache   │        Logger               │
│ Service │ Service │ Service │ Service │ Service │        Service              │
│NextAuth │ Prisma  │Socket.IO│OpenAI   │ Redis   │                             │
└─────────┴────┬────┴────┬────┴────┬────┴────┬────┴─────────────────────────────┘
               │         │         │         │
               │         │         │         │
┌───────────────▼─────────▼─────────▼─────────▼─────────────────────────────────┐
│                        BUSINESS LOGIC MODULES                                │
├─────────┬─────────┬─────────┬─────────┬─────────────────────────────────────┤
│   Wiki  │Project  │Onboarding│  Org   │              AI                     │
│ Module  │ Module  │ Module  │ Module  │            Module                   │
│Content  │Project  │Templates│User Mgmt│        Document Generation          │
│Management│Management│Progress │RBAC    │        Content Analysis             │
│Version  │Task Deps │Tracking │Workspace│        Smart Suggestions           │
│Control  │Kanban   │30/60/90 │Isolation│         RAG Search                  │
└─────────┴────┬────┴────┬────┴────┬────┴─────────────────────────────────────┘
               │         │         │
               │         │         │
┌───────────────▼─────────▼─────────▼─────────────────────────────────────────┐
│                              DATA LAYER                                     │
├─────────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────────────┤
│  User   │Workspace│   Wiki  │Project  │Onboarding│  Chat   │    Activity     │
│  Data   │  Data   │  Data   │  Data   │  Data    │  Data   │     Data        │
└─────────┴─────────┴─────────┴─────────┴─────────┴─────────┴─────────────────┘
```

## Simplified User Flow

```
👤 User
  │
  ▼
🌐 Browser
  │
  ▼
⚛️ Next.js Web App
  │
  ├───🔐 Authentication ────► 🗄️ PostgreSQL
  │
  ├───📚 Wiki System ──────► 🗄️ PostgreSQL
  │
  ├───📋 Project Management ► 🗄️ PostgreSQL
  │
  ├───🤖 AI Assistant ─────► 🧠 OpenAI GPT-4
  │                        │
  │                        ▼
  │                    🗄️ PostgreSQL
  │
  └───⚡ Real-time ────────► 🗄️ PostgreSQL
       │
       └─────────────────────► ⚛️ Next.js Web App

🗄️ PostgreSQL ◄─── ⚡ Redis Cache
```

## Data Flow Diagram

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│    User     │───►│   Browser   │───►│  Next.js    │───►│   Frontend  │
│             │    │             │    │   Web App   │    │ Components  │
└─────────────┘    └─────────────┘    └──────┬──────┘    └──────┬──────┘
                                              │                  │
                                              │                  ▼
                                              │           ┌─────────────┐
                                              │           │    API      │
                                              │           │   Layer     │
                                              │           └──────┬──────┘
                                              │                  │
                                              │                  ▼
                                              │           ┌─────────────┐
                                              │           │   Core      │
                                              │           │ Services    │
                                              │           └──────┬──────┘
                                              │                  │
                                              │                  ▼
                                              │           ┌─────────────┐
                                              │           │  Business   │
                                              │           │  Modules    │
                                              │           └──────┬──────┘
                                              │                  │
                                              │                  ▼
                                              │           ┌─────────────┐
                                              │           │    Data     │
                                              │           │   Layer     │
                                              │           └──────┬──────┘
                                              │                  │
                                              └──────────────────▼
                                                         ┌─────────────┐
                                                         │ PostgreSQL  │
                                                         │  Database   │
                                                         └─────────────┘
```

## Key System Interactions

### 1. **Authentication Flow**
```
User → Browser → Web App → Auth API → Auth Service → Google OAuth → Database
```

### 2. **Wiki Content Flow**
```
User → Wiki Component → Wiki API → Database Service → Wiki Module → Wiki Data → PostgreSQL
```

### 3. **AI Assistant Flow**
```
User → AI Component → AI API → AI Service → OpenAI API → Database
```

### 4. **Real-time Collaboration Flow**
```
User → Realtime Component ↔ Socket.IO Service ↔ Database ↔ Other Users
```

### 5. **Project Management Flow**
```
User → Project Component → Project API → Database Service → Project Module → Project Data → PostgreSQL
```

## Key System Interactions

### 1. **Authentication Flow**
- Users authenticate via Google OAuth or development credentials
- NextAuth.js manages sessions and JWT tokens
- Authentication service validates users and manages workspace access
- Role-based permissions control access to different features

### 2. **Wiki System**
- Rich text editor with markdown support
- Hierarchical page organization with parent-child relationships
- Version control and change tracking
- AI-powered content analysis and suggestions
- Real-time collaborative editing via WebSockets
- Search and discovery with RAG (Retrieval Augmented Generation)

### 3. **Project Management**
- Kanban board interface with drag-and-drop functionality
- Task dependencies and blocking relationships
- Project templates and task templates
- Real-time updates across team members
- Integration with wiki pages for project documentation

### 4. **AI Assistant**
- GPT-4 powered chat interface
- Document generation and content creation
- Wiki content analysis and quality scoring
- Smart suggestions and auto-tagging
- Context-aware responses using conversation history

### 5. **Real-time Collaboration**
- Socket.IO for WebSocket connections
- Live editing indicators for wiki pages
- Real-time task updates and notifications
- User presence tracking
- Project room management

### 6. **Onboarding System**
- Role-based onboarding templates
- 30/60/90 day progress tracking
- Task assignment and completion monitoring
- Manager dashboard for oversight
- Integration with project management

### 7. **Data Flow**
- Prisma ORM handles all database operations
- PostgreSQL stores all persistent data
- Redis provides caching for performance
- Real-time updates flow through WebSocket connections
- AI processing happens asynchronously

## Technology Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Component library
- **Framer Motion** - Animations
- **Socket.IO Client** - Real-time communication

### Backend
- **Next.js API Routes** - Serverless API endpoints
- **Prisma ORM** - Database abstraction layer
- **NextAuth.js** - Authentication framework
- **Socket.IO** - Real-time WebSocket server
- **OpenAI API** - AI capabilities

### Database
- **PostgreSQL** - Primary database
- **Redis** - Caching layer
- **pgvector** - Vector embeddings for AI search

### External Services
- **OpenAI GPT-4** - AI chat and content generation
- **Google OAuth** - User authentication
- **Various Integrations** - Slack, Google Drive, Microsoft Teams (planned)

## Security & Performance

### Security
- JWT-based authentication
- Role-based access control (RBAC)
- Workspace isolation
- API rate limiting
- Input validation and sanitization

### Performance
- Redis caching for frequently accessed data
- Database indexing for optimized queries
- Real-time updates via WebSockets
- Lazy loading and code splitting
- CDN for static assets

## Scalability Considerations

- **Horizontal Scaling**: Stateless API design allows for multiple server instances
- **Database Scaling**: Read replicas and connection pooling
- **Caching Strategy**: Multi-layer caching with Redis
- **Real-time Scaling**: Socket.IO clustering for WebSocket connections
- **AI Processing**: Async processing for AI operations to prevent blocking

This architecture provides a solid foundation for a comprehensive workplace operating system that can scale with growing teams and evolving requirements.
