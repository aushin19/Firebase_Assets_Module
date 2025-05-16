
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { SidebarProvider, Sidebar, SidebarInset, SidebarContent, SidebarHeader as ShadSidebarHeader, SidebarFooter as ShadSidebarFooter } from '@/components/ui/sidebar';
import AppHeader from '@/components/layout/app-header';
import AppSidebar from '@/components/layout/app-sidebar';
import { motion, AnimatePresence } from 'framer-motion';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'AssetLens',
  description: 'Manage and analyze your IT assets with AI-powered insights.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}>
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
                key={children ? String(children) : 'empty'} // Unique key for AnimatePresence to detect changes
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
        <Toaster />
      </body>
    </html>
  );
}
