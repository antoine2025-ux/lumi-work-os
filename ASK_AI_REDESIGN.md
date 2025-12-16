# Ask AI Redesign - ChatGPT-like Interface with Multi-LLM Support

## Overview

The Ask AI interface has been completely redesigned to provide a minimalistic, ChatGPT-like experience with support for multiple AI language models. Users can now choose between different AI providers and models based on their specific needs.

## Key Features

### 1. Minimalistic UI Design
- **ChatGPT-like Interface**: Clean, modern design similar to ChatGPT
- **Sidebar Chat History**: Persistent chat history with easy navigation
- **Responsive Layout**: Works seamlessly on desktop and mobile devices
- **Real-time Messaging**: Smooth conversation flow with typing indicators

### 2. Multi-LLM Support
- **GPT-4 Turbo**: Best for complex reasoning and analysis
- **Claude 3.5 Sonnet**: Excellent for creative writing and code
- **GPT-4o Mini**: Fast and efficient for quick tasks

### 3. Enhanced UX Flow
- **Model Selection**: Users choose their preferred AI model before starting
- **Session Management**: Each chat session is tied to a specific model
- **Model Switching**: Easy switching between models for different tasks
- **Usage Tracking**: Token usage and cost tracking per model

## Technical Implementation

### New Components
- **Ask AI Page**: Complete redesign with minimalistic interface
- **AI Providers**: Modular system supporting multiple LLM providers
- **Chat Sessions API**: RESTful API for session management
- **Model Selection**: Interactive model picker with descriptions

### Database Changes
- Added `model` field to `ChatSession` table
- Migration: `20251019121807_add_model_to_chat_session`

### API Endpoints
- `GET /api/ai/chat-sessions` - List chat sessions
- `POST /api/ai/chat-sessions` - Create new session
- `GET /api/ai/chat-sessions/[id]` - Get specific session
- `DELETE /api/ai/chat-sessions/[id]` - Delete session
- `GET /api/ai/chat-sessions/[id]/messages` - Get session messages
- `POST /api/ai/chat` - Send message to AI

### Environment Variables
```env
# AI Providers
OPENAI_API_KEY="your-openai-api-key"
ANTHROPIC_API_KEY="your-anthropic-api-key"
```

## Usage Guide

### For Users

1. **Starting a New Chat**
   - Click "New Chat" button
   - Select your preferred AI model
   - Start typing your message

2. **Model Selection**
   - GPT-4 Turbo: Use for complex analysis, research, and detailed responses
   - Claude 3.5 Sonnet: Use for creative writing, code generation, and nuanced tasks
   - GPT-4o Mini: Use for quick questions and simple tasks

3. **Chat History**
   - View all previous conversations in the sidebar
   - Click on any session to resume the conversation
   - Delete sessions you no longer need

### For Developers

1. **Adding New Models**
   - Add model definition to `src/lib/ai/providers.ts`
   - Implement provider class if needed
   - Update model list in the UI

2. **Customizing Responses**
   - Modify system prompts in the chat API
   - Adjust temperature and other parameters per model
   - Add custom metadata to responses

## Benefits

### For Users
- **Choice**: Select the best AI model for each task
- **Consistency**: Each conversation maintains the same model
- **Performance**: Optimized responses based on model strengths
- **Cost Efficiency**: Use cheaper models for simple tasks

### For Developers
- **Modularity**: Easy to add new AI providers
- **Scalability**: Support for multiple concurrent sessions
- **Monitoring**: Built-in usage tracking and analytics
- **Flexibility**: Customizable per-model behavior

## Future Enhancements

1. **More AI Providers**: Add support for Google Gemini, Cohere, etc.
2. **Model Comparison**: Side-by-side comparison of different models
3. **Custom Models**: Support for fine-tuned models
4. **Usage Analytics**: Detailed usage statistics and cost tracking
5. **Model Recommendations**: AI-powered suggestions for best model per task

## Migration Notes

- Existing chat sessions will default to GPT-4 Turbo
- No data loss during migration
- All previous functionality remains intact
- New features are additive and backward compatible
