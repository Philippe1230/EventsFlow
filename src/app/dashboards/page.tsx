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

const COLORS = ['#f97316', '#ef4444', '#eab308', '#22c55e', '#06b6d4', '#8b5cf6'];

export default function DashboardsDetailedPage() {
  const { tenantId, user, role, tenantMembers, loading: authLoading } = useAuth();
  const db = useFirestore();
  const [date, setDate] = useState<Date>(new Date());
  const [selectedCashier, setSelectedCashier] = useState<string>("all");
  const [calendarOpen, setCalendarOpen] = useState(false);

  useEffect(() => {
    if (user?.uid && selectedCashier === "all") {
      setSelectedCashier(user.uid);
    }
  }, [user, selectedCashier]);

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

  if (role === 'cashier') return null;

  return (
    <AppShell>
      <div className="flex flex-col gap-6 mb-8">
        <div>
          <h2 className="text-3xl font-black text-primary uppercase">Dashboard de Caixa</h2>
          <p className="text-muted-foreground font-medium italic">Análise de desempenho individual por operador.</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 space-y-2">
            <span className="text-[10px] font-black uppercase text-muted-foreground ml-1">Selecione o Operador</span>
            <Select value={selectedCashier} onValueChange={setSelectedCashier}>
              <SelectTrigger className="h-12 rounded-xl border-primary/20 font-bold bg-card shadow-sm">
                <SelectValue placeholder="Escolha um caixa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="font-bold uppercase text-xs">Todos os Caixas</SelectItem>
                {cashierList.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="font-bold uppercase text-xs">
                    {c.name} {c.id === user?.uid ? "(Você)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 space-y-2">
            <span className="text-[10px] font-black uppercase text-muted-foreground ml-1">Escolha a Data</span>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-bold h-12 rounded-xl border-primary/20 bg-card shadow-sm",
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
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <StatCard title="Total do Caixa" value={`R$ ${stats.totalRevenue.toFixed(2)}`} icon={<DollarSign className="h-4 w-4" />} loading={ordersLoading} />
        <StatCard title="Pedidos Realizados" value={stats.totalOrders.toString()} icon={<ShoppingBag className="h-4 w-4" />} loading={ordersLoading} />
        <StatCard title="Produto mais vendido" value={stats.bestSeller} icon={<TrendingUp className="h-4 w-4" />} loading={ordersLoading} />
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <Card className="shadow-md border-primary/5">
          <CardHeader>
            <CardTitle className="text-xs font-black uppercase text-primary tracking-tighter flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Distribuição de Lucro
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            {ordersLoading ? (
              <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-primary" /></div>
            ) : stats.productSales.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm font-bold uppercase italic">Sem vendas para este caixa</div>
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

        <Card className="shadow-md border-primary/5">
          <CardHeader>
            <CardTitle className="text-xs font-black uppercase text-muted-foreground flex items-center gap-2">
               <UserIcon className="h-4 w-4" /> Detalhamento por Item
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-primary/10">
                    <th className="pb-3 font-black uppercase text-[10px]">Produto</th>
                    <th className="pb-3 font-black uppercase text-[10px] text-center">Qtd</th>
                    <th className="pb-3 font-black uppercase text-[10px] text-right">Valor</th>
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
                      <td colSpan={3} className="py-8 text-center text-muted-foreground italic">Nenhuma venda registrada.</td>
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
