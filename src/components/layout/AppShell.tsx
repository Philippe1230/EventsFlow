
"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/use-auth-context';
import { LayoutDashboard, ShoppingCart, ListOrdered, LogOut, Users, BarChart3, ShieldCheck, Settings2, WifiOff, Wifi, Calendar } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export const OrderTicketIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M2 9V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a3 3 0 0 0 0 6v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-4a3 3 0 0 0 0-6Z" />
    <path d="M13 3v2" /><path d="M13 8v2" /><path d="M13 13v2" /><path d="M13 18v2" />
  </svg>
);

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, organizationName, signOut, role, isSuperAdmin, isOnline, selectedEventId } = useAuth();
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => { setIsNavigating(false); }, [pathname]);

  const isAdmin = role === 'owner';

  const navItems = useMemo(() => {
    const eventQuery = selectedEventId ? `?eventId=${selectedEventId}` : '';
    
    return [
      { name: 'Início', href: '/', icon: LayoutDashboard, visible: isAdmin && !isSuperAdmin },
      { name: 'Global', href: '/super-admin', icon: Settings2, visible: isSuperAdmin },
      { name: 'Eventos', href: '/events', icon: Calendar, visible: !isSuperAdmin },
      { name: 'Dashboard', href: `/dashboards${eventQuery}`, icon: BarChart3, visible: isAdmin && !isSuperAdmin && !!selectedEventId },
      { name: 'PDV', href: `/pdv${eventQuery}`, icon: ShoppingCart, visible: !isSuperAdmin && !!selectedEventId },
      { name: 'Ordens', href: `/orders${eventQuery}`, icon: ListOrdered, visible: !isSuperAdmin && !!selectedEventId },
      { name: 'Equipe', href: '/team', icon: Users, visible: isAdmin && !isSuperAdmin },
    ].filter(item => item.visible);
  }, [isAdmin, isSuperAdmin, selectedEventId]);

  const activeIndex = useMemo(() => {
    return navItems.findIndex(item => item.href.split('?')[0] === '/' ? pathname === '/' : pathname.startsWith(item.href.split('?')[0]));
  }, [pathname, navItems]);

  if (loading && !user) return (
    <div className="h-screen w-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <OrderTicketIcon className="h-10 w-10 md:h-12 md:w-12 animate-bounce text-primary" />
        <span className="font-black uppercase text-[9px] md:text-[10px] tracking-[0.3em] text-primary/40 italic">Flow Events...</span>
      </div>
    </div>
  );

  return (
    <SidebarProvider>
      <Sidebar className="border-r bg-card shadow-xl">
        <SidebarHeader className="p-5 md:p-6 flex flex-row items-center gap-3">
          <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shrink-0">
            <OrderTicketIcon className="h-6 w-6 md:h-7 md:w-7" />
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="font-black text-base md:text-lg leading-none text-primary uppercase tracking-tighter truncate">
              {organizationName || 'Flow Events'}
            </span>
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Painel Operacional</span>
          </div>
        </SidebarHeader>
        <SidebarContent className="px-3 pt-2">
          <SidebarMenu>
            {navItems.map((item, idx) => {
              const active = idx === activeIndex;
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={active} onClick={() => pathname !== item.href && setIsNavigating(true)} className={cn("h-11 md:h-12 rounded-2xl transition-all duration-150 mb-1 font-black uppercase text-[10px] tracking-widest px-4", active ? "!bg-primary !text-white shadow-lg" : "text-primary/60 hover:bg-primary/5")}>
                    <Link href={item.href} className="flex items-center gap-3 w-full">
                      <item.icon className={cn("h-5 w-5", active ? "text-white" : "text-primary")} />
                      <span className="truncate">{item.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-4">
          <SidebarMenu>
            <SidebarMenuItem>
              <div className="px-4 py-2 mb-3 bg-muted rounded-xl text-[8px] font-black uppercase text-muted-foreground border border-primary/5">
                <span className={cn("flex items-center gap-2", (isAdmin || isSuperAdmin) ? "text-primary" : "text-secondary")}>
                  <ShieldCheck className="h-3 w-3" />
                  {isSuperAdmin ? 'Super Admin' : (isAdmin ? 'Admin' : 'Caixa')}
                </span>
              </div>
              <SidebarMenuButton onClick={signOut} className="h-10 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/5 font-black uppercase text-[10px]">
                <LogOut className="h-4 w-4" /> <span>Sair</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="bg-background relative min-w-0">
        <header className="flex h-16 items-center justify-between border-b bg-card/50 backdrop-blur-sm px-4 md:px-6 no-print shadow-sm sticky top-0 z-40">
          <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
            <SidebarTrigger className="text-primary hover:bg-primary/10 rounded-xl md:hidden shrink-0" />
            <h1 className="text-sm md:text-lg font-black text-primary uppercase tracking-tighter truncate max-w-[150px] md:max-w-none">
              {navItems[activeIndex]?.name || 'Flow Events'}
            </h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!isOnline ? (
              <Badge variant="destructive" className="font-black uppercase text-[8px] md:text-[9px] tracking-widest flex items-center gap-1.5 px-2 md:px-3 py-1 animate-pulse border-none">
                <WifiOff className="h-3 w-3" /> <span className="hidden xs:inline">Offline</span>
              </Badge>
            ) : (
              <Badge variant="outline" className="font-black uppercase text-[8px] md:text-[9px] tracking-widest flex items-center gap-1.5 px-2 md:px-3 py-1 border-primary/20 text-primary/40 bg-white/50">
                <Wifi className="h-3 w-3" /> <span className="hidden xs:inline">Online</span>
              </Badge>
            )}
          </div>
        </header>
        <main className={cn("flex-1 p-4 md:p-10 transition-all duration-150 min-w-0", isNavigating ? "opacity-50 grayscale" : "opacity-100")}>
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
