
"use client";

import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/use-auth-context';
import { useEffect, useState, Suspense, useMemo } from 'react';
import { collection, query, where, orderBy, getDocs, doc } from 'firebase/firestore';
import { useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { DollarSign, ShoppingBag, TrendingUp, Calendar as CalendarIcon, Loader2, User as UserIcon, Calendar, Store, Target, ArrowLeftRight } from 'lucide-react';
import { startOfDay, endOfDay, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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

  // Switch Dialog State
  const [showSwitchDialog, setShowSwitchDialog] = useState(false);
  const [pendingEventId, setPendingEventId] = useState<string | null>(null);

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
    if (!allOrders) return { totalRevenue: 0, totalProfit: 0, totalOrders: 0, bestSeller: '---', bestSellerProfit: '---', productSales: [], performanceData: [] };

    const orders = (selectedCashier && selectedCashier !== "all")
      ? allOrders.filter(o => o.userId === selectedCashier)
      : allOrders;

    let revenue = 0;
    let totalProfit = 0;
    const productCounts: Record<string, { quantity: number, revenue: number, profit: number }> = {};

    orders.forEach(order => {
      revenue += order.total;
      if (order.items) {
        order.items.forEach((item: any) => {
          if (!productCounts[item.name]) productCounts[item.name] = { quantity: 0, revenue: 0, profit: 0 };
          const profitPerUnit = item.price - (item.supplierUnitCost || 0);
          
          productCounts[item.name].quantity += (item.quantity || 0);
          productCounts[item.name].revenue += (item.price * item.quantity || 0);
          productCounts[item.name].profit += (profitPerUnit * item.quantity || 0);
          
          totalProfit += (profitPerUnit * item.quantity || 0);
        });
      }
    });

    const sortedByQuantity = Object.entries(productCounts).sort((a, b) => b[1].quantity - a[1].quantity);
    const bestSeller = sortedByQuantity[0] ? `${sortedByQuantity[0][0]} (${sortedByQuantity[0][1].quantity} un)` : '---';

    const sortedByProfit = Object.entries(productCounts).sort((a, b) => b[1].profit - a[1].profit);
    const bestSellerProfit = sortedByProfit[0] ? `${sortedByProfit[0][0]} (R$ ${sortedByProfit[0][1].profit.toFixed(2)})` : '---';
    
    const performanceData = (productsData || []).map(p => ({
      name: p.name,
      Vendido: p.soldQuantity || 0,
      Planejado: p.plannedQuantity || 0
    })).slice(0, 8);

    return {
      totalRevenue: revenue,
      totalProfit,
      totalOrders: orders.length,
      bestSeller,
      bestSellerProfit,
      productSales: sortedByQuantity.map(([name, d]) => ({ name, value: d.revenue, quantity: d.quantity, profit: d.profit })),
      performanceData
    };
  }, [allOrders, selectedCashier, productsData]);

  const handleSwitchEventRequest = (id: string) => {
    if (id === activeEventId) return;
    setPendingEventId(id);
    setShowSwitchDialog(true);
  };

  const confirmSwitchEvent = () => {
    if (pendingEventId) {
      setSelectedEventId(pendingEventId);
      router.push(`/dashboards?eventId=${pendingEventId}`);
      setShowSwitchDialog(false);
      setPendingEventId(null);
    }
  };

  if (authLoading || role === 'cashier') return null;

  return (
    <AppShell>
      <div className="flex flex-col gap-8 mb-10 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-1">
            <h2 className="text-4xl font-black text-primary uppercase tracking-tighter italic leading-none">Dashboards</h2>
            <p className="text-muted-foreground font-medium italic">Análise de lucro real e performance.</p>
          </div>
          
          <div className="w-full md:w-auto">
            <span className="text-[9px] font-black uppercase text-primary tracking-widest ml-1 mb-2 block">Evento Analisado:</span>
            <Select value={activeEventId || 'none'} onValueChange={handleSwitchEventRequest}>
              <SelectTrigger className="h-14 rounded-2xl border-2 border-primary font-bold bg-white text-primary px-6 min-w-[280px] shadow-xl uppercase text-xs">
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

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Receita Bruta" value={`R$ ${stats.totalRevenue.toFixed(2)}`} icon={<DollarSign className="h-6 w-6" />} loading={ordersLoading} />
          <StatCard title="Lucro Org." value={`R$ ${stats.totalProfit.toFixed(2)}`} icon={<TrendingUp className="h-6 w-6" />} color="text-green-600" loading={ordersLoading} />
          <StatCard title="Mais Vendido" value={stats.bestSeller} icon={<ShoppingBag className="h-6 w-6" />} loading={ordersLoading} />
          <StatCard title="Maior Lucro" value={stats.bestSellerProfit} icon={<Target className="h-6 w-6" />} loading={ordersLoading} />
        </div>

        <div className="grid gap-8 lg:grid-cols-12">
          <Card className="lg:col-span-7 shadow-2xl border-none rounded-[2.5rem] overflow-hidden bg-card">
            <CardHeader className="p-8 pb-2">
              <CardTitle className="text-[11px] font-black uppercase text-primary tracking-widest flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Performance de Vendas (Vendido vs Alvo)
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
                 <Store className="h-4 w-4" /> Lucro Líquido por Produto
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-primary/5 bg-muted/10">
                      <th className="py-6 pl-8 font-black uppercase text-[10px] tracking-widest text-muted-foreground">Produto (Qtd)</th>
                      <th className="py-6 pr-8 font-black uppercase text-[10px] tracking-widest text-muted-foreground text-right">Lucro Org.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.productSales.map((s, idx) => (
                      <tr key={idx} className="border-b border-primary/5 last:border-0 hover:bg-primary/5 transition-colors group">
                        <td className="py-6 pl-8 font-black uppercase text-xs group-hover:text-primary transition-colors">
                          {s.name}
                          <span className="ml-2 text-[9px] text-muted-foreground">({s.quantity} un)</span>
                        </td>
                        <td className="py-6 pr-8 text-right font-black text-green-600 text-base">R$ {s.profit.toFixed(2)}</td>
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

      {/* Pop-up de Confirmação de Troca de Evento */}
      <Dialog open={showSwitchDialog} onOpenChange={setShowSwitchDialog}>
        <DialogContent className="rounded-[2.5rem] border-none p-0 overflow-hidden sm:max-w-md w-[95vw] !top-[50%] !translate-y-[-50%]">
          <DialogHeader className="bg-primary p-6 text-white text-center">
            <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter">Mudar Análise?</DialogTitle>
          </DialogHeader>
          <div className="p-8 text-center space-y-6">
            <div className="bg-primary/5 p-6 rounded-2xl border-2 border-primary/10">
              <p className="text-sm font-bold text-muted-foreground leading-relaxed uppercase">
                Você quer visualizar o dashboard do evento:
              </p>
              <div className="text-xl font-black text-primary mt-2 uppercase tracking-tight">
                {events.find(e => e.id === pendingEventId)?.name}
              </div>
            </div>
          </div>
          <DialogFooter className="p-8 pt-0 grid grid-cols-2 gap-4">
            <Button variant="ghost" onClick={() => setShowSwitchDialog(false)} className="h-14 font-black uppercase text-xs rounded-xl">Cancelar</Button>
            <Button onClick={confirmSwitchEvent} className="h-14 font-black uppercase text-xs rounded-xl shadow-lg">Confirmar Troca</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

function StatCard({ title, value, icon, loading, color = "text-primary" }: { title: string, value: string, icon: React.ReactNode, loading?: boolean, color?: string }) {
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
          <div className={cn("text-2xl font-black tracking-tighter group-hover:scale-[1.05] transition-transform origin-left truncate", color)}>{value}</div>
        )}
      </CardContent>
    </Card>
  );
}
