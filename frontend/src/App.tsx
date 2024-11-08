// src/App.tsx
import { Button } from "./components/ui/button/button"

function App() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Kids AI Platform</h1>
      <div className="space-x-4">
        <Button>Default Button</Button>
        <Button variant="destructive">Destructive Button</Button>
        <Button variant="outline">Outline Button</Button>
        <Button variant="secondary">Secondary Button</Button>
        <Button variant="ghost">Ghost Button</Button>
        <Button variant="link">Link Button</Button>
      </div>
    </div>
  )
}

export default App