"use client";

import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/use-auth-context';
import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, ShoppingBag, TrendingUp, Calendar as CalendarIcon, Loader2, Users } from 'lucide-react';
import { startOfDay, endOfDay, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const COLORS = ['#f97316', '#ef4444', '#eab308', '#22c55e', '#06b6d4', '#8b5cf6'];

export default function DashboardPage() {
  const { tenantId, loading: authLoading, role, tenantMembers } = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const [date, setDate] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && role === 'cashier') {
      router.push('/pdv');
    }
  }, [authLoading, role, router]);

  const ordersQuery = useMemoFirebase(() => {
    if (!tenantId || authLoading || role !== 'owner') return null;
    return query(
      collection(db, 'tenants', tenantId, 'orders'),
      where('createdAt', '>=', startOfDay(date)),
      where('createdAt', '<=', endOfDay(date)),
      orderBy('createdAt', 'desc')
    );
  }, [tenantId, authLoading, db, role, date]);

  const { data: orders, isLoading: ordersLoading } = useCollection(ordersQuery);

  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    bestSeller: '---',
    cashierSales: [] as any[],
    productSales: [] as any[],
  });

  useEffect(() => {
    if (!orders) return;

    let revenue = 0;
    const productCounts: Record<string, { quantity: number, total: number }> = {};
    const cashierTotals: Record<string, number> = {};

    orders.forEach(order => {
      revenue += order.total;
      
      const uId = order.userId;
      cashierTotals[uId] = (cashierTotals[uId] || 0) + order.total;
      
      order.items.forEach((item: any) => {
        if (!productCounts[item.name]) {
          productCounts[item.name] = { quantity: 0, total: 0 };
        }
        productCounts[item.name].quantity += item.quantity;
        productCounts[item.name].total += (item.price * item.quantity);
      });
    });

    const bestSeller = Object.entries(productCounts).sort((a, b) => b[1].quantity - a[1].quantity)[0]?.[0] || '---';
    
    const cashierChartData = Object.entries(cashierTotals).map(([uid, total]) => {
      const memberInfo = tenantMembers?.[uid];
      const name = typeof memberInfo === 'object' ? memberInfo.name : `ID: ${uid.substring(0, 5)}`;
      return { name, value: total };
    }).sort((a, b) => b.value - a.value);

    const productChartData = Object.entries(productCounts).map(([name, data]) => ({
      name,
      value: data.total,
      quantity: data.quantity
    })).sort((a, b) => b.value - a.value);

    setStats({
      totalRevenue: revenue,
      totalOrders: orders.length,
      bestSeller,
      cashierSales: cashierChartData,
      productSales: productChartData
    });
  }, [orders, tenantMembers]);

  if (role === 'cashier') return null;

  return (
    <AppShell>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-black text-primary uppercase">Relatórios do Arraial</h2>
          <p className="text-muted-foreground font-medium italic">Análise detalhada de faturamento e desempenho.</p>
        </div>
        
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-[240px] justify-start text-left font-bold h-12 rounded-xl border-primary/20",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
              {date ? format(date, "PPP", { locale: ptBR }) : <span>Escolha um dia</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => {
                if (d) {
                  setDate(d);
                  setCalendarOpen(false);
                }
              }}
              initialFocus
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <StatCard title="Total no Dia" value={`R$ ${stats.totalRevenue.toFixed(2)}`} icon={<DollarSign className="h-4 w-4" />} loading={ordersLoading} />
        <StatCard title="Pedidos Realizados" value={stats.totalOrders.toString()} icon={<ShoppingBag className="h-4 w-4" />} loading={ordersLoading} />
        <StatCard title="Mais Vendido (Qtd)" value={stats.bestSeller} icon={<TrendingUp className="h-4 w-4" />} loading={ordersLoading} />
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <Card className="shadow-md border-primary/5">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-black uppercase text-primary tracking-tighter flex items-center gap-2">
              <Users className="h-4 w-4" /> Desempenho por Caixa (R$)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            {ordersLoading ? (
              <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-primary" /></div>
            ) : stats.cashierSales.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm font-bold uppercase italic">Sem vendas nesta data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.cashierSales} layout="vertical" margin={{ left: 40, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--primary) / 0.1)" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" fontSize={10} tickLine={false} axisLine={false} width={80} />
                  <Tooltip 
                    cursor={{ fill: 'hsl(var(--primary) / 0.05)' }}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '12px', border: '1px solid hsl(var(--primary)/0.1)', fontSize: '12px' }}
                    formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Total']}
                  />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={25} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-md border-primary/5">
          <CardHeader>
            <CardTitle className="text-xs font-black uppercase text-secondary tracking-tighter flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Faturamento por Produto (R$)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            {ordersLoading ? (
              <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-secondary" /></div>
            ) : stats.productSales.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm font-bold uppercase italic">Sem vendas nesta data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.productSales}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats.productSales.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '12px', border: '1px solid hsl(var(--border))', fontSize: '11px' }}
                    formatter={(value: number, name: string, props: any) => [`R$ ${value.toFixed(2)} (${props.payload.quantity}un)`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-8 shadow-md border-primary/5">
        <CardHeader>
          <CardTitle className="text-xs font-black uppercase text-muted-foreground">Listagem de Produtos Vendidos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-primary/10">
                  <th className="pb-3 font-black uppercase text-[10px]">Produto</th>
                  <th className="pb-3 font-black uppercase text-[10px] text-center">Quantidade</th>
                  <th className="pb-3 font-black uppercase text-[10px] text-right">Faturamento</th>
                </tr>
              </thead>
              <tbody>
                {stats.productSales.map((p, idx) => (
                  <tr key={idx} className="border-b border-primary/5 last:border-0 hover:bg-primary/5 transition-colors">
                    <td className="py-3 font-bold uppercase text-xs">{p.name}</td>
                    <td className="py-3 text-center font-bold text-muted-foreground">{p.quantity}</td>
                    <td className="py-3 text-right font-black text-primary">R$ {p.value.toFixed(2)}</td>
                  </tr>
                ))}
                {stats.productSales.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-muted-foreground italic">Nenhuma venda registrada para este dia.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}

function StatCard({ title, value, icon, loading }: { title: string, value: string, icon: React.ReactNode, loading?: boolean }) {
  return (
    <Card className="shadow-sm border-primary/5 hover:border-primary/20 transition-all">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">{title}</CardTitle>
        <div className="text-primary bg-primary/10 p-2 rounded-lg">{icon}</div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-8 w-24 bg-muted animate-pulse rounded" />
        ) : (
          <div className="text-2xl font-black text-primary">{value}</div>
        )}
      </CardContent>
    </Card>
  );
}
