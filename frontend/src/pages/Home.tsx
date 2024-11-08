// src/pages/Home.tsx
import { Button } from "@/components/ui/button"

const Home = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] p-4">
      <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl mb-8">
        Welcome to Kids AI Platform
      </h1>
      <div className="flex flex-col gap-4 w-full max-w-sm">
        <Button size="lg" className="w-full">
          Start Learning
        </Button>
        <Button size="lg" variant="outline" className="w-full">
          Parent Dashboard
        </Button>
      </div>
    </div>
  )
}

export default Home