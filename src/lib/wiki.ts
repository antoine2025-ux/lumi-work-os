// Mock wiki context - in a real implementation, this would fetch from vector search
export function getWikiContext(): string {
  return `
Company Overview:
Lumi is a modern work management platform that helps teams collaborate effectively. We focus on project management, knowledge sharing, and team coordination.

Company Values:
- Innovation: We embrace new ideas and technologies
- Collaboration: We work together to achieve common goals
- Quality: We deliver high-quality products and services
- Growth: We continuously learn and improve

Development Practices:
- We use modern development tools and practices
- Code reviews are mandatory for all changes
- We follow agile methodologies
- We prioritize security and performance

Marketing Approach:
- We focus on content marketing and thought leadership
- We use data-driven decision making
- We emphasize user experience and customer success
- We maintain consistent brand messaging

HR Processes:
- We have a comprehensive onboarding process
- We provide regular feedback and performance reviews
- We offer professional development opportunities
- We maintain an inclusive and diverse workplace

Tools and Technologies:
- Frontend: React, Next.js, TypeScript, Tailwind CSS
- Backend: Node.js, Prisma, PostgreSQL
- Infrastructure: AWS, Docker, CI/CD pipelines
- Communication: Slack, Zoom, Notion
- Project Management: Lumi (our own platform), GitHub, Linear
`
}













