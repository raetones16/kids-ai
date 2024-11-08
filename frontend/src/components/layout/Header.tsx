// src/components/layout/Header.tsx
import { Button } from "@/components/ui/button/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown, Plus, User } from "lucide-react"

const Header = () => {
  return (
    <header className="border-b">
      <div className="container flex h-14 max-w-screen-2xl items-center justify-between px-4">
        {/* Left side - Child Profile Switcher */}
        <div className="flex items-center gap-4">
          <div className="mr-6 flex items-center space-x-2">
            <span className="hidden font-bold sm:inline-block">
              Kids AI Platform
            </span>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                Select Child <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel>Child Profiles</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                Tommy
                <span className="ml-auto text-xs text-muted-foreground">
                  Active 2h ago
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                Sarah
                <span className="ml-auto text-xs text-muted-foreground">
                  Active 1d ago
                </span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2">
                <Plus className="h-4 w-4" /> Add Child
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Right side - Parent Account Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2">
              <User className="h-4 w-4" />
              parent@example.com
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Account Settings</DropdownMenuItem>
            <DropdownMenuItem>Notifications</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600">
              Log Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

export default Header