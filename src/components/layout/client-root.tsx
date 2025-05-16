
'use client';

import React from 'react';
import { SidebarProvider, Sidebar, SidebarInset, SidebarContent, SidebarHeader as ShadSidebarHeader, SidebarFooter as ShadSidebarFooter } from '@/components/ui/sidebar';
import AppHeader from '@/components/layout/app-header';
import AppSidebar from '@/components/layout/app-sidebar';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation'; // Import usePathname

export default function ClientRoot({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname(); // Get the current pathname

  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar collapsible="icon" variant="sidebar" side="left">
        <ShadSidebarHeader />
        <SidebarContent>
          <AppSidebar />
        </SidebarContent>
        <ShadSidebarFooter />
      </Sidebar>
      <SidebarInset>
        <AppHeader />
        <AnimatePresence mode="wait">
          <motion.main
            key={pathname} // Use pathname as the key for AnimatePresence
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto"
          >
            {children}
          </motion.main>
        </AnimatePresence>
      </SidebarInset>
    </SidebarProvider>
  );
}
