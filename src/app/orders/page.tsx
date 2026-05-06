
"use client";

import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/use-auth-context';
import { useState, useMemo, useEffect } from 'react';
import { collection, query, orderBy, Timestamp, limit, where, getDocs } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Download, Loader2, Printer, Filter, User as UserIcon, Users, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { PrintTickets } from '@/components/pdv/PrintTickets';
import { cn } from '@/lib/utils';

interface Order {
  id: string;
  orderNumber: number;
  total: number;
  paymentMethod: string;
  createdAt: Timestamp | Date;
  items: any[];
  userId: string;
  eventId?: string;
}

export default function OrdersPage() {
  const { tenantId, user, role, tenantMembers, isSuperAdmin, loading: authLoading, selectedEventId } = useAuth();
  const db = useFirestore();
  const [printableTickets, setPrintableTickets] = useState<any[]>([]);
  const [ordersLimit, setOrdersLimit] = useState<string>("20");
  const [selectedCashier, setSelectedCashier] = useState<string>("all");
  const [activeEventFilter, setActiveEventFilter] = useState<string>(selectedEventId || "all");
  const [events, setEvents] = useState<any[]>([]);

  const isAdminView = role === 'owner' || isSuperAdmin;

  useEffect(() => {
    if (role === 'cashier' && user?.uid) {
      setSelectedCashier(user.uid);
    }
  }, [role, user]);

  useEffect(() => {
    if (selectedEventId) setActiveEventFilter(selectedEventId);
  }, [selectedEventId]);

  useEffect(() => {
    async function loadEvents() {
      if (!tenantId) return;
      const snap = await getDocs(collection(db, 'tenants', tenantId, 'events'));
      setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }
    loadEvents();
  }, [tenantId, db]);

  const ordersQuery = useMemoFirebase(() => {
    if (!tenantId || !user) return null;
    
    // Se o filtro de evento estiver em "all", teríamos que usar uma query collectionGroup
    // mas por simplicidade e performance (visto que as vendas são agora POR evento),
    // vamos focar no evento selecionado ou no primeiro ativo.
    
    const eventToQuery = activeEventFilter === "all" ? selectedEventId : activeEventFilter;
    
    if (!eventToQuery) return null;

    const ordersCol = collection(db, 'tenants', tenantId, 'events', eventToQuery, 'orders');
    const effectiveCashier = role === 'cashier' ? user.uid : selectedCashier;

    if (effectiveCashier === "all") {
      return query(
        ordersCol, 
        orderBy('createdAt', 'desc'),
        limit(parseInt(ordersLimit))
      );
    } else {
      return query(
        ordersCol, 
        where('userId', '==', effectiveCashier),
        orderBy('createdAt', 'desc'),
        limit(parseInt(ordersLimit))
      );
    }
  }, [db, tenantId, user, role, ordersLimit, selectedCashier, activeEventFilter, selectedEventId]);

  const { data: orders = [], isLoading: loading } = useCollection<Order>(ordersQuery);

  const cashierList = useMemo(() => {
    if (!tenantMembers) return [];
    return Object.entries(tenantMembers).map(([uid, info]: [string, any]) => ({
      id: uid,
      name: typeof info === 'object' ? (info.name || info.displayName || 'Operador') : `Operador ${uid.substring(0, 4)}`,
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [tenantMembers]);

  const exportCSV = () => {
    if (!orders || orders.length === 0) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Data,Pedido #,Produto,Quantidade,Valor,Pagamento,Operador,Evento\n";

    orders.forEach(order => {
      const date = order.createdAt instanceof Timestamp ? order.createdAt.toDate() : new Date(order.createdAt || new Date());
      const dateStr = format(date, 'dd/MM/yyyy HH:mm');
      const cashierName = tenantMembers?.[order.userId]?.name || order.userId;
      const eventName = events.find(e => e.id === (activeEventFilter === "all" ? selectedEventId : activeEventFilter))?.name || 'Evento';
      
      order.items.forEach(item => {
        csvContent += `${dateStr},${order.orderNumber},"${item.name}",${item.quantity},"${item.price.toFixed(2)}","${order.paymentMethod}","${cashierName}","${eventName}"\n`;
      });
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `vendas_flow_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReprint = (order: Order) => {
    const tickets: any[] = [];
    order.items.forEach(item => {
      for (let i = 0; i < item.quantity; i++) {
        tickets.push({
          orderId: order.id,
          orderNumber: order.orderNumber,
          productName: item.name,
          timestamp: order.createdAt instanceof Timestamp ? order.createdAt.toDate() : new Date(order.createdAt || new Date())
        });
      }
    });

    setPrintableTickets(tickets);
    
    setTimeout(() => {
      window.print();
      setPrintableTickets([]);
    }, 100);
  };

  return (
    <AppShell>
      <div className="flex flex-col gap-8 mb-10 max-w-7xl mx-auto px-1">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
            <h2 className="text-3xl md:text-4xl font-black text-primary uppercase tracking-tighter italic leading-none">
              {role === 'cashier' ? 'Minhas Fichas' : 'Histórico'}
            </h2>
            <p className="text-sm md:text-base text-muted-foreground font-medium italic">
              {role === 'cashier' ? 'Gerencie as fichas emitidas por você.' : 'Filtragem por evento e operador.'}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <Button 
              onClick={exportCSV} 
              variant="outline" 
              className="flex-1 sm:flex-none font-black uppercase rounded-2xl h-14 px-8 shadow-xl shadow-primary/5 border-primary/20 bg-card" 
              disabled={!orders || orders.length === 0}
            >
              <Download className="mr-3 h-5 w-5 text-primary" /> CSV
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-card p-6 rounded-[2rem] border-2 border-primary/10 shadow-2xl">
          {isAdminView && (
            <div className="space-y-2">
              <span className="text-[9px] font-black uppercase text-primary tracking-widest ml-1 flex items-center gap-2">
                <Calendar className="h-3 w-3" /> Evento
              </span>
              <Select value={activeEventFilter} onValueChange={setActiveEventFilter}>
                <SelectTrigger className="h-12 rounded-xl border-2 border-primary font-bold bg-white text-primary px-4">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {events.map(e => (
                    <SelectItem key={e.id} value={e.id} className="font-bold uppercase text-xs">{e.name}</SelectItem>
                  ))}
                  {events.length === 0 && <SelectItem value="all">Carregando...</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          )}

          {isAdminView && (
            <div className="space-y-2">
              <span className="text-[9px] font-black uppercase text-primary tracking-widest ml-1 flex items-center gap-2">
                <UserIcon className="h-3 w-3" /> Operador
              </span>
              <Select value={selectedCashier} onValueChange={setSelectedCashier}>
                <SelectTrigger className="h-12 rounded-xl border-2 border-primary font-bold bg-white text-primary px-4">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all" className="font-bold uppercase text-xs">Todos</SelectItem>
                  {cashierList.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="font-bold uppercase text-xs">{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <span className="text-[9px] font-black uppercase text-primary tracking-widest ml-1 flex items-center gap-2">
              <Filter className="h-3 w-3" /> Limite
            </span>
            <Select value={ordersLimit} onValueChange={setOrdersLimit}>
              <SelectTrigger className="h-12 rounded-xl border-2 border-primary font-bold bg-white text-primary px-4">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="20" className="font-bold uppercase text-xs">Últimos 20</SelectItem>
                <SelectItem value="100" className="font-bold uppercase text-xs">Últimos 100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="rounded-[2rem] border border-primary/5 bg-card shadow-2xl overflow-hidden max-w-7xl mx-auto mb-10">
        <div className="overflow-x-auto">
          <Table className="min-w-[900px]">
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent border-primary/5">
                <TableHead className="font-black uppercase text-[10px] py-6 pl-8 tracking-widest w-[120px]">Ficha</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest w-[150px]">Data</TableHead>
                {isAdminView && <TableHead className="font-black uppercase text-[10px] tracking-widest w-[150px]">Operador</TableHead>}
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Itens</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest w-[120px]">Pgto</TableHead>
                <TableHead className="text-right font-black uppercase text-[10px] tracking-widest w-[140px]">Valor</TableHead>
                <TableHead className="text-right font-black uppercase text-[10px] tracking-widest pr-8 w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={isAdminView ? 7 : 6} className="text-center py-24">
                    <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20 mx-auto" />
                  </TableCell>
                </TableRow>
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdminView ? 7 : 6} className="text-center py-24 text-muted-foreground font-black uppercase text-xs opacity-40">Nenhuma venda encontrada para este evento.</TableCell>
                </TableRow>
              ) : (
                orders.map((o) => (
                  <TableRow key={o.id} className="border-primary/5 hover:bg-primary/5 transition-all group">
                    <TableCell className="py-6 pl-8 font-black text-primary text-base">#{o.orderNumber}</TableCell>
                    <TableCell className="font-bold text-muted-foreground text-xs whitespace-nowrap">
                      {o.createdAt ? format(o.createdAt instanceof Timestamp ? o.createdAt.toDate() : new Date(o.createdAt), 'dd/MM/yyyy HH:mm') : '---'}
                    </TableCell>
                    {isAdminView && (
                      <TableCell className="font-black uppercase text-[10px] text-muted-foreground">
                        {tenantMembers?.[o.userId]?.name || "Operador"}
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {o.items?.map((item: any, idx: number) => (
                          <Badge key={idx} variant="secondary" className="text-[9px] font-black uppercase bg-primary/5 text-primary border-none">
                            {item.quantity}x {item.name}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="uppercase text-[9px] font-black border-primary/10 text-muted-foreground bg-muted/20">
                        {o.paymentMethod}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-black text-xl text-primary tracking-tighter">
                      R$ {o.total?.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      <Button variant="ghost" size="icon" onClick={() => handleReprint(o)} className="h-10 w-10 rounded-xl text-primary/40 hover:text-primary hover:bg-primary/10">
                        <Printer className="h-5 w-5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <PrintTickets tickets={printableTickets} />
    </AppShell>
  );
}
