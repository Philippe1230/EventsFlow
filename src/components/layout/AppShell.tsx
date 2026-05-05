
"use client";

import React, { useMemo } from 'react';
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/use-auth-context';
import { LayoutDashboard, ShoppingCart, Package, ListOrdered, LogOut, Users, BarChart3, ShieldCheck, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export const OrderTicketIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M2 9V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a3 3 0 0 0 0 6v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-4a3 3 0 0 0 0-6Z" />
    <path d="M13 3v2" />
    <path d="M13 8v2" />
    <path d="M13 13v2" />
    <path d="M13 18v2" />
  </svg>
);

const LoadingJunina = () => (
  <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background">
    <div className="flex gap-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div 
          key={i} 
          className="w-12 h-16 rounded-b-3xl animate-bounce shadow-xl" 
          style={{ 
            backgroundColor: ['#f97316', '#ef4444', '#eab308', '#22c55e', '#06b6d4', '#ec4899'][i-1],
            animationDelay: `${i * 0.1}s`,
            animationDuration: '0.8s'
          }} 
        />
      ))}
    </div>
    <p className="mt-8 font-black uppercase tracking-[0.3em] text-primary animate-pulse text-xs">Preparando Fichas...</p>
  </div>
);

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, organizationName, signOut, role } = useAuth();
  const pathname = usePathname();

  const isInitialLoading = loading && !user;
  const isAdmin = role === 'owner';

  const navItems = useMemo(() => [
    { name: 'Início', href: '/', icon: LayoutDashboard, visible: isAdmin },
    { name: 'Dashboards', href: '/dashboards', icon: BarChart3, visible: isAdmin },
    { name: 'Fazer Pedidos', href: '/pdv', icon: ShoppingCart, visible: true },
    { name: 'Produtos', href: '/products', icon: Package, visible: isAdmin },
    { name: 'Histórico', href: '/orders', icon: ListOrdered, visible: isAdmin },
    { name: 'Equipe', href: '/team', icon: Users, visible: isAdmin },
  ].filter(item => item.visible), [isAdmin]);

  const activeIndex = useMemo(() => {
    const idx = navItems.findIndex(item => {
      if (item.href === '/') return pathname === '/';
      return pathname.startsWith(item.href);
    });
    return idx;
  }, [pathname, navItems]);

  if (isInitialLoading) return <LoadingJunina />;

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-r border-primary/10 shadow-xl bg-card">
        <SidebarHeader className="p-6 flex flex-row items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shrink-0">
            <OrderTicketIcon className="h-7 w-7" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden overflow-hidden">
            <span className="font-black text-lg leading-none text-primary uppercase tracking-tighter truncate">
              {organizationName || 'Flow Events'}
            </span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Fichas & Vendas</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu className="px-3 pt-2 relative">
            <div 
              className="absolute left-3 right-3 h-12 bg-primary rounded-2xl transition-all duration-300 shadow-md shadow-primary/20 z-0 group-data-[collapsible=icon]:hidden"
              style={{ 
                top: '8px',
                transform: `translateY(${activeIndex * 52}px)`,
                opacity: activeIndex === -1 ? 0 : 1,
                pointerEvents: 'none'
              }}
            />

            {navItems.map((item, idx) => {
              const active = idx === activeIndex;
              return (
                <SidebarMenuItem key={item.href} className="relative z-10">
                  <SidebarMenuButton 
                    asChild 
                    isActive={active} 
                    tooltip={item.name} 
                    className={cn(
                      "h-12 rounded-2xl transition-colors duration-200",
                      active 
                        ? "text-white bg-transparent" 
                        : "text-primary/70 hover:bg-primary/5 hover:text-primary"
                    )}
                  >
                    <Link href={item.href} className="flex items-center gap-3">
                      <item.icon className={cn(
                        "h-5 w-5 shrink-0",
                        active ? "text-white" : "text-primary"
                      )} />
                      <span className={cn(
                        "font-black uppercase text-[10px] tracking-widest truncate",
                        active ? "text-white" : "text-primary/80"
                      )}>{item.name}</span>
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
              <div className="px-4 py-2 mb-3 bg-muted/40 rounded-xl text-[9px] font-black uppercase text-muted-foreground border border-primary/5 group-data-[collapsible=icon]:hidden">
                <span className={cn(
                  "flex items-center gap-2",
                  isAdmin ? "text-primary" : "text-secondary"
                )}>
                  {isAdmin ? <ShieldCheck className="h-3 w-3" /> : <User className="h-3 w-3" />}
                  {isAdmin ? 'Administrador' : 'Caixa'}
                </span>
              </div>
              <SidebarMenuButton 
                onClick={signOut} 
                className="h-11 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/5 font-black uppercase text-[10px]"
              >
                <LogOut className="h-4 w-4" />
                <span className="group-data-[collapsible=icon]:hidden">Sair do Flow Events</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="bg-background">
        <header className="flex h-16 items-center gap-4 border-b bg-card/50 backdrop-blur-sm px-6 no-print shadow-sm sticky top-0 z-40">
          <SidebarTrigger className="text-primary" />
          <h1 className="text-lg font-black text-primary uppercase tracking-tighter">
            {navItems[activeIndex]?.name || 'Menu'}
          </h1>
        </header>
        <main className="flex-1 p-6 md:p-10">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
