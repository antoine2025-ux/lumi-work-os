import { MigrationItem, SliteDocument } from '../types'

export class SliteAdapter {
  private apiKey: string
  private baseUrl = 'https://api.slite.com/v1'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async fetchAllDocuments(): Promise<SliteDocument[]> {
    const documents: SliteDocument[] = []
    let cursor: string | null = null

    do {
      // Try different query approaches - the one without query parameter works best
      const url = cursor 
        ? `${this.baseUrl}/search-notes?cursor=${cursor}`
        : `${this.baseUrl}/search-notes`
        
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Slite API error:', response.status, response.statusText, errorText)
        throw new Error(`Slite API error: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const data = await response.json()
      console.log('=== SLITE API RESPONSE DEBUG ===')
      console.log('Full response data:', JSON.stringify(data, null, 2))
      console.log('Response keys:', Object.keys(data))
      console.log('Data type:', typeof data)
      console.log('Is array:', Array.isArray(data))
      console.log('=== END SLITE API RESPONSE DEBUG ===')
      
      // Handle different response formats - Slite API returns 'hits' array
      if (data.hits && Array.isArray(data.hits)) {
        console.log('Found hits array with', data.hits.length, 'items')
        documents.push(...data.hits)
        cursor = data.next_cursor
      } else if (data.notes) {
        console.log('Found notes array with', data.notes.length, 'items')
        documents.push(...data.notes)
        cursor = data.next_cursor
      } else if (data.documents) {
        console.log('Found documents array with', data.documents.length, 'items')
        documents.push(...data.documents)
        cursor = data.next_cursor
      } else if (Array.isArray(data)) {
        console.log('Response is direct array with', data.length, 'items')
        documents.push(...data)
        cursor = null // No pagination for array response
      } else {
        console.warn('Unexpected Slite API response format:', data)
        console.log('Available keys in response:', Object.keys(data))
        break
      }
    } while (cursor)

    return documents
  }

  async fetchDocumentContent(documentId: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/notes/${documentId}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch document content: ${response.status}`)
    }

    const data = await response.json()
    return data.content || data.body || ''
  }

  async fetchAttachments(documentId: string): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/notes/${documentId}/attachments`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      return [] // Attachments are optional
    }

    const data = await response.json()
    return data.attachments || []
  }

  async convertToMigrationItems(documents: SliteDocument[]): Promise<MigrationItem[]> {
    const items: MigrationItem[] = []

    for (const doc of documents) {
      try {
        // Fetch full content
        const content = await this.fetchDocumentContent(doc.id)
        
        // Fetch attachments
        const attachments = await this.fetchAttachments(doc.id)

        const item: MigrationItem = {
          id: `slite_${doc.id}`,
          title: doc.title,
          content: this.convertSliteContent(content),
          type: 'page',
          metadata: {
            originalId: doc.id,
            originalUrl: `https://slite.com/workspace/document/${doc.id}`,
            createdAt: new Date(doc.created_at || doc.updatedAt),
            updatedAt: new Date(doc.updatedAt),
            author: doc.author?.name || 'Unknown',
            tags: doc.tags || [],
            category: this.mapSliteCategory(doc.folder_id),
            parentId: doc.parentNotes?.[0]?.id ? `slite_folder_${doc.parentNotes[0].id}` : undefined,
            attachments: attachments.map(att => ({
              id: att.id,
              name: att.name,
              url: att.url,
              type: att.type,
              size: att.size
            }))
          }
        }

        items.push(item)
      } catch (error) {
        console.error(`Error converting Slite document ${doc.id}:`, error)
      }
    }

    return items
  }

  private convertSliteContent(content: string): string {
    // Convert Slite's markdown to our format
    // This would include handling Slite-specific syntax
    return content
      .replace(/\[\[([^\]]+)\]\]/g, '[$1]($1)') // Convert Slite links
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '![$1]($2)') // Handle images
      .replace(/```(\w+)?\n([\s\S]*?)```/g, '```$1\n$2\n```') // Fix code blocks
  }

  private mapSliteCategory(folderId?: string): string {
    // Map Slite folders to Lumi categories
    const folderMap: Record<string, string> = {
      'engineering': 'engineering',
      'product': 'product',
      'marketing': 'marketing',
      'sales': 'sales',
      'hr': 'hr',
      'general': 'general'
    }

    return folderId ? folderMap[folderId] || 'general' : 'general'
  }
}
