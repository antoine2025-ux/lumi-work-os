import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'

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

export interface AIGenerateOptions {
  systemPrompt?: string
  conversationHistory?: Array<{ role: string; content: string }>
  temperature?: number
  maxTokens?: number
  topP?: number
  topK?: number
  frequencyPenalty?: number
  presencePenalty?: number
}

export interface ToolDefinition {
  name: string
  description: string
  parameters: Record<string, unknown>
}

export type ToolCallChatMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string | null; toolCalls?: Array<{ id: string; name: string; arguments: string }> }
  | { role: 'tool'; content: string; toolCallId: string }

export interface ToolCallResponse {
  content: string
  toolCalls?: Array<{ id: string; name: string; arguments: Record<string, unknown> }>
}

export interface GenerateWithToolsParams {
  model: string
  systemPrompt: string
  messages: ToolCallChatMessage[]
  tools: ToolDefinition[]
  temperature?: number
  maxTokens?: number
}

export interface AIProvider {
  name: string
  models: AIModel[]
  generateResponse: (prompt: string, model: string, options?: AIGenerateOptions) => Promise<AIResponse>
  generateStream?: (prompt: string, model: string, options?: AIGenerateOptions) => AsyncGenerator<string, void, unknown>
  generateWithTools?: (params: GenerateWithToolsParams) => Promise<ToolCallResponse>
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

