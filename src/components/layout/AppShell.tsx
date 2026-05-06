
"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/use-auth-context';
import { LayoutDashboard, ShoppingCart, Package, ListOrdered, LogOut, Users, BarChart3, ShieldCheck, Settings2, WifiOff, Wifi, Calendar, MapPin } from 'lucide-react';
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

  const navItems = useMemo(() => [
    { name: 'Início', href: '/', icon: LayoutDashboard, visible: isAdmin && !isSuperAdmin },
    { name: 'Controle Global', href: '/super-admin', icon: Settings2, visible: isSuperAdmin },
    { name: 'Eventos', href: '/events', icon: Calendar, visible: !isSuperAdmin },
    { name: 'Dashboards', href: '/dashboards', icon: BarChart3, visible: isAdmin && !isSuperAdmin },
    { name: 'Fazer Pedidos', href: '/pdv', icon: ShoppingCart, visible: !isSuperAdmin },
    { name: 'Produtos', href: '/products', icon: Package, visible: isAdmin && !isSuperAdmin },
    { name: 'Histórico', href: '/orders', icon: ListOrdered, visible: !isSuperAdmin },
    { name: 'Equipe', href: '/team', icon: Users, visible: isAdmin && !isSuperAdmin },
  ].filter(item => item.visible), [isAdmin, isSuperAdmin]);

  const activeIndex = useMemo(() => {
    return navItems.findIndex(item => item.href === '/' ? pathname === '/' : pathname.startsWith(item.href));
  }, [pathname, navItems]);

  if (loading && !user) return <div className="h-screen w-screen flex items-center justify-center bg-background"><OrderTicketIcon className="h-12 w-12 animate-bounce text-primary" /></div>;

  return (
    <SidebarProvider>
      <Sidebar className="border-r bg-card shadow-xl">
        <SidebarHeader className="p-6 flex flex-row items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shrink-0">
            <OrderTicketIcon className="h-7 w-7" />
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="font-black text-lg leading-none text-primary uppercase tracking-tighter truncate">
              {organizationName || 'Flow Events'}
            </span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Painel Operacional</span>
          </div>
        </SidebarHeader>
        <SidebarContent className="px-3 pt-2">
          <SidebarMenu>
            {navItems.map((item, idx) => {
              const active = idx === activeIndex;
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={active} onClick={() => pathname !== item.href && setIsNavigating(true)} className={cn("h-12 rounded-2xl transition-all duration-150 mb-1 font-black uppercase text-[10px] tracking-widest px-4", active ? "!bg-primary !text-white shadow-lg" : "text-primary/60 hover:bg-primary/5")}>
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
              <div className="px-4 py-2 mb-3 bg-muted rounded-xl text-[9px] font-black uppercase text-muted-foreground border border-primary/5">
                <span className={cn("flex items-center gap-2", (isAdmin || isSuperAdmin) ? "text-primary" : "text-secondary")}>
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {isSuperAdmin ? 'Super Admin' : (isAdmin ? 'Administrador' : 'Caixa')}
                </span>
              </div>
              <SidebarMenuButton onClick={signOut} className="h-11 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/5 font-black uppercase text-[10px]">
                <LogOut className="h-4 w-4" /> <span>Sair do Flow Events</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="bg-background relative">
        <header className="flex h-16 items-center justify-between border-b bg-card/50 backdrop-blur-sm px-4 md:px-6 no-print shadow-sm sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="text-primary hover:bg-primary/10 rounded-xl md:hidden" />
            <h1 className="text-base md:text-lg font-black text-primary uppercase tracking-tighter truncate">
              {navItems[activeIndex]?.name || 'Menu'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {!isOnline ? (
              <Badge variant="destructive" className="font-black uppercase text-[9px] tracking-widest flex items-center gap-1.5 px-3 py-1 animate-pulse border-none">
                <WifiOff className="h-3 w-3" /> Modo Offline
              </Badge>
            ) : (
              <Badge variant="outline" className="font-black uppercase text-[9px] tracking-widest flex items-center gap-1.5 px-3 py-1 border-primary/20 text-primary/40 bg-white/50">
                <Wifi className="h-3 w-3" /> Online
              </Badge>
            )}
          </div>
        </header>
        <main className={cn("flex-1 p-4 md:p-10 transition-all duration-150", isNavigating ? "opacity-50 grayscale" : "opacity-100")}>
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
