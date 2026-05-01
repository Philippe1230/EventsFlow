
"use client";

import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/use-auth-context';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { DollarSign, ShoppingBag, TrendingUp, Clock } from 'lucide-react';
import { startOfDay, endOfDay, format } from 'date-fns';

export default function DashboardPage() {
  const { tenantId } = useAuth();
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    bestSeller: '---',
    hourlySales: [] as any[]
  });

  useEffect(() => {
    if (!tenantId) return;

    async function fetchStats() {
      const today = new Date();
      const q = query(
        collection(db, 'orders'),
        where('tenantId', '==', tenantId),
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
        const hour = (order.createdAt as Timestamp).toDate().getHours();
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
    }

    fetchStats();
  }, [tenantId]);

  return (
    <AppShell>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard title="Faturamento do Dia" value={`R$ ${stats.totalRevenue.toFixed(2)}`} icon={<DollarSign className="h-4 w-4" />} />
        <StatCard title="Total de Pedidos" value={stats.totalOrders.toString()} icon={<ShoppingBag className="h-4 w-4" />} />
        <StatCard title="Mais Vendido" value={stats.bestSeller} icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard title="Atendimento" value="Ativo" icon={<Clock className="h-4 w-4" />} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Vendas por Horário</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.hourlySales}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px' }}
                  itemStyle={{ color: 'hsl(var(--primary))' }}
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Dicas do Arraial</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-accent p-4 border border-secondary/20">
              <h4 className="font-bold text-secondary mb-1">Mantenha o ritmo!</h4>
              <p className="text-sm">O PDV está otimizado para fichas térmicas. Garanta que a impressora esteja conectada.</p>
            </div>
            <div className="rounded-lg bg-primary/10 p-4 border border-primary/20">
              <h4 className="font-bold text-primary mb-1">Exportação rápida</h4>
              <p className="text-sm">Ao final da festa, você pode exportar todos os dados para CSV na aba Pedidos.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function StatCard({ title, value, icon }: { title: string, value: string, icon: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
