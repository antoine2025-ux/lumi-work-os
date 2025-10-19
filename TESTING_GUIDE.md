# 🧪 Lumi Work OS - Testing Guide

Welcome! This guide will help you test the Lumi Work OS application effectively. Follow these steps to get up and running quickly.

## 🚀 Quick Start (5 minutes)

### Prerequisites
- Node.js 18+ installed
- Git installed
- A PostgreSQL database (we'll help you set this up)

### Option 1: Docker Setup (Recommended for Testing)
This is the fastest way to get started:

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd lumi-work-os

# 2. Copy environment template
cp env.template .env.local

# 3. Start PostgreSQL with Docker
docker-compose up -d

# 4. Install dependencies
npm install

# 5. Set up the database
npx prisma generate
npx prisma db push

# 6. Seed with test data
npm run seed

# 7. Start the development server
npm run dev
```

### Option 2: Local PostgreSQL Setup
If you prefer to use your own PostgreSQL:

```bash
# 1-2. Same as above
git clone <your-repo-url>
cd lumi-work-os
cp env.template .env.local

# 3. Update .env.local with your PostgreSQL credentials
# Edit DATABASE_URL and DIRECT_URL in .env.local

# 4-7. Same as above
npm install
npx prisma generate
npx prisma db push
npm run seed
npm run dev
```

## 🔑 Required Environment Variables

You'll need to set up these environment variables in `.env.local`:

### Essential (Required)
```env
# Database - Use the Docker setup above or your own PostgreSQL
DATABASE_URL="postgresql://lumi_user:your-secure-postgres-password@localhost:5432/lumi_work_os?schema=public"
DIRECT_URL="postgresql://lumi_user:your-secure-postgres-password@localhost:5432/lumi_work_os?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# OpenAI (for AI features) - Optional but recommended
OPENAI_API_KEY="your-openai-api-key"
```

### Optional (for enhanced testing)
```env
# Google OAuth (for testing actual login flow)
# NOT REQUIRED - app has automatic test user in development mode
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Supabase (for file uploads)
NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"
```

## 🔐 Authentication Made Easy

**No Google OAuth setup required!** The app automatically creates a test user in development mode:
- **Test User:** `dev@lumi.local` (Development User)
- **Access Level:** Full owner permissions
- **Workspace:** Automatically created default workspace

## 🎯 What to Test

### Core Features to Focus On

#### 1. **Wiki System** (`/wiki`)
- ✅ Create new wiki pages
- ✅ Edit existing pages with rich text editor
- ✅ Organize pages with categories
- ✅ Search functionality
- ✅ Page permissions and sharing

#### 2. **AI Assistant** (`/ask`)
- ✅ Ask questions about wiki content
- ✅ AI-powered document creation
- ✅ Chat history and context

#### 3. **Onboarding System** (`/onboarding`)
- ✅ Create onboarding plans from templates
- ✅ Generate AI-powered onboarding plans
- ✅ Track task progress
- ✅ View analytics and completion rates

#### 4. **Project Management** (`/projects`)
- ✅ Create and manage projects
- ✅ Task creation and assignment
- ✅ Kanban board functionality
- ✅ Project templates

#### 5. **Dashboard** (`/dashboard`)
- ✅ Quick actions and shortcuts
- ✅ Recent activity
- ✅ AI suggestions

### Test Scenarios

#### Scenario 1: New Employee Onboarding
1. Go to `/onboarding`
2. Create a new onboarding plan using AI generation
3. Fill in role details (e.g., "Software Engineer", "Senior", "Engineering", "90 days")
4. Assign to a test employee
5. Complete several tasks and track progress
6. Check analytics to see completion metrics

#### Scenario 2: Knowledge Management
1. Go to `/wiki`
2. Create a new page about "Company Policies"
3. Add rich content with headings, lists, and formatting
4. Set appropriate category and permissions
5. Go to `/ask` and ask questions about the content you just created
6. Verify AI responses include citations to your content

#### Scenario 3: Project Workflow
1. Go to `/projects`
2. Create a new project
3. Add tasks with different priorities and assignees
4. Use the Kanban board to move tasks through stages
5. Test the project templates feature

#### Scenario 4: Cross-Feature Integration
1. Create wiki pages about a project
2. Link to those pages from project tasks
3. Use AI assistant to ask questions about the project
4. Create onboarding plans that reference the wiki content

## 🐛 Common Issues & Solutions

### Database Connection Issues
```bash
# If you get database connection errors:
docker-compose down
docker-compose up -d
npx prisma db push
```

### Port Already in Use
```bash
# If port 3000 is busy:
npm run dev -- -p 3001
# Then visit http://localhost:3001
```

### Missing Dependencies
```bash
# If you get module errors:
rm -rf node_modules package-lock.json
npm install
```

### Database Schema Issues
```bash
# If you get Prisma errors:
npx prisma generate
npx prisma db push --force-reset
npm run seed
```

## 📝 Feedback Collection

Please test the following areas and provide feedback:

### User Experience
- [ ] Is the interface intuitive and easy to navigate?
- [ ] Are the features discoverable?
- [ ] Is the design clean and professional?
- [ ] Are there any confusing or unclear elements?

### Functionality
- [ ] Do all features work as expected?
- [ ] Are there any bugs or errors?
- [ ] Is the performance acceptable?
- [ ] Do the AI features provide useful results?

### Technical Issues
- [ ] Any setup difficulties?
- [ ] Browser compatibility issues?
- [ ] Mobile responsiveness problems?
- [ ] Performance bottlenecks?

### Feature Requests
- [ ] What features are missing?
- [ ] What would make this more useful?
- [ ] Any workflow improvements?

## 📊 Test Data

The application comes with seeded test data including:
- Sample wiki pages
- Onboarding templates
- Project templates
- Test users and workspaces

You can explore this data to understand the system better, or create your own content.

## 🔧 Development Commands

```bash
# Start development server
npm run dev

# Start with real-time features
npm run dev:realtime

# Build for production
npm run build

# Run linting
npm run lint

# Database operations
npx prisma studio          # Open database GUI
npx prisma db push         # Push schema changes
npm run seed              # Reseed database
```

## 📞 Support

If you encounter any issues:
1. Check this guide first
2. Look at the console for error messages
3. Try the common solutions above
4. Create an issue in the repository with:
   - What you were trying to do
   - What happened instead
   - Any error messages
   - Your browser and OS

## 🎉 Thank You!

Your testing and feedback is invaluable for improving Lumi Work OS. Focus on the core features that interest you most, and don't worry about testing everything - even testing one feature thoroughly helps!

---

**Happy Testing! 🚀**
