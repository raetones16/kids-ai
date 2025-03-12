# Kids AI

A minimalist, Braun-inspired AI chat interface designed for children that balances simplicity with sophistication.

## Project Overview

This application provides a child-friendly interface for interacting with an AI assistant. The interface features:

- A central animated circle with visual state feedback (listening, thinking, speaking)
- Voice interaction capabilities
- Simple subtitle display for conversations
- Child profile management
- Backend storage for conversations and profiles
- Web search integration

## Core Features

- **Visual State Feedback**: 
  - Blue for listening
  - Amber for thinking
  - Red/orange for speaking
- **Voice Interaction**: Speak to the AI and hear responses
- **Child Profiles**: Different profiles for different children
- **British English**: All interactions in British English

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- NPM (v6 or higher)
- OpenAI API key
- Brave Search API key (for search functionality)
- Turso account (optional, for database storage)

### Installation

1. Clone the repository
2. Install frontend dependencies:
   ```
   npm install
   ```
3. Install backend dependencies:
   ```
   cd backend
   npm install
   ```
4. Create a `.env` file in the root directory with your API keys:
   ```
   REACT_APP_OPENAI_API_KEY=your_api_key_here
   REACT_APP_BRAVE_SEARCH_API_KEY=your_brave_api_key_here
   REACT_APP_API_URL=http://localhost:3001/api
   REACT_APP_ENABLE_SEARCH=true
   ```
5. Create a `.env` file in the backend directory with your database credentials:
   ```
   PORT=3001
   NODE_ENV=development
   FRONTEND_URL=http://localhost:3000
   BRAVE_SEARCH_API_KEY=your_brave_search_api_key
   TURSO_DB_URL=your_turso_db_url
   TURSO_DB_AUTH_TOKEN=your_turso_db_auth_token
   ```
6. Start the backend server:
   ```
   cd backend
   npm run dev
   ```
7. In a separate terminal, start the frontend development server:
   ```
   npm start
   ```

## Project Structure

- `/public` - Static files
- `/src` - Frontend source code
  - `/components` - React components
  - `/services` - Service classes for API integration and utilities
  - `/hooks` - React hooks
  - `/utils` - Utility functions
- `/backend` - Backend server
  - `/routes` - API route handlers
  - `/db` - Database connection and schema
  - `/utils` - Backend utilities

## Technologies Used

### Frontend
- React
- Three.js for animations
- OpenAI GPT-4 API
- Web Speech API for speech recognition
- OpenAI TTS API for text-to-speech

### Backend
- Node.js with Express
- Turso (SQLite-based distributed database)
- Brave Search API

## Development Phases

### Phase 1: Core Child Interface MVP (Complete)
- Central chat circle interface with state animations
- Voice input/output integration
- Simple authentication for child users
- OpenAI API integration

### Phase 2: Backend Integration (Current)
- Backend server with Express
- Database integration with Turso
- Web search integration with Brave Search API
- Migration from localStorage to database storage

### Phase 3: Parent Dashboard
- Conversation logs viewer
- Child profile management interface
- Usage statistics

### Phase 4: Enhanced Features
- Improved personalization
- Extended parent controls
- Voice customization

## License

This project is private and proprietary.
