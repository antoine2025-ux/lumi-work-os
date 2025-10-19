# 🧪 Lumi Work OS - Testing Package

Welcome! This package contains everything you need to test the Lumi Work OS application effectively.

## 📁 What's Included

- **`TESTING_GUIDE.md`** - Complete setup and testing instructions
- **`TEST_SCENARIOS.md`** - Structured test scenarios and user flows
- **`FEEDBACK_TEMPLATE.md`** - Structured feedback collection template
- **`setup-for-testing.sh`** - Automated setup script (Unix/Mac)
- **`env.template`** - Environment configuration template

## 🚀 Quick Start (3 Steps)

### 1. Run the Setup Script
```bash
# Make the script executable and run it
chmod +x setup-for-testing.sh
./setup-for-testing.sh
```

### 2. Start Testing
```bash
# Start the development server
npm run dev

# Open http://localhost:3000 in your browser
```

### 3. Follow Test Scenarios
- Open `TEST_SCENARIOS.md` and pick scenarios relevant to your role
- Use `FEEDBACK_TEMPLATE.md` to structure your feedback

## 🎯 What to Test

### Core Features
- **Wiki System** - Create and manage documentation
- **AI Assistant** - Ask questions and get AI-powered answers
- **Onboarding System** - Create and track employee onboarding plans
- **Project Management** - Manage projects and tasks with Kanban boards
- **Dashboard** - Centralized view of all activities

### Test Scenarios Available
1. **New Employee Onboarding Journey** (HR focus)
2. **Knowledge Management Workflow** (Content focus)
3. **Project Management & Collaboration** (PM focus)
4. **Cross-Feature Integration** (Power user focus)
5. **Mobile & Responsive Testing** (UX focus)
6. **Error Handling & Edge Cases** (Technical focus)
7. **Performance & Load Testing** (Technical focus)

## 📋 Prerequisites

- Node.js 18+
- Git
- Docker (recommended for easy database setup)
- OpenAI API key (for AI features)

## 🔧 Troubleshooting

### Common Issues
- **Database connection errors**: Run `docker-compose down && docker-compose up -d`
- **Port already in use**: Use `npm run dev -- -p 3001`
- **Missing dependencies**: Run `rm -rf node_modules package-lock.json && npm install`

### Getting Help
- Check `TESTING_GUIDE.md` for detailed troubleshooting
- Look at console errors in your browser
- Create a GitHub issue with your feedback

## 📝 Providing Feedback

Use the `FEEDBACK_TEMPLATE.md` to provide structured feedback. Focus on:

- **Setup experience** - Was it easy to get started?
- **Core features** - Do the main features work as expected?
- **User experience** - Is the interface intuitive?
- **Bugs & issues** - Any problems you encountered?
- **Suggestions** - What would make this better?

## 🎉 Thank You!

Your testing and feedback is invaluable for improving Lumi Work OS. Even testing one feature thoroughly helps!

**Questions?** Open an issue in the repository or contact the development team.

---

*Happy Testing! 🚀*
