# AI API Proxy

This module provides a secure proxy to OpenAI APIs, ensuring API keys are never exposed to the frontend.

## Security Benefits

- **API Key Protection**: The OpenAI API key is stored only on the server side in environment variables
- **Request Validation**: All requests are validated before being passed to OpenAI
- **Rate Limiting**: Can be implemented to prevent abuse
- **Error Handling**: Centralized error handling for OpenAI API calls

## Endpoints

### POST `/api/ai/assistant`

Creates or retrieves an assistant for a specific child profile.

**Request Body:**
```json
{
  "childId": "unique-child-id",
  "childProfile": {
    "name": "Child Name",
    "age": 8,
    "dob": "2016-05-12",
    "customInstructions": "Optional custom instructions"
  }
}
```

**Response:**
```json
{
  "assistant": {
    "id": "asst_abc123",
    "name": "Child Name's Assistant",
    "model": "gpt-4o-mini",
    "created_at": 1627984000
  }
}
```

### POST `/api/ai/thread`

Creates a new conversation thread.

**Request Body:**
```json
{}
```

**Response:**
```json
{
  "threadId": "thread_abc123"
}
```

### POST `/api/ai/chat`

Processes a chat message and returns the AI response.

**Request Body:**
```json
{
  "childId": "unique-child-id",
  "threadId": "thread_abc123",
  "message": "Hello, how are you?",
  "assistantId": "asst_abc123",
  "recentMessages": [
    {
      "role": "user",
      "content": "Previous user message"
    },
    {
      "role": "assistant",
      "content": "Previous AI response"
    }
  ]
}
```

**Response:**
```json
{
  "response": "I'm doing well, thank you! How can I help you today?",
  "threadId": "thread_abc123"
}
```

### POST `/api/ai/tts`

Converts text to speech using OpenAI's TTS API.

**Request Body:**
```json
{
  "text": "Text to be spoken",
  "voice": "fable"
}
```

**Response:**
Binary audio data (MP3 format)

## Implementation Details

- Uses OpenAI Node.js SDK for all API interactions
- Thread synchronization for maintaining conversation context
- Chunked processing for longer conversations
- Voice processing optimizations

## Environment Variables

The following environment variable is required in the backend `.env` file:

```
OPENAI_API_KEY=your_openai_api_key
```

## Deployment Notes

When deploying to platforms like Vercel, ensure the OPENAI_API_KEY environment variable is properly set in the platform's environment configuration.
