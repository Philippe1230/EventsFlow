
"use client";

import React from 'react';
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/use-auth-context';
import { LayoutDashboard, ShoppingCart, Package, ListOrdered, LogOut, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

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

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, organizationName, signOut, role } = useAuth();
  const pathname = usePathname();

  if (loading) return (
    <div className="flex flex-col h-screen items-center justify-center bg-background">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4 animate-bounce">
        <JuninaFlagsIcon className="h-8 w-8 text-primary" />
      </div>
      <p className="text-lg font-bold text-primary animate-pulse">Preparando o Arraial...</p>
    </div>
  );

  const isAdmin = role === 'owner';

  const navItems = [
    { name: 'Início', href: '/', icon: LayoutDashboard, visible: isAdmin },
    { name: 'Fazer Pedidos', href: '/pdv', icon: ShoppingCart, visible: true },
    { name: 'Produtos', href: '/products', icon: Package, visible: isAdmin },
    { name: 'Histórico', href: '/orders', icon: ListOrdered, visible: isAdmin },
    { name: 'Equipe', href: '/team', icon: Users, visible: isAdmin },
  ].filter(item => item.visible);

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-r border-primary/10">
        <SidebarHeader className="p-4 flex flex-row items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-white shadow-lg shadow-primary/20">
            <JuninaFlagsIcon className="h-5 w-5" />
          </div>
          <span className="font-bold text-lg truncate text-primary">{organizationName || 'Arraial PDV'}</span>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu className="px-2">
            {navItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.name} className="hover:bg-primary/5 data-[active=true]:bg-primary data-[active=true]:text-white">
                  <Link href={item.href}>
                    <item.icon className={pathname === item.href ? "text-white" : "text-primary"} />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu className="px-2">
            <SidebarMenuItem>
              <div className="px-3 py-2 text-[10px] font-black uppercase text-muted-foreground opacity-50">
                Sessão: {role === 'owner' ? 'Administrador' : 'Caixa'}
              </div>
              <SidebarMenuButton onClick={signOut} className="text-muted-foreground hover:text-destructive hover:bg-destructive/5">
                <LogOut />
                <span>Sair</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="bg-background/50">
        <header className="flex h-16 items-center gap-4 border-b bg-card px-4 no-print shadow-sm">
          <SidebarTrigger />
          <div className="flex-1">
            <h1 className="text-xl font-black text-primary uppercase tracking-tight">
              {navItems.find(i => i.href === pathname)?.name || 'Arraial'}
            </h1>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            {role === 'owner' ? 'GESTOR' : 'CAIXA'} ATIVO
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
