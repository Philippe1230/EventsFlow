"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, useSidebar } from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/use-auth-context';
import { LayoutDashboard, ShoppingCart, ListOrdered, LogOut, Users, BarChart3, ShieldCheck, Settings2, WifiOff, Wifi, Calendar, PanelLeft, PanelLeftClose } from 'lucide-react';
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

interface AppShellContentProps {
  children: React.ReactNode;
  navItems: any[];
  activeIndex: number;
  pathname: string;
  isNavigating: boolean;
  setIsNavigating: React.Dispatch<React.SetStateAction<boolean>>;
  organizationName: string | null;
  isOnline: boolean;
  signOut: () => Promise<void>;
  role: string | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

function AppShellContent({
  children,
  navItems,
  activeIndex,
  pathname,
  isNavigating,
  setIsNavigating,
  organizationName,
  isOnline,
  signOut,
  role,
  isAdmin,
  isSuperAdmin
}: AppShellContentProps) {
  const { open, toggleSidebar } = useSidebar();

  return (
    <>
      <Sidebar className="border-r bg-card shadow-xl transition-all duration-300">
        <SidebarHeader className="p-5 md:p-6 pt-[calc(1.25rem+env(safe-area-inset-top))] flex flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-2xl overflow-hidden shadow-lg shrink-0 bg-transparent">
              <img src="/icon.svg" alt="Flow Events" className="h-full w-full object-cover" />
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="font-black text-base md:text-lg leading-none text-primary uppercase tracking-tighter truncate">
                {organizationName || 'Flow Events'}
              </span>
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Painel Operacional</span>
            </div>
          </div>
          {open && (
            <button
              onClick={toggleSidebar}
              className="text-primary hover:bg-primary/5 rounded-xl p-2 shrink-0 transition-all active:scale-95 flex items-center justify-center border-2 border-primary/10 hover:border-primary/20 bg-background shadow-sm hover:shadow-md"
              title="Fechar Menu"
            >
              <PanelLeftClose className="h-4 w-4 text-primary/80" />
            </button>
          )}
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
      
      <SidebarInset className="bg-background relative min-w-0 transition-all duration-300">
        <header className="flex h-[calc(4rem+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] items-center justify-between border-b bg-card/50 backdrop-blur-sm px-4 md:px-6 no-print shadow-sm sticky top-0 z-40">
          <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
            {/* Botão de Alternância Lateral Ultra-Premium */}
            <button 
              onClick={toggleSidebar}
              className="text-primary hover:bg-primary/5 rounded-xl p-2 md:p-2.5 shrink-0 transition-all active:scale-95 flex items-center justify-center border-2 border-primary/10 hover:border-primary/20 bg-background shadow-sm hover:shadow-md group relative overflow-hidden"
              title={open ? "Ocultar Menu" : "Mostrar Menu"}
            >
              {open ? (
                <PanelLeftClose className="h-4 w-4 md:h-5 md:w-5 text-primary/80 group-hover:text-primary transition-colors duration-200" />
              ) : (
                <PanelLeft className="h-4 w-4 md:h-5 md:w-5 text-primary/80 group-hover:text-primary transition-colors duration-200" />
              )}
            </button>
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
              <Badge variant="outline" className="font-black uppercase text-[8px] md:text-[9px] tracking-widest flex items-center gap-1.5 px-2 md:px-3 py-1 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 shadow-sm">
                <Wifi className="h-3 w-3 text-emerald-500 animate-pulse" /> <span className="hidden xs:inline">Online</span>
              </Badge>
            )}
          </div>
        </header>
        <main className={cn("flex-1 p-4 md:p-10 transition-all duration-300 min-w-0 relative", isNavigating && "pointer-events-none")}>
          {isNavigating && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
              <div className="flex flex-col items-center gap-6">
                <div className="relative flex items-center justify-center">
                  <div className="absolute -inset-4 rounded-3xl bg-primary/20 blur-xl animate-pulse" />
                  <img 
                    src="/icon.svg" 
                    alt="Flow Events Logo" 
                    className="h-16 w-16 animate-bounce"
                  />
                </div>
                <span className="font-black uppercase text-[10px] tracking-[0.3em] text-primary animate-pulse italic">
                  Carregando painel...
                </span>
              </div>
            </div>
          )}
          {children}
        </main>
      </SidebarInset>
    </>
  );
}

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
    <div className="h-screen w-screen flex items-center justify-center bg-background animate-in fade-in duration-300">
      <div className="flex flex-col items-center gap-6">
        <div className="relative flex items-center justify-center">
          <div className="absolute -inset-6 rounded-3xl bg-primary/20 blur-xl animate-pulse" />
          <img src="/icon.svg" alt="Flow Events Logo" className="h-20 w-20 animate-bounce" />
        </div>
        <span className="font-black uppercase text-[10px] tracking-[0.3em] text-primary/40 italic animate-pulse">Iniciando sistema...</span>
      </div>
    </div>
  );

  return (
    <SidebarProvider>
      <AppShellContent
        navItems={navItems}
        activeIndex={activeIndex}
        pathname={pathname}
        isNavigating={isNavigating}
        setIsNavigating={setIsNavigating}
        organizationName={organizationName}
        isOnline={isOnline}
        signOut={signOut}
        role={role}
        isAdmin={isAdmin}
        isSuperAdmin={isSuperAdmin}
      >
        {children}
      </AppShellContent>
    </SidebarProvider>
  );
}
