
'use client';

import React from 'react';
import { SidebarProvider, Sidebar, SidebarInset, SidebarContent, SidebarHeader as ShadSidebarHeader, SidebarFooter as ShadSidebarFooter } from '@/components/ui/sidebar';
import AppHeader from '@/components/layout/app-header';
import AppSidebar from '@/components/layout/app-sidebar';
import { motion, AnimatePresence } from 'framer-motion';

export default function ClientRoot({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Attempt to get a unique key for AnimatePresence.
  // This is a simplified approach. For more complex scenarios,
  // you might need to use usePathname() or a similar router-based key.
  const key = typeof children === 'string' ? children : (children as React.ReactElement)?.key?.toString() || 'content';


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
            key={key} // Use the derived key
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
