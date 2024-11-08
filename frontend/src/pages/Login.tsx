// src/pages/Login.tsx
import { Button } from "@/components/ui/button"

const Login = () => {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)] p-4">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter your credentials to access your account
          </p>
        </div>
        <Button>Login Coming Soon</Button>
      </div>
    </div>
  )
}

export default Login