"use client";

import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/use-auth-context';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { DollarSign, ShoppingBag, TrendingUp, Clock, PlusCircle, ArrowRight } from 'lucide-react';
import { startOfDay, endOfDay } from 'date-fns';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const { tenantId, loading: authLoading } = useAuth();
  const db = useFirestore();
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    bestSeller: '---',
    hourlySales: [] as any[]
  });

  useEffect(() => {
    if (!tenantId || authLoading) return;

    async function fetchStats() {
      const today = new Date();
      try {
        const q = query(
          collection(db, 'tenants', tenantId!, 'orders'),
          where('createdAt', '>=', startOfDay(today)),
          where('createdAt', '<=', endOfDay(today)),
          orderBy('createdAt', 'desc')
        );

        const snap = await getDocs(q);
        const orders = snap.docs.map(d => d.data());
        
        let revenue = 0;
        const productCounts: Record<string, number> = {};
        const hourlyData: Record<number, number> = {};

        orders.forEach(order => {
          revenue += order.total;
          const date = order.createdAt instanceof Timestamp ? order.createdAt.toDate() : new Date(order.createdAt);
          const hour = date.getHours();
          hourlyData[hour] = (hourlyData[hour] || 0) + order.total;
          
          order.items.forEach((item: any) => {
            productCounts[item.name] = (productCounts[item.name] || 0) + item.quantity;
          });
        });

        const bestSeller = Object.entries(productCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '---';
        
        const hourlyChart = Array.from({ length: 24 }, (_, i) => ({
          hour: `${i}h`,
          value: hourlyData[i] || 0
        })).filter(d => d.value > 0);

        setStats({
          totalRevenue: revenue,
          totalOrders: orders.length,
          bestSeller,
          hourlySales: hourlyChart
        });
      } catch (e) {
        console.error("Erro ao buscar estatísticas:", e);
      }
    }

    fetchStats();
  }, [tenantId, authLoading, db]);

  return (
    <AppShell>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-black text-primary uppercase">Painel Geral</h2>
          <p className="text-muted-foreground font-medium">Resumo de vendas do Arraial de hoje.</p>
        </div>
        <Button size="lg" className="h-14 px-8 rounded-2xl font-black uppercase text-lg shadow-lg shadow-primary/20" asChild>
          <Link href="/pdv">
            <PlusCircle className="mr-2 h-6 w-6" /> Fazer Pedido
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard title="Vendas de Hoje" value={`R$ ${stats.totalRevenue.toFixed(2)}`} icon={<DollarSign className="h-4 w-4" />} trend="+12%" />
        <StatCard title="Total de Pedidos" value={stats.totalOrders.toString()} icon={<ShoppingBag className="h-4 w-4" />} />
        <StatCard title="Mais Vendido" value={stats.bestSeller} icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard title="Tempo Médio" value="2 min" icon={<Clock className="h-4 w-4" />} />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-md border-primary/5">
          <CardHeader>
            <CardTitle className="text-sm font-black uppercase text-primary">Vendas por Horário (R$)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] pr-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.hourlySales}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--primary) / 0.1)" />
                <XAxis dataKey="hour" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: 'hsl(var(--primary) / 0.05)' }}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '12px', border: '1px solid hsl(var(--primary)/0.1)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  itemStyle={{ color: 'hsl(var(--primary))', fontWeight: 'bold' }}
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <div className="flex flex-col gap-4">
          <Card className="shadow-md border-primary/5 bg-primary text-white">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase">Acesso Rápido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <QuickLink href="/products" label="Gerenciar Cardápio" />
              <QuickLink href="/orders" label="Ver todos os Pedidos" />
            </CardContent>
          </Card>
          
          <Card className="shadow-md border-primary/5">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase text-secondary">Aviso do Sistema</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl bg-secondary/10 p-4 border border-secondary/20">
                <p className="text-sm font-bold text-secondary-foreground leading-relaxed">
                  O sistema está configurado para impressão térmica de 80mm. Certifique-se de que a impressora está ligada antes de finalizar pedidos.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function StatCard({ title, value, icon, trend }: { title: string, value: string, icon: React.ReactNode, trend?: string }) {
  return (
    <Card className="shadow-sm border-primary/5 hover:border-primary/20 transition-all">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">{title}</CardTitle>
        <div className="text-primary bg-primary/10 p-2 rounded-lg">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-black text-primary">{value}</div>
        {trend && <p className="text-[10px] text-green-600 font-bold mt-1">{trend} em relação a ontem</p>}
      </CardContent>
    </Card>
  );
}

function QuickLink({ href, label }: { href: string, label: string }) {
  return (
    <Link href={href} className="flex items-center justify-between p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all group">
      <span className="font-bold text-xs uppercase">{label}</span>
      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
    </Link>
  );
}