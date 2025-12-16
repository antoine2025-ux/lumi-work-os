import OpenAI from 'openai'

export interface AIModel {
  id: string
  name: string
  description: string
  provider: string
  maxTokens: number
  costPerToken: number
}

export interface AISource {
  type: 'wiki' | 'project' | 'task' | 'org' | 'activity' | 'onboarding' | 'documentation'
  id: string
  title: string
  url?: string
  excerpt?: string
}

export interface AIResponse {
  content: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  model: string
  sources?: AISource[]
}

export interface AIProvider {
  name: string
  models: AIModel[]
  generateResponse: (prompt: string, model: string, options?: any) => Promise<AIResponse>
  generateStream?: (prompt: string, model: string, options?: any) => AsyncGenerator<string, void, unknown>
}

// OpenAI Provider
class OpenAIProvider implements AIProvider {
  name = 'OpenAI'
  private client: OpenAI

  models: AIModel[] = [
    {
      id: 'gpt-4-turbo',
      name: 'GPT-4 Turbo',
      description: 'Best for complex reasoning and analysis',
      provider: 'OpenAI',
      maxTokens: 4096,
      costPerToken: 0.00003
    },
    {
      id: 'gpt-4o-mini',
      name: 'GPT-4o Mini',
      description: 'Fast and efficient for quick tasks',
      provider: 'OpenAI',
      maxTokens: 16384,
      costPerToken: 0.00000015
    }
  ]

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      console.warn('OpenAI API key not set. AI features will be disabled.')
    }
    this.client = new OpenAI({
      apiKey: apiKey || 'dummy-key', // Allow initialization even without key
    })
  }

  async generateResponse(prompt: string, model: string, options: any = {}): Promise<AIResponse> {
    // Check if API key is available
    if (!process.env.OPENAI_API_KEY) {
      return {
        content: 'AI features are disabled. Please configure OPENAI_API_KEY environment variable.',
        tokens: 0
      }
    }
    
    try {
      // Build messages array with system prompt, conversation history, and current prompt
      const messages: Array<{ role: 'system' | 'user' | 'assistant', content: string }> = []
      
      // Add system prompt
      if (options.systemPrompt) {
        messages.push({ role: 'system', content: options.systemPrompt })
      }
      
      // Add conversation history if provided
      if (options.conversationHistory && Array.isArray(options.conversationHistory)) {
        messages.push(...options.conversationHistory.map((msg: any) => ({
          role: msg.role === 'user' ? 'user' : msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content || ''
        })))
      }
      
      // Add current user prompt
      messages.push({ role: 'user', content: prompt })
      
      const completion = await this.client.chat.completions.create({
        model: model,
        messages: messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 2000,
        top_p: options.topP || 0.9,
        frequency_penalty: options.frequencyPenalty || 0.1,
        presence_penalty: options.presencePenalty || 0.1,
      })

      const choice = completion.choices[0]
      if (!choice?.message?.content) {
        throw new Error('No response content received from OpenAI')
      }

      return {
        content: choice.message.content,
        usage: completion.usage ? {
          promptTokens: completion.usage.prompt_tokens,
          completionTokens: completion.usage.completion_tokens,
          totalTokens: completion.usage.total_tokens
        } : undefined,
        model: model
      }
    } catch (error) {
      console.error('OpenAI API error:', error)
      throw new Error(`OpenAI API error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async *generateStream(prompt: string, model: string, options: any = {}): AsyncGenerator<string, void, unknown> {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured')
    }

    try {
      const stream = await this.client.chat.completions.create({
        model: model,
        messages: [
          { role: "system", content: options.systemPrompt || "You are a helpful AI assistant." },
          ...(options.conversationHistory || []),
          { role: "user", content: prompt }
        ],
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 2000,
        stream: true,
      })

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content
        if (content) {
          yield content
        }
      }
    } catch (error) {
      console.error('OpenAI streaming error:', error)
      throw new Error(`OpenAI streaming error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

// Google Gemini Provider
class GeminiProvider implements AIProvider {
  name = 'Google'
  private apiKey: string

  models: AIModel[] = [
    {
      id: 'gemini-2.5-pro',
      name: 'Gemini 2.5 Pro',
      description: 'Advanced reasoning and multimodal capabilities',
      provider: 'Google',
      maxTokens: 8192,
      costPerToken: 0.0000125
    },
    {
      id: 'gemini-2.5-flash',
      name: 'Gemini 2.5 Flash',
      description: 'Fast and efficient for quick tasks',
      provider: 'Google',
      maxTokens: 8192,
      costPerToken: 0.00000075
    }
  ]

  constructor() {
    this.apiKey = process.env.GOOGLE_API_KEY || ''
    if (!this.apiKey) {
      console.warn('Google API key not found. Gemini models will not be available.')
    }
  }

  async generateResponse(prompt: string, model: string, options: any = {}): Promise<AIResponse> {
    if (!this.apiKey) {
      throw new Error('Google API key not configured')
    }

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${options.systemPrompt || "You are a helpful AI assistant."}\n\n${prompt}`
            }]
          }],
          generationConfig: {
            temperature: options.temperature || 0.7,
            maxOutputTokens: options.maxTokens || 2000,
            topP: options.topP || 0.9,
            topK: options.topK || 40
          }
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Google API error: ${errorData.error?.message || response.statusText}`)
      }

      const data = await response.json()
      
      if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
        throw new Error('No response content received from Gemini')
      }

      return {
        content: data.candidates[0].content.parts[0].text,
        usage: data.usageMetadata ? {
          promptTokens: data.usageMetadata.promptTokenCount || 0,
          completionTokens: data.usageMetadata.candidatesTokenCount || 0,
          totalTokens: data.usageMetadata.totalTokenCount || 0
        } : undefined,
        model: model
      }
    } catch (error) {
      console.error('Google API error:', error)
      throw new Error(`Google API error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async *generateStream(prompt: string, model: string, options: any = {}): AsyncGenerator<string, void, unknown> {
    if (!this.apiKey) {
      throw new Error('Google API key not configured')
    }

    try {
      // Build conversation history for Gemini
      const contents = []
      
      // Add conversation history if available
      if (options.conversationHistory && options.conversationHistory.length > 0) {
        for (const msg of options.conversationHistory) {
          contents.push({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
          })
        }
      }
      
      // Add current user message
      contents.push({
        role: 'user',
        parts: [{
          text: prompt
        }]
      })

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: contents,
          generationConfig: {
            temperature: options.temperature || 0.7,
            maxOutputTokens: options.maxTokens || 2000,
            topP: options.topP || 0.9,
            topK: options.topK || 40
          }
        })
      })

      if (!response.ok) {
        let errorMessage = response.statusText
        try {
          const errorData = await response.json()
          errorMessage = errorData.error?.message || errorMessage
        } catch (e) {
          // If we can't parse error, use status text
        }
        throw new Error(`Google API error: ${errorMessage}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response body reader available')
      }

      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const chunks = buffer.split('\n')
        buffer = chunks.pop() || ''

        for (const chunk of chunks) {
          if (chunk.trim() && chunk.startsWith('[')) {
            try {
              const data = JSON.parse(chunk)
              // Handle array of responses
              if (Array.isArray(data)) {
                for (const item of data) {
                  const text = item.candidates?.[0]?.content?.parts?.[0]?.text
                  if (text) {
                    yield text
                  }
                }
              } else {
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text
                if (text) {
                  yield text
                }
              }
            } catch (e) {
              // Skip invalid JSON - might be partial data
            }
          }
        }
      }
    } catch (error) {
      console.error('Google streaming error:', error)
      throw new Error(`Google streaming error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

// Anthropic Provider (Claude)
class AnthropicProvider implements AIProvider {
  name = 'Anthropic'
  private apiKey: string

  models: AIModel[] = [
    {
      id: 'claude-sonnet-4-20250514',
      name: 'Claude 3.5 Sonnet',
      description: 'Excellent for creative writing and code',
      provider: 'Anthropic',
      maxTokens: 8192,
      costPerToken: 0.000015
    }
  ]

  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY || ''
    if (!this.apiKey) {
      console.warn('Anthropic API key not found. Claude models will not be available.')
    }
  }

  async generateResponse(prompt: string, model: string, options: any = {}): Promise<AIResponse> {
    if (!this.apiKey) {
      throw new Error('Anthropic API key not configured')
    }

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: model,
          max_tokens: options.maxTokens || 2000,
          temperature: options.temperature || 0.7,
          messages: [
            {
              role: 'user',
              content: `${options.systemPrompt || "You are a helpful AI assistant."}\n\n${prompt}`
            }
          ]
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Anthropic API error: ${errorData.error?.message || response.statusText}`)
      }

      const data = await response.json()
      
      if (!data.content || !data.content[0]?.text) {
        throw new Error('No response content received from Anthropic')
      }

      return {
        content: data.content[0].text,
        usage: data.usage ? {
          promptTokens: data.usage.input_tokens,
          completionTokens: data.usage.output_tokens,
          totalTokens: data.usage.input_tokens + data.usage.output_tokens
        } : undefined,
        model: model
      }
    } catch (error) {
      console.error('Anthropic API error:', error)
      throw new Error(`Anthropic API error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async *generateStream(prompt: string, model: string, options: any = {}): AsyncGenerator<string, void, unknown> {
    if (!this.apiKey) {
      throw new Error('Anthropic API key not configured')
    }

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: model,
          max_tokens: options.maxTokens || 2000,
          temperature: options.temperature || 0.7,
          messages: [
            ...(options.conversationHistory || []),
            {
              role: 'user',
              content: prompt
            }
          ],
          stream: true
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Anthropic API error: ${errorData.error?.message || response.statusText}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response body reader available')
      }

      let buffer = ''
      let currentEvent: { type?: string; data?: any } = {}
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent.type = line.slice(7).trim()
          } else if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              currentEvent.data = data
              
              // Process the event
              if (currentEvent.type === 'content_block_delta' || 
                  (data.type === 'content_block_delta' && data.delta?.text)) {
                const text = data.delta?.text || data.text
                if (text) {
                  yield text
                }
              }
              
              currentEvent = {}
            } catch (e) {
              // Skip invalid JSON
            }
          } else if (line.trim() === '') {
            // Empty line indicates end of event, reset
            currentEvent = {}
          }
        }
      }
    } catch (error) {
      console.error('Anthropic streaming error:', error)
      throw new Error(`Anthropic streaming error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

// Provider registry
const providers: Record<string, AIProvider> = {
  openai: new OpenAIProvider(),
  anthropic: new AnthropicProvider(),
  google: new GeminiProvider()
}

export function getProvider(modelId: string): AIProvider {
  // Determine provider based on model ID
  if (modelId.startsWith('gpt-') || modelId.startsWith('gpt-4')) {
    return providers.openai
  } else if (modelId.startsWith('claude-')) {
    return providers.anthropic
  } else if (modelId.startsWith('gemini-')) {
    return providers.google
  }
  
  // Default to OpenAI
  return providers.openai
}

export function getAllModels(): AIModel[] {
  return Object.values(providers).flatMap(provider => provider.models)
}

export function getModel(modelId: string): AIModel | undefined {
  return getAllModels().find(model => model.id === modelId)
}

export async function generateAIResponse(
  prompt: string, 
  modelId: string, 
  options: any = {}
): Promise<AIResponse> {
  const provider = getProvider(modelId)
  const model = getModel(modelId)
  
  if (!model) {
    throw new Error(`Model ${modelId} not found`)
  }

  return await provider.generateResponse(prompt, modelId, options)
}

export async function* generateAIStream(
  prompt: string,
  modelId: string,
  options: any = {}
): AsyncGenerator<string, void, unknown> {
  const provider = getProvider(modelId)
  const model = getModel(modelId)
  
  if (!model) {
    throw new Error(`Model ${modelId} not found`)
  }

  if (!provider.generateStream) {
    throw new Error(`Streaming not supported for model ${modelId}`)
  }

  yield* provider.generateStream(prompt, modelId, options)
}
