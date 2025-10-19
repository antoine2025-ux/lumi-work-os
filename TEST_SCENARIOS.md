# 🎯 Lumi Work OS - Test Scenarios & User Flows

This document provides structured test scenarios to help testers explore the application systematically. Each scenario focuses on real-world use cases and includes specific steps to follow.

## 🎭 User Personas

### Primary Testers
- **HR Manager**: Needs onboarding automation and employee management
- **Project Manager**: Needs project tracking and team collaboration
- **Knowledge Worker**: Needs documentation and AI assistance
- **Team Lead**: Needs oversight and analytics

## 📋 Test Scenarios

### Scenario 1: New Employee Onboarding Journey
**Persona**: HR Manager  
**Duration**: 15-20 minutes  
**Goal**: Test the complete onboarding workflow

#### Steps:
1. **Access Onboarding System**
   - Navigate to `/onboarding`
   - Verify you can see the main dashboard with tabs

2. **Create AI-Generated Onboarding Plan**
   - Click "New Plan" button
   - Select "AI Generate" tab
   - Fill in details:
     - Role: "Software Engineer"
     - Seniority: "Mid-level"
     - Department: "Engineering"
     - Duration: "90 days"
   - Select an employee (or create a test employee)
   - Set start date to today
   - Click "Generate Plan"

3. **Review Generated Plan**
   - Verify the AI created relevant tasks
   - Check that tasks are properly categorized
   - Ensure due dates are reasonable

4. **Manage Tasks**
   - Mark 2-3 tasks as "In Progress"
   - Complete 1-2 tasks
   - Edit a task title or description
   - Verify progress bar updates automatically

5. **Check Analytics**
   - Navigate to Analytics tab
   - Verify completion metrics are displayed
   - Check that your progress is reflected

#### Expected Outcomes:
- AI generates relevant, personalized tasks
- Progress tracking works accurately
- Analytics reflect real-time changes

---

### Scenario 2: Knowledge Management Workflow
**Persona**: Knowledge Worker  
**Duration**: 20-25 minutes  
**Goal**: Test wiki creation, organization, and AI search

#### Steps:
1. **Create Company Documentation**
   - Navigate to `/wiki`
   - Create a new page titled "Company Handbook"
   - Add rich content:
     - Headings and subheadings
     - Bulleted lists
     - Numbered lists
     - Bold and italic text
   - Set category to "Company Policies"
   - Save the page

2. **Create Technical Documentation**
   - Create another page titled "API Documentation"
   - Add code blocks and technical content
   - Set category to "Technical"
   - Link to the Company Handbook page
   - Save the page

3. **Test Search Functionality**
   - Use the search bar to find "handbook"
   - Verify results show relevant pages
   - Test searching for "API" or "technical"

4. **Test AI Assistant**
   - Navigate to `/ask`
   - Ask: "What are the company policies?"
   - Verify AI response includes citations to your Company Handbook
   - Ask: "How do I use the API?"
   - Verify AI references your API Documentation

5. **Test Page Organization**
   - Create a sub-page under Company Handbook
   - Verify hierarchical organization works
   - Test navigation between pages

#### Expected Outcomes:
- Rich text editor works smoothly
- Search finds relevant content
- AI provides accurate answers with citations
- Page organization is intuitive

---

### Scenario 3: Project Management & Collaboration
**Persona**: Project Manager  
**Duration**: 25-30 minutes  
**Goal**: Test project creation, task management, and team collaboration

#### Steps:
1. **Create a New Project**
   - Navigate to `/projects`
   - Click "New Project"
   - Fill in project details:
     - Name: "Q1 Product Launch"
     - Description: "Launch new product features"
     - Start date: Today
     - End date: 3 months from now
   - Save the project

2. **Add Tasks and Assignments**
   - Add 5-6 tasks with different priorities
   - Assign tasks to different team members
   - Set due dates for tasks
   - Add task descriptions

3. **Use Kanban Board**
   - Switch to Kanban view
   - Drag tasks between columns (To Do, In Progress, Done)
   - Verify task status updates
   - Test filtering by assignee

4. **Create Project Templates**
   - Go to Templates section
   - Create a template based on your current project
   - Verify template saves correctly

5. **Test Project Analytics**
   - Check project progress metrics
   - Verify completion percentages
   - Test deadline tracking

#### Expected Outcomes:
- Project creation is straightforward
- Task management works smoothly
- Kanban board is responsive
- Templates save and load correctly

---

### Scenario 4: Cross-Feature Integration
**Persona**: Team Lead  
**Duration**: 30-35 minutes  
**Goal**: Test how different features work together

