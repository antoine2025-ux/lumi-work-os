export interface EmbedProvider {
  id: string
  name: string
  icon: string
  description: string
  supportsUrl: boolean
  supportsId: boolean
  urlPattern?: RegExp
  apiEndpoint?: string
}

export interface EmbedData {
  id: string
  provider: string
  url?: string
  resourceId?: string
  title?: string
  description?: string
  thumbnail?: string
  metadata?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export interface EmbedComponentProps {
  embed: EmbedData
  isEditable?: boolean
  onUpdate?: (embed: EmbedData) => void
  onDelete?: (embedId: string) => void
}

export const EMBED_PROVIDERS: EmbedProvider[] = [
  {
    id: 'figma',
    name: 'Figma',
    icon: '🎨',
    description: 'Embed Figma designs and prototypes',
    supportsUrl: true,
    supportsId: true,
    urlPattern: /^https:\/\/(www\.)?figma\.com\/(file|proto)\/([a-zA-Z0-9]+)/,
    apiEndpoint: '/api/embeds/figma'
  },
  {
    id: 'github',
    name: 'GitHub',
    icon: '🐙',
    description: 'Embed GitHub repositories, issues, and pull requests',
    supportsUrl: true,
    supportsId: true,
    urlPattern: /^https:\/\/(www\.)?github\.com\/([^\/]+)\/([^\/]+)/,
    apiEndpoint: '/api/embeds/github'
  },
  {
    id: 'airtable',
    name: 'Airtable',
    icon: '📊',
    description: 'Embed Airtable bases and views',
    supportsUrl: true,
    supportsId: true,
    urlPattern: /^https:\/\/(www\.)?airtable\.com\/([^\/]+)\/([^\/]+)/,
    apiEndpoint: '/api/embeds/airtable'
  },
  {
    id: 'asana',
    name: 'Asana',
    icon: '✅',
    description: 'Embed Asana projects and tasks',
    supportsUrl: true,
    supportsId: true,
    urlPattern: /^https:\/\/(www\.)?app\.asana\.com\/([^\/]+)/,
    apiEndpoint: '/api/embeds/asana'
  },
  {
    id: 'miro',
    name: 'Miro',
    icon: '🎯',
    description: 'Embed Miro boards and whiteboards',
    supportsUrl: true,
    supportsId: true,
    urlPattern: /^https:\/\/(www\.)?miro\.com\/([^\/]+)/,
    apiEndpoint: '/api/embeds/miro'
  },
  {
    id: 'drawio',
    name: 'Draw.io',
    icon: '📐',
    description: 'Embed Draw.io diagrams and flowcharts',
    supportsUrl: true,
    supportsId: true,
    urlPattern: /^https:\/\/(www\.)?(app\.)?diagrams\.net\/([^\/]+)/,
    apiEndpoint: '/api/embeds/drawio'
  },
  {
    id: 'generic',
    name: 'Embed',
    icon: '🔗',
    description: 'Embed any URL as a link card',
    supportsUrl: true,
    supportsId: false,
    urlPattern: /^https?:\/\/.+/,
    apiEndpoint: '/api/embeds/generic'
  },
  {
    id: 'link-card',
    name: 'Link Card',
    icon: '📎',
    description: 'Create a rich link preview card',
    supportsUrl: true,
    supportsId: false,
    urlPattern: /^https?:\/\/.+/,
    apiEndpoint: '/api/embeds/link-card'
  }
]
