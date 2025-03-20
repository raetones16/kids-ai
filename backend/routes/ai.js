/**
 * AI Service API Routes
 * Proxies requests to OpenAI APIs securely from the backend
 */

const express = require('express');
const router = express.Router();
const OpenAI = require('openai');

// Initialize OpenAI client with server-side API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Message handling endpoint with direct chat completions
router.post('/chat', async (req, res) => {
  try {
    const { message, recentMessages = [] } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // Format messages for the chat completions API
    const formattedMessages = [];
    
    // Add system messages first
    const systemMessages = recentMessages.filter(msg => msg.role === 'system');
    formattedMessages.push(...systemMessages);
    
    // Add conversation history (user and assistant messages only)
    const conversationMessages = recentMessages.filter(msg => 
      (msg.role === 'user' || msg.role === 'assistant') && 
      msg.content && 
      msg.content.trim() && 
      !msg.content.includes('Hello! Tap the circle to start talking with me')
    ).slice(-10); // Limit to 10 most recent messages
    
    formattedMessages.push(...conversationMessages);
    
    // Add the current message if it's not already included
    const messageAlreadyIncluded = conversationMessages.some(
      msg => msg.role === 'user' && msg.content === message
    );
    
    if (!messageAlreadyIncluded) {
      formattedMessages.push({
        role: 'user',
        content: message
      });
    }
    
    console.log(`Sending ${formattedMessages.length} messages to Chat API`);
    
    // Call the OpenAI Chat Completions API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Using mini model for speed
      messages: formattedMessages,
      temperature: 0.7,
      max_tokens: 300,
    });
    
    // Extract the response
    const response = completion.choices[0].message.content;
    
    res.json({ response });
    
  } catch (error) {
    console.error('Error in chat completion:', error);
    res.status(500).json({ error: error.message || 'Failed to get AI response' });
  }
});

// Text-to-speech endpoint
router.post('/tts', async (req, res) => {
  try {
    const { text, voice = 'fable' } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required for speech synthesis' });
    }
    
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: voice,
      input: text,
      response_format: 'mp3',
    });
    
    const buffer = Buffer.from(await mp3.arrayBuffer());
    
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': buffer.length
    });
    
    res.send(buffer);
    
  } catch (error) {
    console.error('Error generating speech:', error);
    res.status(500).json({ error: error.message || 'Failed to generate speech' });
  }
});

module.exports = router;
