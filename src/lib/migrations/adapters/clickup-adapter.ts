import { MigrationItem, ClickUpTask } from '../types'

export class ClickUpAdapter {
  private apiKey: string
  private baseUrl = 'https://api.clickup.com/api/v2'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async fetchAllTasks(teamId: string): Promise<ClickUpTask[]> {
    const tasks: ClickUpTask[] = []
    
    // Get all spaces
    const spacesResponse = await fetch(`${this.baseUrl}/team/${teamId}/space`, {
      headers: {
        'Authorization': this.apiKey,
        'Content-Type': 'application/json'
      }
    })

    if (!spacesResponse.ok) {
      throw new Error(`ClickUp API error: ${spacesResponse.status}`)
    }

    const spaces = await spacesResponse.json()

    // Get all folders and lists
    for (const space of spaces.spaces) {
      const foldersResponse = await fetch(`${this.baseUrl}/space/${space.id}/folder`, {
        headers: {
          'Authorization': this.apiKey,
          'Content-Type': 'application/json'
        }
      })

      if (foldersResponse.ok) {
        const folders = await foldersResponse.json()
        
        for (const folder of folders.folders) {
          const listsResponse = await fetch(`${this.baseUrl}/folder/${folder.id}/list`, {
            headers: {
              'Authorization': this.apiKey,
              'Content-Type': 'application/json'
            }
          })

          if (listsResponse.ok) {
            const lists = await listsResponse.json()
            
            for (const list of lists.lists) {
              const tasksResponse = await fetch(`${this.baseUrl}/list/${list.id}/task`, {
                headers: {
                  'Authorization': this.apiKey,
                  'Content-Type': 'application/json'
                }
              })

              if (tasksResponse.ok) {
                const tasksData = await tasksResponse.json()
                tasks.push(...tasksData.tasks)
              }
            }
          }
        }
      }
    }

    return tasks
  }

  async convertToMigrationItems(tasks: ClickUpTask[]): Promise<MigrationItem[]> {
    const items: MigrationItem[] = []

    for (const task of tasks) {
      // Only convert tasks with substantial content
      if (!task.description && !task.name) continue

      const item: MigrationItem = {
        id: `clickup_${task.id}`,
        title: task.name,
        content: this.formatTaskContent(task),
        type: 'page',
        metadata: {
          originalId: task.id,
          originalUrl: `https://app.clickup.com/t/${task.id}`,
          createdAt: new Date(task.date_created),
          updatedAt: new Date(task.date_updated),
          author: task.assignees?.[0]?.username || 'Unknown',
          tags: task.tags?.map(tag => tag.name) || [],
          category: this.mapClickUpCategory(task.status?.status),
          attachments: task.attachments?.map(att => ({
            id: att.id,
            name: att.title,
            url: att.url,
            type: att.type,
            size: att.size
          })) || []
        }
      }

      items.push(item)
    }

    return items
  }

  private formatTaskContent(task: ClickUpTask): string {
    let content = `# ${task.name}\n\n`
    
    if (task.description) {
      content += `## Description\n${task.description}\n\n`
    }

    if (task.status) {
      content += `## Status\n**${task.status.status}**\n\n`
    }

    if (task.assignees?.length) {
      content += `## Assignees\n`
      task.assignees.forEach(assignee => {
        content += `- ${assignee.username} (${assignee.email})\n`
      })
      content += `\n`
    }

    if (task.tags?.length) {
      content += `## Tags\n`
      task.tags.forEach(tag => {
        content += `- ${tag.name}\n`
      })
      content += `\n`
    }

    if (task.custom_fields?.length) {
      content += `## Custom Fields\n`
      task.custom_fields.forEach(field => {
        content += `- **${field.name}**: ${field.value}\n`
      })
      content += `\n`
    }

    if (task.attachments?.length) {
      content += `## Attachments\n`
      task.attachments.forEach(attachment => {
        content += `- [${attachment.title}](${attachment.url})\n`
      })
    }

    return content
  }

  private mapClickUpCategory(status?: string): string {
    const statusMap: Record<string, string> = {
      'to do': 'general',
      'in progress': 'engineering',
      'review': 'product',
      'done': 'general',
      'closed': 'general'
    }

    return status ? statusMap[status.toLowerCase()] || 'general' : 'general'
  }
}
