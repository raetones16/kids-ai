// src/components/layout/ChatLayout.tsx
import { ReactNode, useRef } from "react"
import Character, { CharacterState } from "@/components/character/Character"
import ChatInterface from "@/components/chat/ChatInterface"

const ChatLayout = () => {
  const handleStateChange = (newState: CharacterState) => {
    // We can add animation triggers or other effects here when the state changes
    console.log('Character state changed to:', newState)
  }

  return (
    <div className="container mx-auto h-[calc(100vh-3.5rem)]">
      <div className="grid h-full lg:grid-cols-[1fr_1fr] md:gap-4">
        {/* Main chat area */}
        <main className="flex flex-col border rounded-lg p-4 bg-background">
          <ChatInterface onStateChange={handleStateChange} />
        </main>

        {/* Character area - desktop */}
        <aside className="hidden lg:block border rounded-lg p-4 bg-background">
          <div className="h-full flex items-center justify-center">
            <div className="w-full h-full">
              <Character className="w-full h-full" />
            </div>
          </div>
        </aside>

        {/* Mobile character */}
        <div className="lg:hidden fixed top-2 right-2 w-12 h-12">
          <Character className="w-full h-full" />
        </div>
      </div>
    </div>
  )
}

export default ChatLayout