import React from "react";
import { Button } from "../ui/button";
import { LogOut } from "lucide-react";

const Header = ({ childName, onLogout }) => {
  return (
    <header className="flex items-center justify-between p-4 w-full bg-[#0E1116] border-b sticky top-0 z-50">
      <h1 className="text-xl font-semibold m-0 flex items-center">
        Hi, {childName}!
      </h1>
      <Button variant="outline" size="sm" onClick={onLogout} className="gap-2">
        <LogOut className="h-4 w-4" />
        <span className="hidden sm:inline">Log Out</span>
      </Button>
    </header>
  );
};

export default Header;
