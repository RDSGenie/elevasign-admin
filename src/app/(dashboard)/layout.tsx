"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <TooltipProvider delay={300}>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Desktop sidebar */}
        <div className="hidden border-r border-sidebar-border lg:block">
          <Sidebar />
        </div>

        {/* Mobile sidebar (Sheet) */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-64 p-0">
            <SheetTitle className="sr-only">Navigation menu</SheetTitle>
            <Sidebar />
          </SheetContent>
        </Sheet>

        {/* Main content area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header onMobileMenuToggle={() => setMobileOpen(true)} />
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
