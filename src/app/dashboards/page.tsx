
"use client";

import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/use-auth-context';
import { useEffect, useState, Suspense, useMemo } from 'react';
import { collection, query, where, orderBy, getDocs, doc } from 'firebase/firestore';
import { useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { DollarSign, ShoppingBag, TrendingUp, Calendar as CalendarIcon, Loader2, User as UserIcon, Calendar, Store, Target } from 'lucide-react';
import { startOfDay, endOfDay, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useRouter, useSearchParams } from 'next/navigation';

const COLORS = ['#f97316', '#ef4444', '#eab308', '#22c55e', '#06b6d4', '#8b5cf6'];

function DashboardsContent() {
  const { tenantId, user, role, tenantMembers, loading: authLoading, selectedEventId, setSelectedEventId } = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const urlEventId = searchParams.get('eventId');
  const activeEventId = urlEventId || selectedEventId;

  const [date, setDate] = useState<Date>(new Date());
  const [selectedCashier, setSelectedCashier] = useState<string>("all");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    if (!authLoading && role === 'cashier') {
      router.replace('/pdv');
    }
  }, [role, authLoading, router]);

  useEffect(() => {
    if (urlEventId && urlEventId !== selectedEventId) {
      setSelectedEventId(urlEventId);
    }
  }, [urlEventId, selectedEventId, setSelectedEventId]);

  useEffect(() => {
    async function loadEvents() {
      if (!tenantId) return;
      const snap = await getDocs(collection(db, 'tenants', tenantId, 'events'));
      setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }
    loadEvents();
  }, [tenantId, db]);

  const activeEvent = useMemo(() => events.find(e => e.id === activeEventId), [events, activeEventId]);

  const cashierList = Object.entries(tenantMembers || {}).map(([uid, info]: [string, any]) => ({
    id: uid,
    name: typeof info === 'object' ? info.name : `Caixa ${uid.substring(0, 4)}`,
  })).sort((a, b) => a.name.localeCompare(b.name));

  const ordersQuery = useMemoFirebase(() => {
    if (!tenantId || !activeEventId || authLoading) return null;
    return query(
      collection(db, 'tenants', tenantId, 'events', activeEventId, 'orders'),
      where('createdAt', '>=', startOfDay(date)),
      where('createdAt', '<=', endOfDay(date)),
      orderBy('createdAt', 'desc')
    );
  }, [tenantId, activeEventId, authLoading, db, date]);

  const { data: allOrders, isLoading: ordersLoading } = useCollection(ordersQuery);

  const productsQuery = useMemoFirebase(() => {
    if (!tenantId || !activeEventId) return null;
    return collection(db, 'tenants', tenantId, 'events', activeEventId, 'products');
  }, [tenantId, activeEventId, db]);

  const { data: productsData } = useCollection(productsQuery);

  const stats = useMemo(() => {
    if (!allOrders) return { totalRevenue: 0, totalOrders: 0, bestSeller: '---', productSales: [], performanceData: [] };

    const orders = (selectedCashier && selectedCashier !== "all")
      ? allOrders.filter(o => o.userId === selectedCashier)
      : allOrders;

    let revenue = 0;
    const productCounts: Record<string, { quantity: number, total: number }> = {};

    orders.forEach(order => {
      revenue += order.total;
      if (order.items) {
        order.items.forEach((item: any) => {
          if (!productCounts[item.name]) productCounts[item.name] = { quantity: 0, total: 0 };
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

    // Dados de performance (Alvo vs Real)
    const performanceData = (productsData || []).map(p => ({
      name: p.name,
      Vendido: p.soldQuantity || 0,
      Planejado: p.plannedQuantity || 0
    })).slice(0, 8);

    return {
      totalRevenue: revenue,
      totalOrders: orders.length,
      bestSeller,
      productSales: productChartData,
      performanceData
    };
  }, [allOrders, selectedCashier, productsData]);

  if (authLoading || role === 'cashier') return null;

  return (
    <AppShell>
      <div className="flex flex-col gap-8 mb-10 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h2 className="text-4xl font-black text-primary uppercase tracking-tighter italic leading-none">Dashboards</h2>
            <p className="text-muted-foreground font-medium italic">Monitoramento e análise do evento.</p>
          </div>
          
          <div className="w-full md:w-auto">
            <span className="text-[9px] font-black uppercase text-primary tracking-widest ml-1 mb-2 block">Evento em Foco:</span>
            <Select value={activeEventId || 'none'} onValueChange={setSelectedEventId}>
              <SelectTrigger className="h-14 rounded-2xl border-2 border-primary font-bold bg-white text-primary px-6 min-w-[250px] shadow-xl">
                <SelectValue placeholder="Selecione o Evento" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-none shadow-2xl">
                {events.map(e => (
                  <SelectItem key={e.id} value={e.id} className="font-bold uppercase text-xs">{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 bg-card p-6 rounded-[2rem] border-2 border-primary/10 shadow-2xl">
          <div className="flex-1 space-y-3">
            <span className="text-[11px] font-black uppercase text-primary tracking-[0.2em] ml-1 flex items-center gap-2">
              <UserIcon className="h-4 w-4" /> Operador
            </span>
            <Select value={selectedCashier} onValueChange={setSelectedCashier}>
              <SelectTrigger className="h-14 rounded-2xl border-2 border-primary font-bold bg-white px-6 text-primary">
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
              <CalendarIcon className="h-4 w-4" /> Data da Análise
            </span>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-bold h-14 rounded-2xl border-2 border-primary bg-white px-6 text-primary flex",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-3 h-5 w-5 text-primary" />
                  {date ? format(date, "PPP", { locale: ptBR }) : <span>Escolha um dia</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 border-none shadow-3xl rounded-[2.5rem] overflow-hidden" align="end">
                <CalendarComponent
                  mode="single"
                  selected={date}
                  onSelect={(d) => { if (d) { setDate(d); setCalendarOpen(false); } }}
                  initialFocus
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <StatCard title="Receita Bruta" value={`R$ ${stats.totalRevenue.toFixed(2)}`} icon={<DollarSign className="h-6 w-6" />} loading={ordersLoading} />
          <StatCard title="Meta de Vendas" value={`${(productsData || []).reduce((acc, p) => acc + (p.plannedQuantity || 0), 0)} un`} icon={<Target className="h-6 w-6" />} />
          <StatCard title="Produto Estrela" value={stats.bestSeller} icon={<TrendingUp className="h-6 w-6" />} loading={ordersLoading} />
        </div>

        <div className="grid gap-8 lg:grid-cols-12">
          <Card className="lg:col-span-7 shadow-2xl border-none rounded-[2.5rem] overflow-hidden bg-card">
            <CardHeader className="p-8 pb-2">
              <CardTitle className="text-[11px] font-black uppercase text-primary tracking-widest flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Performance por Produto (Vendido vs Alvo)
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[400px] p-8">
              {ordersLoading ? (
                <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-primary h-12 w-12 opacity-20" /></div>
              ) : stats.performanceData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-xs font-black uppercase tracking-widest opacity-20">Sem dados de cardápio planejado</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.performanceData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                    <Tooltip 
                      cursor={{ fill: 'hsl(var(--primary)/0.05)' }}
                      contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend iconType="circle" />
                    <Bar dataKey="Vendido" fill="#f97316" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Planejado" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-5 shadow-2xl border-none rounded-[2.5rem] overflow-hidden bg-card">
            <CardHeader className="p-8 pb-2">
              <CardTitle className="text-[11px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                 <Store className="h-4 w-4" /> Lucro por Barraca (Se houver)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-primary/5 bg-muted/10">
                      <th className="py-6 pl-8 font-black uppercase text-[10px] tracking-widest text-muted-foreground">Barraca</th>
                      <th className="py-6 pr-8 font-black uppercase text-[10px] tracking-widest text-muted-foreground text-right">Lucro Org.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(productsData || []).filter(p => p.type === 'supplier').reduce((acc: any[], p) => {
                      const existing = acc.find(a => a.id === p.supplierId);
                      const profit = ((p.soldQuantity || 0) * p.price) - ((p.soldQuantity || 0) * (p.supplierUnitCost || 0));
                      if (existing) existing.value += profit;
                      else acc.push({ name: p.supplierId, value: profit });
                      return acc;
                    }, []).map((s, idx) => (
                      <tr key={idx} className="border-b border-primary/5 last:border-0 hover:bg-primary/5 transition-colors group">
                        <td className="py-6 pl-8 font-black uppercase text-xs group-hover:text-primary transition-colors truncate max-w-[150px]">Fornecedor {idx + 1}</td>
                        <td className="py-6 pr-8 text-right font-black text-green-600 text-base">R$ {s.value.toFixed(2)}</td>
                      </tr>
                    ))}
                    {stats.productSales.length === 0 && (
                       <tr><td colSpan={2} className="py-20 text-center opacity-20 font-black uppercase text-[10px]">Sem vendas hoje</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

export default function DashboardsPage() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary opacity-20" /></div>}>
      <DashboardsContent />
    </Suspense>
  );
}

function StatCard({ title, value, icon, loading }: { title: string, value: string, icon: React.ReactNode, loading?: boolean }) {
  return (
    <Card className="shadow-xl border-none hover:-translate-y-2 transition-all duration-500 rounded-[2rem] group overflow-hidden bg-card">
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