#### Steps:
1. **Create Project Documentation**
   - Create a wiki page about your project
   - Include project goals, timeline, and team info
   - Link to relevant onboarding materials

2. **Link Projects to Documentation**
   - In your project, add links to wiki pages
   - Create tasks that reference documentation
   - Verify links work correctly

3. **Use AI for Project Insights**
   - Ask AI: "What are the key deliverables for Q1 Product Launch?"
   - Verify AI can reference both project and wiki content
   - Ask: "Who should be assigned to technical tasks?"
   - Check if AI suggests based on onboarding data

4. **Test Dashboard Integration**
   - Navigate to main dashboard
   - Verify recent projects appear
   - Check that wiki pages show in recent activity
   - Test quick actions

5. **Test Real-time Updates**
   - Open the app in two browser tabs
   - Make changes in one tab
   - Verify updates appear in the other tab (if real-time is enabled)

#### Expected Outcomes:
- Features integrate seamlessly
- AI provides cross-feature insights
- Dashboard shows unified view
- Real-time updates work (if enabled)

---

### Scenario 5: Mobile & Responsive Testing
**Persona**: Any  
**Duration**: 15-20 minutes  
**Goal**: Test mobile responsiveness

#### Steps:
1. **Test Mobile Navigation**
   - Open app on mobile device or resize browser
   - Test navigation menu
   - Verify all main sections are accessible

2. **Test Mobile Wiki Editing**
   - Create/edit wiki pages on mobile
   - Test rich text editor on touch device
   - Verify formatting options work

3. **Test Mobile Project Management**
   - Use Kanban board on mobile
   - Test task creation and editing
   - Verify drag-and-drop works on touch

4. **Test Mobile AI Assistant**
   - Use AI chat on mobile
   - Test voice input (if available)
   - Verify responses are readable

#### Expected Outcomes:
- App is usable on mobile devices
- Touch interactions work smoothly
- Content is readable and accessible

---

## 🔍 Edge Cases & Error Testing

### Scenario 6: Error Handling & Edge Cases
**Persona**: Any  
**Duration**: 15-20 minutes  
**Goal**: Test error handling and edge cases

#### Steps:
1. **Test Invalid Inputs**
   - Try creating a project with no name
   - Try creating a task with invalid dates
   - Test AI with nonsensical questions

2. **Test Network Issues**
   - Disconnect internet briefly
   - Try to save changes
   - Reconnect and verify recovery

3. **Test Large Content**
   - Create a very long wiki page
   - Add many tasks to a project
   - Test performance with large datasets

4. **Test Concurrent Users**
   - Have two people edit the same page
   - Verify conflict resolution
   - Test simultaneous project updates

#### Expected Outcomes:
- Graceful error handling
- Clear error messages
- Data integrity maintained

---

## 📊 Performance Testing

### Scenario 7: Performance & Load Testing
**Persona**: Technical Tester  
**Duration**: 20-25 minutes  
**Goal**: Test application performance

#### Steps:
1. **Test Page Load Times**
   - Measure time to load main dashboard
   - Test wiki page loading
   - Check project list loading

2. **Test Search Performance**
   - Search with various terms
   - Test search with large datasets
   - Verify search results appear quickly

3. **Test AI Response Times**
   - Ask various AI questions
   - Measure response times
   - Test with complex queries

4. **Test Database Performance**
   - Create many projects/pages
   - Test with large amounts of data
   - Verify no performance degradation

#### Expected Outcomes:
- Fast page load times (< 3 seconds)
- Quick search results (< 1 second)
- Responsive AI answers (< 5 seconds)

---

## 🎯 Focus Areas for Different Testers

### For HR/People Operations:
- Focus on Scenarios 1, 2, and 4
- Test onboarding workflows thoroughly
- Verify analytics and reporting

### For Project Managers:
- Focus on Scenarios 3, 4, and 7
- Test project management features
- Verify collaboration tools

### For Technical Users:
- Focus on Scenarios 2, 4, 6, and 7
- Test API documentation features
- Verify technical performance

### For End Users:
- Focus on Scenarios 2, 4, and 5
- Test ease of use and navigation
- Verify mobile experience

---

## 📝 Testing Notes

### What to Document:
- Time taken for each scenario
- Any errors or issues encountered
- Performance observations
- Usability feedback
- Feature requests

### What to Skip:
- Don't worry about testing every single feature
- Focus on the scenarios most relevant to your role
- It's okay to skip technical performance testing if you're not technical

### When to Stop:
- If you encounter critical bugs that prevent testing
- If setup takes more than 30 minutes
- If the app is clearly not ready for testing

---

**Remember: The goal is to provide valuable feedback, not to test everything perfectly. Focus on the scenarios that matter most to you and your organization.**
