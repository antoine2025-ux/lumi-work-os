# Lumi Work OS

A calm, minimal platform for companies to manage knowledge, onboarding, and workflows. Built with Next.js 14, TypeScript, and modern web technologies.

## Features

### 🏢 Multi-tenant Workspaces
- Secure workspace isolation
- Role-based access control (Owner, Admin, Member)
- Team management and invitations

### 📚 Wiki System
- Markdown-based documentation
- Hierarchical page organization
- Tags and attachments support
- Version history and comments
- AI-powered search with citations

### 🎓 Clario Onboarding
- Role-based onboarding templates
- 30/60/90 day plans
- Task tracking and progress monitoring
- Manager dashboard for oversight

### 👥 Org Chart
- Interactive organization structure
- Drag-and-drop functionality
- Employee profiles and contact info
- Reporting relationships

### 🤖 AI Search (Ask Wiki)
- RAG-powered Q&A over wiki content
- Source citations and references
- Natural language queries
- Contextual responses

### 🔗 Integrations
- Slack notifications and workflows
- Google Drive document sync
- Extensible integration framework
- Real-time status monitoring

### ⚙️ BPM Lite
- Workflow definition and execution
- JSON/YAML workflow definitions
- Assignment and approval processes
- Execution logs and analytics

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS + shadcn/ui
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **AI/ML**: OpenAI (GPT-4, text-embedding-3-large)
- **File Storage**: Supabase Storage
- **State Management**: TanStack Query
- **Vector Database**: pgvector extension

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- OpenAI API key
- Google OAuth credentials (optional)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd lumi-work-os
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp env.template .env.local
```

4. Configure your environment variables in `.env.local`:
```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/lumi_work_os?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# OAuth Providers
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# OpenAI
OPENAI_API_KEY="your-openai-api-key"

# Supabase (for file storage)
NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"
```

5. Set up the database:
```bash
npx prisma generate
npx prisma db push
```

6. Run the development server:
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (dashboard)/       # Protected dashboard routes
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   └── login/             # Login page
├── components/            # Reusable UI components
│   ├── ui/               # shadcn/ui components
│   └── layout/           # Layout components
├── lib/                  # Utility functions and configurations
│   ├── auth.ts           # NextAuth configuration
│   ├── db.ts             # Prisma client
│   └── utils.ts          # Utility functions
├── modules/              # Feature modules
│   ├── wiki/             # Wiki functionality
│   ├── ai/               # AI search and RAG
│   ├── onboarding/       # Clario onboarding
│   ├── org/              # Org chart
│   ├── bpm/              # Business process management
│   └── integrations/     # Third-party integrations
└── types/                # TypeScript type definitions
```

## Key Features Implementation

### Authentication & Authorization
- NextAuth.js with Google OAuth and email providers
- Multi-tenant workspace support
- Role-based access control
- Protected routes and middleware

### Database Schema
- Comprehensive Prisma schema
- Multi-tenant architecture
- Vector embeddings for AI search
- Optimized for performance and scalability

### UI/UX Design
- Clean, minimal design with Montserrat font
- Soft blue color scheme
- Responsive layout
- Accessible components

### AI Integration
- OpenAI GPT-4 for chat interface
- Text embeddings for semantic search
- RAG implementation with citations
- Context-aware responses

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Prisma Studio

### Database Management

```bash
# Generate Prisma client after schema changes
npx prisma generate

# Push schema changes to database
npx prisma db push

# Create and run migrations
npx prisma migrate dev

# Open Prisma Studio
npx prisma studio
```

## Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- Railway
- Render
- DigitalOcean App Platform
- AWS Amplify

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please open an issue in the GitHub repository.

---

Built with ❤️ using Next.js, TypeScript, and modern web technologies.