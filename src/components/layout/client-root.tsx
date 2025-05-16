
'use client';

import React, { useState, useEffect } from 'react';
import { SidebarProvider, Sidebar, SidebarInset, SidebarContent, SidebarHeader as ShadSidebarHeader, SidebarFooter as ShadSidebarFooter } from '@/components/ui/sidebar';
import AppHeader from '@/components/layout/app-header';
import AppSidebar from '@/components/layout/app-sidebar';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';

export default function ClientRoot({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <SidebarProvider defaultOpen={true}>
      {!mounted ? (
        <div className="flex flex-1 flex-col min-h-svh"> {/* Basic structure for the page */}
          <AppHeader /> {/* AppHeader will render its placeholder, now within SidebarProvider context */}
          <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
            {children}
          </main>
        </div>
      ) : (
        <>
          <Sidebar collapsible="icon" variant="sidebar" side="left">
            <ShadSidebarHeader />
            <SidebarContent>
              <AppSidebar />
            </SidebarContent>
            <ShadSidebarFooter />
          </Sidebar>
          <SidebarInset>
            <AppHeader /> {/* AppHeader will render its full content now */}
            <AnimatePresence mode="wait">
              <motion.main
                key={pathname}
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
        </>
      )}
    </SidebarProvider>
  );
}
