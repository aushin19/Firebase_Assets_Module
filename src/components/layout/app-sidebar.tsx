"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Package, ListChecks, BarChart3, Settings, ShieldQuestion } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
} from '@/components/ui/sidebar';
import React, { useState, useEffect } from 'react';

const navItems = [
  { href: '/assets', label: 'Assets', icon: Package },
  // { href: '/dashboard', label: 'Dashboard', icon: Home },
  // { href: '/reports', label: 'Reports', icon: BarChart3 },
  // { href: '/settings', label: 'Settings', icon: Settings },
];

export default function AppSidebar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="flex h-full flex-col">
      <SidebarMenu className="p-2">
        {navItems.map((item) => {
          // Determine active state only after component has mounted on the client
          // This ensures consistency with server render, where 'mounted' would effectively be false.
          const isActive = mounted ? pathname.startsWith(item.href) : false;
          
          return (
            <SidebarMenuItem key={item.label}>
              <Link href={item.href} passHref legacyBehavior>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={item.label}
                  className="justify-start"
                >
                  <a>
                    <item.icon className="h-5 w-5" />
                    <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                  </a>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>

      {/* Example of another group if needed */}
      {/* <SidebarGroup>
        <SidebarGroupLabel>Tools</SidebarGroupLabel>
        <SidebarMenu>
           <SidebarMenuItem>
            <Link href="/security-center" passHref legacyBehavior>
              <SidebarMenuButton asChild isActive={pathname.startsWith("/security-center")} tooltip="Security Center" className="justify-start">
                <a>
                  <ShieldQuestion className="h-5 w-5" />
                  <span className="group-data-[collapsible=icon]:hidden">Security Center</span>
                </a>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup> */}
    </div>
  );
}
