"use client";

import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/use-auth-context';
import { useEffect, useState } from 'react';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { DollarSign, ShoppingBag, TrendingUp, Calendar as CalendarIcon, Loader2, User as UserIcon } from 'lucide-react';
import { startOfDay, endOfDay, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useRouter } from 'next/navigation';

const COLORS = ['#f97316', '#ef4444', '#eab308', '#22c55e', '#06b6d4', '#8b5cf6'];

export default function DashboardsDetailedPage() {
  const { tenantId, user, role, tenantMembers, loading: authLoading } = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const [date, setDate] = useState<Date>(new Date());
  const [selectedCashier, setSelectedCashier] = useState<string>("all");
  const [calendarOpen, setCalendarOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && role === 'cashier') {
      router.replace('/pdv');
    }
  }, [role, authLoading, router]);

  const cashierList = Object.entries(tenantMembers || {}).map(([uid, info]: [string, any]) => ({
    id: uid,
    name: typeof info === 'object' ? info.name : `Caixa ${uid.substring(0, 4)}`,
  })).sort((a, b) => a.name.localeCompare(b.name));

  const ordersQuery = useMemoFirebase(() => {
    if (!tenantId || authLoading) return null;
    return query(
      collection(db, 'tenants', tenantId, 'orders'),
      where('createdAt', '>=', startOfDay(date)),
      where('createdAt', '<=', endOfDay(date)),
      orderBy('createdAt', 'desc')
    );
  }, [tenantId, authLoading, db, date]);

  const { data: allOrders, isLoading: ordersLoading } = useCollection(ordersQuery);

  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    bestSeller: '---',
    productSales: [] as any[],
  });

  useEffect(() => {
    if (!allOrders) return;

    const orders = (selectedCashier && selectedCashier !== "all")
      ? allOrders.filter(o => o.userId === selectedCashier)
      : allOrders;

    let revenue = 0;
    const productCounts: Record<string, { quantity: number, total: number }> = {};

    orders.forEach(order => {
      revenue += order.total;
      
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          if (!productCounts[item.name]) {
            productCounts[item.name] = { quantity: 0, total: 0 };
          }
          productCounts[item.name].quantity += (item.quantity || 0);
          productCounts[item.name].total += (item.price * item.quantity || 0);
        });
      }
    });

    const sortedProducts = Object.entries(productCounts).sort((a, b) => b[1].quantity - a[1].quantity);
    const bestSeller = sortedProducts[0]?.[0] || '---';
    
    const productChartData = Object.entries(productCounts).map(([name, data]) => ({
      name,
      value: data.total,
      quantity: data.quantity
    })).sort((a, b) => b.value - a.value);

    setStats({
      totalRevenue: revenue,
      totalOrders: orders.length,
      bestSeller,
      productSales: productChartData
    });
  }, [allOrders, selectedCashier]);

  if (authLoading || role === 'cashier') return null;

  return (
    <AppShell>
      <div className="flex flex-col gap-8 mb-10 max-w-7xl mx-auto">
        <div>
          <h2 className="text-4xl font-black text-primary uppercase tracking-tighter">Dashboards</h2>
          <p className="text-muted-foreground font-medium italic">Análise de desempenho do Flow Events.</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 bg-card p-6 rounded-[2rem] border-2 border-primary/10 shadow-xl shadow-primary/5">
          <div className="flex-1 space-y-3">
            <span className="text-[11px] font-black uppercase text-primary tracking-[0.2em] ml-1 flex items-center gap-2">
              <UserIcon className="h-4 w-4" /> FILTRO DE OPERADOR
            </span>
            <Select value={selectedCashier} onValueChange={setSelectedCashier}>
              <SelectTrigger className="h-14 rounded-2xl border-2 border-primary font-bold bg-white shadow-md hover:bg-primary/5 transition-all px-6 text-primary ring-offset-background flex items-center justify-between opacity-100 visible">
                <SelectValue placeholder="Todos os caixas" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-none shadow-2xl">
                <SelectItem value="all" className="font-bold uppercase text-xs">Todos os Caixas</SelectItem>
                {cashierList.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="font-bold uppercase text-xs">
                    {c.name} {c.id === user?.uid ? "(Você)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 space-y-3">
            <span className="text-[11px] font-black uppercase text-primary tracking-[0.2em] ml-1 flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" /> FILTRO DE DATA
            </span>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-bold h-14 rounded-2xl border-2 border-primary bg-white shadow-md hover:bg-primary/5 transition-all px-6 text-primary flex opacity-100 visible",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-3 h-5 w-5 text-primary" />
                  {date ? format(date, "PPP", { locale: ptBR }) : <span>Escolha um dia</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 border-none shadow-3xl rounded-[2.5rem] overflow-hidden popover-content" align="end">
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
                  captionLayout="dropdown"
                  startMonth={new Date(2023, 0)}
                  endMonth={new Date(new Date().getFullYear() + 2, 11)}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-10 max-w-7xl mx-auto">
        <StatCard title="Faturamento Total" value={`R$ ${stats.totalRevenue.toFixed(2)}`} icon={<DollarSign className="h-6 w-6" />} loading={ordersLoading} />
        <StatCard title="Total de Pedidos" value={stats.totalOrders.toString()} icon={<ShoppingBag className="h-6 w-6" />} loading={ordersLoading} />
        <StatCard title="Top Venda" value={stats.bestSeller} icon={<TrendingUp className="h-6 w-6" />} loading={ordersLoading} />
      </div>

      <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-12 max-w-7xl mx-auto">
        <Card className="lg:col-span-7 shadow-xl border-none rounded-[2.5rem] overflow-hidden bg-card hover:shadow-primary/10 transition-shadow">
          <CardHeader className="p-8 pb-2">
            <CardTitle className="text-[11px] font-black uppercase text-primary tracking-widest flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Distribuição de Vendas
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[400px] p-8">
            {ordersLoading ? (
              <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-primary h-12 w-12 opacity-20" /></div>
            ) : stats.productSales.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-xs font-black uppercase tracking-widest opacity-20">Sem dados para o período</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.productSales}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={130}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {stats.productSales.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="hover:opacity-80 transition-all cursor-pointer" />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '24px', border: 'none', fontSize: '12px', fontWeight: 'bold', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)' }}
                    itemStyle={{ padding: '4px 0' }}
                    formatter={(value: number, name: string, props: any) => [`R$ ${value.toFixed(2)} (${props.payload.quantity}un)`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-5 shadow-xl border-none rounded-[2.5rem] overflow-hidden bg-card hover:shadow-primary/10 transition-shadow">
          <CardHeader className="p-8 pb-2">
            <CardTitle className="text-[11px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
               <UserIcon className="h-4 w-4" /> Ranking de Produtos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-primary/5 bg-muted/10">
                    <th className="py-6 pl-8 font-black uppercase text-[10px] tracking-widest text-muted-foreground">Item</th>
                    <th className="py-6 px-4 font-black uppercase text-[10px] tracking-widest text-muted-foreground text-center">Qtd</th>
                    <th className="py-6 pr-8 font-black uppercase text-[10px] tracking-widest text-muted-foreground text-right">Faturado</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.productSales.map((p, idx) => (
                    <tr key={idx} className="border-b border-primary/5 last:border-0 hover:bg-primary/5 transition-colors group">
                      <td className="py-6 pl-8 font-black uppercase text-xs group-hover:text-primary transition-colors">{p.name}</td>
                      <td className="py-6 px-4 text-center font-bold text-muted-foreground">{p.quantity}</td>
                      <td className="py-6 pr-8 text-right font-black text-primary text-base">R$ {p.value.toFixed(2)}</td>
                    </tr>
                  ))}
                  {stats.productSales.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-24 text-center text-muted-foreground uppercase text-[10px] font-black tracking-widest opacity-20">Nenhuma venda registrada</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function StatCard({ title, value, icon, loading }: { title: string, value: string, icon: React.ReactNode, loading?: boolean }) {
  return (
    <Card className="shadow-lg border-none hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-2 transition-all duration-500 rounded-[2rem] group overflow-hidden bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-8 pb-2">
        <CardTitle className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] group-hover:text-primary transition-colors">{title}</CardTitle>
        <div className="text-primary bg-primary/10 p-4 rounded-2xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">{icon}</div>
      </CardHeader>
      <CardContent className="p-8 pt-4">
        {loading ? (
          <div className="h-10 w-32 bg-muted/50 animate-pulse rounded-xl" />
        ) : (
          <div className="text-3xl font-black text-primary tracking-tighter group-hover:scale-[1.05] transition-transform origin-left">{value}</div>
        )}
      </CardContent>
    </Card>
  );
}