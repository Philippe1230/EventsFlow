
"use client";

import React from 'react';
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/use-auth-context';
import { LayoutDashboard, ShoppingCart, Package, ListOrdered, LogOut, Users, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const JuninaFlagsIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M2 4c5 0 5 4 10 4s5-4 10-4" />
    <path d="M4 4v7l3-2 3 2V4" />
    <path d="M14 4v7l3-2 3 2V4" />
  </svg>
);

const LoadingJunina = () => (
  <div className="flex flex-col h-screen items-center justify-center bg-[#fff9f5]">
    <div className="flex gap-2 mb-8">
      {[1, 2, 3, 4, 5].map((i) => (
        <div 
          key={i} 
          className="w-10 h-14 rounded-b-2xl animate-bounce shadow-lg" 
          style={{ 
            backgroundColor: ['#f97316', '#ef4444', '#eab308', '#22c55e', '#06b6d4'][i-1],
            animationDelay: `${i * 0.1}s`
          }} 
        />
      ))}
    </div>
    <div className="relative">
      <div className="h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 flex animate-pulse border-2 border-primary/20">
        <JuninaFlagsIcon className="h-12 w-12 text-primary" />
      </div>
    </div>
    <p className="mt-8 text-2xl font-black text-primary uppercase tracking-[0.2em] animate-pulse italic">
      Sincronizando Arraial...
    </p>
    <p className="mt-2 text-[10px] font-black uppercase text-muted-foreground/50 tracking-widest">Aguarde um tiquinho, sô!</p>
  </div>
);

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, organizationName, signOut, role } = useAuth();
  const pathname = usePathname();

  if (loading) return <LoadingJunina />;

  const isAdmin = role === 'owner';

  const navItems = [
    { name: 'Início', href: '/', icon: LayoutDashboard, visible: isAdmin },
    { name: 'Dashboards', href: '/dashboards', icon: BarChart3, visible: isAdmin },
    { name: 'Fazer Pedidos', href: '/pdv', icon: ShoppingCart, visible: true },
    { name: 'Produtos', href: '/products', icon: Package, visible: isAdmin },
    { name: 'Histórico', href: '/orders', icon: ListOrdered, visible: isAdmin },
    { name: 'Equipe', href: '/team', icon: Users, visible: isAdmin },
  ].filter(item => item.visible);

  // Função robusta para verificar se o caminho está ativo e evitar problemas com barras no final
  const isPathActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  };

  const activeIndex = navItems.findIndex(item => isPathActive(item.href));

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-r border-primary/10 shadow-2xl">
        <SidebarHeader className="p-6 flex flex-row items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-xl shadow-primary/30 transform hover:rotate-6 transition-transform">
            <JuninaFlagsIcon className="h-6 w-6" />
          </div>
          <span className="font-black text-xl truncate text-primary uppercase tracking-tighter">{organizationName || 'Arraial PDV'}</span>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu className="px-3 pt-4 relative">
            {/* Marcador deslizante animado - h-12 (48px) + gap-1 (4px) = 52px de passo exato */}
            {activeIndex !== -1 && (
              <div 
                className="absolute left-2 right-2 h-12 bg-primary rounded-2xl transition-all duration-500 shadow-lg shadow-primary/30 z-0"
                style={{ 
                  top: '16px', // Alinhado com o pt-4 do container
                  transform: `translateY(${activeIndex * 52}px)`, 
                  transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
                }}
              />
            )}

            {navItems.map((item) => {
              const active = isPathActive(item.href);
              return (
                <SidebarMenuItem key={item.href} className="relative z-10">
                  <SidebarMenuButton 
                    asChild 
                    isActive={active} 
                    tooltip={item.name} 
                    className={cn(
                      "h-12 rounded-2xl transition-all duration-300 border-2 border-transparent",
                      active 
                        ? "text-white bg-transparent border-white/10" 
                        : "text-primary/70 hover:bg-primary/5 hover:text-primary"
                    )}
                  >
                    <Link href={item.href} className="flex items-center gap-3">
                      <item.icon className={cn(
                        "transition-transform duration-300",
                        active ? "text-white scale-110" : "text-primary"
                      )} />
                      <span className={cn(
                        "font-black uppercase text-[10px] tracking-widest",
                        active ? "text-white" : "text-primary/80"
                      )}>{item.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-6">
          <SidebarMenu>
            <SidebarMenuItem>
              <div className="px-4 py-3 mb-4 bg-muted/50 rounded-2xl text-[9px] font-black uppercase text-muted-foreground border border-primary/5 shadow-inner">
                <span className="block opacity-40 mb-1">Acesso Liberado</span>
                <span className={cn(
                  "flex items-center gap-1.5",
                  isAdmin ? "text-primary" : "text-secondary"
                )}>
                  {isAdmin ? '🛡️ Admin do Arraial' : '🛒 Caixa do Arraial'}
                </span>
              </div>
              <SidebarMenuButton 
                onClick={signOut} 
                className="h-12 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/5 font-black uppercase text-[10px] border border-transparent hover:border-destructive/10"
              >
                <LogOut className="h-4 w-4" />
                <span>Fechar Porteira</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="bg-background/40">
        <header className="flex h-16 items-center gap-4 border-b bg-card/80 backdrop-blur-md px-6 no-print shadow-sm sticky top-0 z-40">
          <SidebarTrigger className="hover:bg-primary/5 text-primary" />
          <div className="flex-1">
            <h1 className="text-xl font-black text-primary uppercase tracking-tighter truncate">
              {navItems.find(i => isPathActive(i.href))?.name || 'Arraial'}
            </h1>
          </div>
          <div className="hidden sm:flex items-center gap-3 text-[9px] font-black text-muted-foreground bg-white/80 border border-primary/10 px-5 py-2.5 rounded-full shadow-sm">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
            SISTEMA ATIVO
          </div>
        </header>
        <main className="flex-1 p-4 md:p-10 overflow-auto pb-24 md:pb-10">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