  async generateResponse(prompt: string, model: string, options: AIGenerateOptions = {}): Promise<AIResponse> {
    // Check if API key is available
    if (!process.env.OPENAI_API_KEY) {
      return {
        content: 'AI features are disabled. Please configure OPENAI_API_KEY environment variable.',
        model: 'none'
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
        messages.push(...options.conversationHistory.map((msg) => ({
          role: (msg.role === 'user' ? 'user' : msg.role === 'assistant' ? 'assistant' : 'user') as 'system' | 'user' | 'assistant',
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
    } catch (error: unknown) {
      console.error('OpenAI API error:', error)
      throw new Error(`OpenAI API error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async *generateStream(prompt: string, model: string, options: AIGenerateOptions = {}): AsyncGenerator<string, void, unknown> {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured')
    }

    try {
      const stream = await this.client.chat.completions.create({
        model: model,
        messages: [
          { role: "system", content: options.systemPrompt || "You are a helpful AI assistant." },
          ...(options.conversationHistory || []).map(msg => ({ role: msg.role as 'user' | 'assistant' | 'system', content: msg.content })),
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
    } catch (error: unknown) {
      console.error('OpenAI streaming error:', error)
      throw new Error(`OpenAI streaming error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async generateWithTools(params: GenerateWithToolsParams): Promise<ToolCallResponse> {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured')
    }

    const openaiTools: OpenAI.ChatCompletionTool[] = params.tools.map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters as Record<string, unknown>,
      },
    }))

    const openaiMessages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: params.systemPrompt },
    ]
    for (const msg of params.messages) {
      switch (msg.role) {
        case 'system':
          openaiMessages.push({ role: 'system', content: msg.content })
          break
        case 'user':
          openaiMessages.push({ role: 'user', content: msg.content })
          break
        case 'assistant':
          openaiMessages.push({
            role: 'assistant',
            content: msg.content,
            ...(msg.toolCalls?.length ? {
              tool_calls: msg.toolCalls.map((tc) => ({
                id: tc.id,
                type: 'function' as const,
                function: { name: tc.name, arguments: tc.arguments },
              })),
            } : {}),
          })
          break
        case 'tool':
          openaiMessages.push({
            role: 'tool',
            content: msg.content,
            tool_call_id: msg.toolCallId,
          })
          break
      }
    }

    const response = await this.client.chat.completions.create({
      model: params.model,
      messages: openaiMessages,
      tools: openaiTools.length > 0 ? openaiTools : undefined,
      temperature: params.temperature ?? 0.7,
      max_tokens: params.maxTokens ?? 4096,
    })

    const choice = response.choices[0]
    const message = choice.message

    const toolCalls = message.tool_calls
      ?.filter((tc): tc is OpenAI.ChatCompletionMessageToolCall & { type: 'function' } =>
        tc.type === 'function'
      )
      .map((tc) => ({
        id: tc.id,
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments) as Record<string, unknown>,
      }))

    return {
      content: message.content || '',
      toolCalls: toolCalls?.length ? toolCalls : undefined,
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

  async generateResponse(prompt: string, model: string, options: AIGenerateOptions = {}): Promise<AIResponse> {
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
    } catch (error: unknown) {
      console.error('Google API error:', error)
      throw new Error(`Google API error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async *generateStream(prompt: string, model: string, options: AIGenerateOptions = {}): AsyncGenerator<string, void, unknown> {
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
        } catch (_e) {
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
            } catch (_e) {
              // Skip invalid JSON - might be partial data
            }
          }
        }
      }
    } catch (error: unknown) {
      console.error('Google streaming error:', error)
      throw new Error(`Google streaming error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

// Anthropic Provider (Claude)
class AnthropicProvider implements AIProvider {
  name = 'Anthropic'
  private client: Anthropic

  models: AIModel[] = [
    {
      id: 'claude-sonnet-4-6',
      name: 'Claude Sonnet 4.6',
      description: 'Excellent for creative writing and code',
      provider: 'Anthropic',
      maxTokens: 8192,
      costPerToken: 0.000015
    }
  ]

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      console.warn('Anthropic API key not found. Claude models will not be available.')
    }
    this.client = new Anthropic({
      apiKey: apiKey || 'dummy-key', // Allow initialization even without key
    })
  }

  async generateResponse(prompt: string, model: string, options: AIGenerateOptions = {}): Promise<AIResponse> {
    // Check if API key is available
    if (!process.env.ANTHROPIC_API_KEY) {
      return {
        content: 'AI features are disabled. Please configure ANTHROPIC_API_KEY environment variable.',
        model: 'none'
      }
    }

    try {
      // Build messages array with conversation history and current prompt
      const messages: Array<{ role: 'user' | 'assistant', content: string }> = []
      
      // Add conversation history if provided
      if (options.conversationHistory && Array.isArray(options.conversationHistory)) {
        messages.push(...options.conversationHistory.map((msg) => ({
          role: (msg.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
          content: msg.content || ''
        })))
      }
      
      // Add current user prompt
      messages.push({ role: 'user', content: prompt })

      const response = await this.client.messages.create({
        model: model,
        max_tokens: options.maxTokens || 2000,
        temperature: options.temperature || 0.7,
        system: options.systemPrompt || "You are a helpful AI assistant.",
        messages: messages
      })

      if (!response.content || !response.content[0] || response.content[0].type !== 'text') {
        throw new Error('No response content received from Anthropic')
      }

      return {
        content: response.content[0].text,
        usage: response.usage ? {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens
        } : undefined,
        model: model
      }
    } catch (error: unknown) {
      console.error('Anthropic API error:', error)
      throw new Error(`Anthropic API error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async *generateStream(prompt: string, model: string, options: AIGenerateOptions = {}): AsyncGenerator<string, void, unknown> {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('Anthropic API key not configured')
    }

    try {
      // Build messages array with conversation history and current prompt
      const messages: Array<{ role: 'user' | 'assistant', content: string }> = []
      
      // Add conversation history if provided
      if (options.conversationHistory && Array.isArray(options.conversationHistory)) {
        messages.push(...options.conversationHistory.map((msg) => ({
          role: (msg.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
          content: msg.content || ''
        })))
      }
      
      // Add current user prompt
      messages.push({ role: 'user', content: prompt })

      const stream = await this.client.messages.create({
        model: model,
        max_tokens: options.maxTokens || 2000,
        temperature: options.temperature || 0.7,
        system: options.systemPrompt || "You are a helpful AI assistant.",
        messages: messages,
        stream: true
      })

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          yield chunk.delta.text
        }
      }
    } catch (error: unknown) {
      console.error('Anthropic streaming error:', error)
      throw new Error(`Anthropic streaming error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async generateWithTools(params: GenerateWithToolsParams): Promise<ToolCallResponse> {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('Anthropic API key not configured')
    }

    const anthropicTools: Anthropic.Tool[] = params.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters as Anthropic.Tool.InputSchema,
    }))

    type AnthropicContent = Anthropic.TextBlockParam | Anthropic.ToolUseBlockParam | Anthropic.ToolResultBlockParam
    type AnthropicMessage = { role: 'user' | 'assistant'; content: string | AnthropicContent[] }
    const anthropicMessages: AnthropicMessage[] = []

    for (const msg of params.messages) {
      switch (msg.role) {
        case 'system':
          break
        case 'user':
          anthropicMessages.push({ role: 'user', content: msg.content })
          break
        case 'assistant': {
          const blocks: AnthropicContent[] = []
          if (msg.content) {
            blocks.push({ type: 'text', text: msg.content })
          }
          if (msg.toolCalls?.length) {
            for (const tc of msg.toolCalls) {
              blocks.push({
                type: 'tool_use',
                id: tc.id,
                name: tc.name,
                input: JSON.parse(tc.arguments) as Record<string, unknown>,
              })
            }
          }
          anthropicMessages.push({
            role: 'assistant',
            content: blocks.length > 0 ? blocks : (msg.content ?? ''),
          })
          break
        }
        case 'tool':
          anthropicMessages.push({
            role: 'user',
            content: [{
              type: 'tool_result',
              tool_use_id: msg.toolCallId,
              content: msg.content,
            }],
          })
          break
      }
    }

    const merged = mergeConsecutiveMessages(anthropicMessages)

    const response = await this.client.messages.create({
      model: params.model,
      system: params.systemPrompt,
      messages: merged as Anthropic.MessageParam[],
      tools: anthropicTools.length > 0 ? anthropicTools : undefined,
      max_tokens: params.maxTokens ?? 4096,
      temperature: params.temperature ?? 0.7,
    })

    let content = ''
    const toolCalls: Array<{ id: string; name: string; arguments: Record<string, unknown> }> = []

    for (const block of response.content) {
      if (block.type === 'text') {
        content += block.text
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id,
          name: block.name,
          arguments: block.input as Record<string, unknown>,
        })
      }
    }

    return {
      content,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    }
  }
}

/**
 * Merge consecutive same-role messages for Anthropic API compatibility.
 * Anthropic requires strictly alternating user/assistant roles. Tool results
 * (sent as user-role) may produce consecutive user messages that must be
 * combined into a single message with merged content arrays.
 */
function mergeConsecutiveMessages(
  messages: Array<{ role: 'user' | 'assistant'; content: string | unknown[] }>
): Array<{ role: 'user' | 'assistant'; content: string | unknown[] }> {
  const merged: Array<{ role: 'user' | 'assistant'; content: string | unknown[] }> = []

  for (const msg of messages) {
    const prev = merged[merged.length - 1]
    if (prev && prev.role === msg.role) {
      const prevBlocks = Array.isArray(prev.content)
        ? prev.content
        : [{ type: 'text' as const, text: prev.content }]
      const curBlocks = Array.isArray(msg.content)
        ? msg.content
        : [{ type: 'text' as const, text: msg.content }]
      prev.content = [...prevBlocks, ...curBlocks]
    } else {
      merged.push({ ...msg })
    }
  }

  return merged
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
  options: AIGenerateOptions = {}
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
  options: AIGenerateOptions = {}
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

export async function generateAIWithTools(
  params: GenerateWithToolsParams
): Promise<ToolCallResponse> {
  const provider = getProvider(params.model)

  if (!provider.generateWithTools) {
    throw new Error(
      `Provider ${provider.name} does not support tool calling. ` +
      `Model "${params.model}" cannot be used with generateWithTools.`
    )
  }

  return provider.generateWithTools(params)
}
