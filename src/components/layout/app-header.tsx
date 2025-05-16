
"use client";

import React, { useState, useEffect } from 'react';
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { UserCircle, Settings, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { useSidebar } from '../ui/sidebar'; // To check if mobile for SidebarTrigger

export default function AppHeader() {
  const [mounted, setMounted] = useState(false);
  const { isMobile } = useSidebar(); // Get isMobile from context

  useEffect(() => {
    setMounted(true);
  }, []);

  // This function is called only when mounted is true
  const renderContent = () => (
    <>
      <div className="flex items-center gap-2">
        {/* Conditional rendering of SidebarTrigger is fine here, as mounted is true */}
        {isMobile && <SidebarTrigger className="md:hidden" />}
        <Link href="/assets" className="text-xl font-semibold text-foreground hover:text-primary transition-colors">
          AssetLens
        </Link>
      </div>
      <div className="ml-auto flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <UserCircle className="h-6 w-6" />
              <span className="sr-only">User menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );

  // This function is called when mounted is false (server render and initial client render)
  // It should be as static as possible and match server output.
  // Server doesn't know `isMobile`, so it won't render the SidebarTrigger.
  const renderPlaceholder = () => (
    <>
      <div className="flex items-center gap-2">
        {/* Removed conditional SidebarTrigger placeholder. Server wouldn't render this part. */}
        {/* The actual SidebarTrigger will appear in renderContent when mounted and isMobile is true. */}
        <Link href="/assets" className="text-xl font-semibold text-foreground hover:text-primary transition-colors">
          AssetLens
        </Link>
      </div>
      <div className="ml-auto flex items-center gap-4">
        {/* Placeholder for dropdown */}
        <Button variant="ghost" size="icon" className="rounded-full opacity-0">
          <UserCircle className="h-6 w-6" />
        </Button>
      </div>
    </>
  );


  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
      {mounted ? renderContent() : renderPlaceholder()}
    </header>
  );
}
