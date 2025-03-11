import React from 'react';
import { Button } from '../ui/button';
import { LogOut } from 'lucide-react';

const Header = ({ childName, onLogout }) => {
  return (
    <header className="flex items-center justify-between p-4 w-full bg-background border-b">
      <h1 className="text-xl font-semibold m-0 flex items-center">Hi, {childName}!</h1>
      <Button variant="ghost" size="sm" onClick={onLogout} className="flex items-center gap-2">
        <LogOut className="h-4 w-4" />
        <span className="hidden sm:inline">Sign Out</span>
      </Button>
    </header>
  );
};

export default Header;
