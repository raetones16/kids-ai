# Kids AI

A minimalist, Braun-inspired AI chat interface designed for children that balances simplicity with sophistication.

## Project Overview

This application provides a child-friendly interface for interacting with an AI assistant. The interface features:

- A central animated circle with visual state feedback (listening, thinking, speaking)
- Voice interaction capabilities
- Simple subtitle display for conversations
- Child profile management

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

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file with your OpenAI API key:
   ```
   REACT_APP_OPENAI_API_KEY=your_api_key_here
   ```
4. Start the development server:
   ```
   npm start
   ```

## Project Structure

- `/public` - Static files
- `/src` - Source code
  - `/components` - React components
  - `/services` - Service classes for API integration and utilities
  - `/context` - React context providers

## Technologies Used

- React
- Three.js for animations
- OpenAI Assistants API
- Web Speech API for speech recognition
- Browser speech synthesis for text-to-speech

## Development Phases

### Phase 1: Core Child Interface MVP (Current)
- Central chat circle interface with state animations
- Voice input/output integration
- Simple authentication for child users
- OpenAI Assistants API integration

### Future Phases
- Phase 2: Parent Dashboard
- Phase 3: Enhanced Features

## License

This project is private and proprietary.
