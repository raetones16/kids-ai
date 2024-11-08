// src/components/chat/ChatInterface.tsx
import { useState, useRef } from 'react'
import { Button } from "@/components/ui/button/button"
import { CharacterState } from '@/components/character/Character'
import { Send } from 'lucide-react'
import { chatApi } from '@/lib/api'

interface ChatMessage {
  content: string
  isUser: boolean
}

interface ChatInterfaceProps {
  onStateChange: (state: CharacterState) => void
}

const ChatInterface = ({ onStateChange }: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleSend = async () => {
    if (!inputValue.trim() || isProcessing) return

    // Add user message
    const userMessage: ChatMessage = { content: inputValue, isUser: true }
    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    
    // Update character state to thinking
    onStateChange('thinking')
    setIsProcessing(true)

    try {
      // Send message to backend
      const response = await chatApi.sendMessage(inputValue)
      
      // Add AI response
      const aiMessage: ChatMessage = { 
        content: response.message, 
        isUser: false 
      }
      setMessages(prev => [...prev, aiMessage])
      onStateChange('listening')
    } catch (error) {
      console.error('Failed to send message:', error)
      // Add error message
      const errorMessage: ChatMessage = { 
        content: "Sorry, I couldn't process your message. Please try again.", 
        isUser: false 
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsProcessing(false)
      scrollToBottom()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.isUser
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type your message..."
            className="flex-1 rounded-md border bg-transparent px-3 py-2 text-sm"
            disabled={isProcessing}
          />
          <Button 
            onClick={handleSend} 
            disabled={isProcessing || !inputValue.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ChatInterface