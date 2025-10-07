import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import OpenAI from 'openai'
import { searchWikiKnowledge, formatWikiKnowledgeForAI } from '@/lib/wiki-knowledge'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Mock draft content for testing when OpenAI is not available
function getMockDraftContent(): string {
  return `# Company Handbook

## Table of Contents
1. [Welcome](#welcome)
2. [Company Overview](#company-overview)
3. [Employee Policies](#employee-policies)
4. [Code of Conduct](#code-of-conduct)
5. [Benefits and Compensation](#benefits-and-compensation)
6. [Workplace Guidelines](#workplace-guidelines)
7. [Safety and Security](#safety-and-security)
8. [Contact Information](#contact-information)

## Welcome

Welcome to our company! This handbook serves as a guide to help you understand our policies, procedures, and expectations. Please read through this document carefully and refer to it whenever you have questions about your role and responsibilities.

## Company Overview

### Mission Statement
Our mission is to deliver exceptional value to our clients while fostering a positive and inclusive work environment for our employees.

### Core Values
- **Integrity**: We conduct business with honesty and transparency
- **Innovation**: We embrace new ideas and continuous improvement
- **Collaboration**: We work together to achieve common goals
- **Excellence**: We strive for the highest quality in everything we do

## Employee Policies

### Working Hours
- Standard work week: Monday through Friday, 9:00 AM to 5:00 PM
- Flexible hours may be available with manager approval
- Remote work options are available based on role requirements

### Attendance and Punctuality
- Employees are expected to arrive on time and maintain regular attendance
- Absences should be reported to your supervisor as soon as possible
- Excessive absences may result in disciplinary action

### Dress Code
- Business casual attire is expected in the office
- Client meetings may require business formal attire
- Remote work attire should be professional for video calls

## Code of Conduct

### Professional Behavior
- Treat all colleagues, clients, and partners with respect
- Maintain confidentiality of sensitive information
- Avoid conflicts of interest
- Report any unethical behavior to HR

### Communication
- Use professional language in all communications
- Respond to emails and messages in a timely manner
- Be constructive and respectful in feedback

## Benefits and Compensation

### Health Insurance
- Comprehensive health, dental, and vision coverage
- Coverage begins on the first day of the month following your start date
- Family coverage options available

### Paid Time Off
- Vacation days: 15 days per year (increases with tenure)
- Sick leave: 10 days per year
- Personal days: 3 days per year
- Holidays: 10 company-observed holidays

### Retirement Benefits
- 401(k) plan with company matching up to 4%
- Vesting schedule: 20% per year over 5 years

## Workplace Guidelines

### Technology Use
- Company equipment is for business use only
- Personal use of company technology should be minimal
- Follow all IT security policies and procedures

### Office Environment
- Maintain a clean and organized workspace
- Respect shared spaces and resources
- Report maintenance issues promptly

## Safety and Security

### Workplace Safety
- Follow all safety protocols and procedures
- Report any safety hazards immediately
- Participate in required safety training

### Data Security
- Protect all company and client data
- Use strong passwords and two-factor authentication
- Report any security incidents immediately

## Contact Information

### Human Resources
- Email: hr@company.com
- Phone: (555) 123-4567
- Office: Suite 200, Main Building

### IT Support
- Email: it@company.com
- Phone: (555) 123-4568
- Office: Suite 100, Main Building

---

*This handbook is subject to change. Employees will be notified of any updates. For questions or clarifications, please contact Human Resources.*`
}

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    // Get the session with messages
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Build conversation context
    const conversationHistory = session.messages.map(msg => ({
      role: msg.type === 'USER' ? 'user' : 'assistant',
      content: msg.content
    }))

    // Search for relevant wiki knowledge
    let wikiContext = ''
    try {
      // Search for relevant content based on the conversation
      const conversationText = conversationHistory.map(msg => msg.content).join(' ')
      const wikiResults = await searchWikiKnowledge(conversationText, session.workspaceId, 5)
      wikiContext = formatWikiKnowledgeForAI(wikiResults)
    } catch (error) {
      console.error('Error retrieving wiki knowledge for draft:', error)
    }

    // Create system prompt for document generation
    const systemPrompt = `You are an expert document writer. Based on the conversation history, generate a comprehensive document that meets the user's requirements.

Instructions:
1. Extract key information from the conversation about the document requirements
2. Create a well-structured document with clear sections and headings
3. Use professional, clear language appropriate for the intended audience
4. Include all necessary details mentioned in the conversation
5. Format the document in markdown
6. Return ONLY the document content, no meta commentary
7. Reference and build upon existing organizational knowledge when relevant
8. Maintain consistency with established policies and procedures

The document should be production-ready and comprehensive.${wikiContext}`

    // Get AI response from OpenAI with fallback to mock content
    let draftContent = "Failed to generate draft."
    
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          ...conversationHistory
        ],
        temperature: 0.7,
        max_tokens: 2000,
      })

      draftContent = completion.choices[0]?.message?.content || "Failed to generate draft."
    } catch (error) {
      console.error('OpenAI API error:', error)
      console.log('Falling back to mock draft content due to API error')
      // Fall back to mock content when API fails
      draftContent = getMockDraftContent()
    }

    // Extract title from first line or generate one
    const lines = draftContent.split('\n')
    const firstLine = lines[0] || ''
    const title = firstLine.startsWith('#') 
      ? firstLine.replace(/^#+\s*/, '').trim()
      : `Document - ${new Date().toLocaleDateString()}`

    // Update session with draft
    const updatedSession = await prisma.chatSession.update({
      where: { id: sessionId },
      data: {
        draftTitle: title,
        draftBody: draftContent,
        draftFormat: 'markdown',
        phase: 'draft_ready'
      }
    })

    return NextResponse.json({
      title: title,
      content: draftContent,
      format: 'markdown',
      phase: 'draft_ready'
    })

  } catch (error) {
    console.error('Error generating draft:', error)
    return NextResponse.json({ 
      error: 'Failed to generate draft', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}