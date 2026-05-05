
"use client";

import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/use-auth-context';
import { useState, useEffect, useCallback } from 'react';
import { collection, query, getDocs, orderBy, Timestamp, limit } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Loader2, Printer, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { PrintTickets } from '@/components/pdv/PrintTickets';

interface Order {
  id: string;
  orderNumber: number;
  total: number;
  paymentMethod: string;
  createdAt: Timestamp | Date;
  items: any[];
}

export default function OrdersPage() {
  const { tenantId, loading: authLoading } = useAuth();
  const db = useFirestore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [printableTickets, setPrintableTickets] = useState<any[]>([]);
  const [ordersLimit, setOrdersLimit] = useState<string>("20");

  const fetchOrders = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'tenants', tenantId, 'orders'), 
        orderBy('createdAt', 'desc'),
        limit(parseInt(ordersLimit))
      );
      const snap = await getDocs(q);
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
    } catch (e) {
      console.error("Erro ao buscar pedidos:", e);
    }
    setLoading(false);
  }, [db, tenantId, ordersLimit]);

  useEffect(() => {
    if (tenantId && !authLoading) fetchOrders();
  }, [tenantId, authLoading, fetchOrders]);

  const exportCSV = () => {
    if (orders.length === 0) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Data,Pedido #,Produto,Quantidade,Valor,Pagamento\n";

    orders.forEach(order => {
      const date = order.createdAt instanceof Timestamp ? order.createdAt.toDate() : new Date(order.createdAt);
      const dateStr = format(date, 'dd/MM/yyyy HH:mm');
      order.items.forEach(item => {
        csvContent += `${dateStr},${order.orderNumber},"${item.name}",${item.quantity},"${item.price.toFixed(2)}","${order.paymentMethod}"\n`;
      });
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `pedidos_flow_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
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
          timestamp: order.createdAt instanceof Timestamp ? order.createdAt.toDate() : new Date(order.createdAt)
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 max-w-7xl mx-auto px-1">
        <div className="space-y-1">
          <h2 className="text-3xl md:text-4xl font-black text-primary uppercase tracking-tighter italic leading-none">Histórico de Vendas</h2>
          <p className="text-sm md:text-base text-muted-foreground font-medium italic">Reimprima fichas ou exporte relatórios.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-card border border-primary/10 rounded-2xl px-4 h-14 shadow-sm">
            <Filter className="h-4 w-4 text-primary" />
            <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest whitespace-nowrap">Ver últimos:</span>
            <Select value={ordersLimit} onValueChange={setOrdersLimit}>
              <SelectTrigger className="border-none bg-transparent shadow-none font-black text-primary w-[80px] focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-none shadow-2xl">
                <SelectItem value="5" className="font-bold uppercase text-xs">5</SelectItem>
                <SelectItem value="20" className="font-bold uppercase text-xs">20</SelectItem>
                <SelectItem value="30" className="font-bold uppercase text-xs">30</SelectItem>
                <SelectItem value="100" className="font-bold uppercase text-xs">100</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={exportCSV} 
            variant="outline" 
            className="flex-1 sm:flex-none font-black uppercase rounded-2xl h-14 px-8 shadow-xl shadow-primary/5 border-primary/10 transition-all hover:scale-[1.02] active:scale-95 bg-card" 
            disabled={orders.length === 0}
          >
            <Download className="mr-3 h-5 w-5 text-primary" /> Exportar CSV
          </Button>
        </div>
      </div>

      <div className="rounded-[2rem] md:rounded-[2.5rem] border border-primary/5 bg-card shadow-2xl overflow-hidden max-w-7xl mx-auto">
        <div className="overflow-x-auto">
          <Table className="min-w-[900px]">
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent border-primary/5">
                <TableHead className="font-black uppercase text-[10px] py-6 pl-8 tracking-widest w-[120px]">Ticket</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest w-[150px]">Data & Hora</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Produtos Vendidos</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest w-[120px]">Pagamento</TableHead>
                <TableHead className="text-right font-black uppercase text-[10px] tracking-widest w-[140px]">Faturado</TableHead>
                <TableHead className="text-right font-black uppercase text-[10px] tracking-widest pr-8 w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-24">
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="h-12 w-12 animate-spin text-primary opacity-20" />
                      <span className="font-black uppercase text-[10px] tracking-[0.3em] text-primary/40">Sincronizando Histórico...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-24 text-muted-foreground">
                    <div className="flex flex-col items-center gap-4">
                      <div className="bg-primary/5 p-6 rounded-[2rem]">
                        <Printer className="h-12 w-12 text-primary/20" />
                      </div>
                      <div className="space-y-1">
                        <span className="font-black uppercase text-sm block">Vazio por enquanto</span>
                        <span className="text-[10px] uppercase font-bold tracking-widest opacity-40">As vendas aparecerão aqui em tempo real</span>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((o) => (
                  <TableRow key={o.id} className="border-primary/5 hover:bg-primary/5 transition-all duration-300 group">
                    <TableCell className="py-6 pl-8">
                      <div className="flex flex-col">
                        <span className="font-black text-primary text-base">#{o.orderNumber}</span>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase">Ref: {o.id.substring(0, 5)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-muted-foreground text-xs whitespace-nowrap">
                      {format(o.createdAt instanceof Timestamp ? o.createdAt.toDate() : new Date(o.createdAt), 'dd/MM/yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5 max-w-[400px]">
                        {o.items.map((item, idx) => (
                          <Badge key={idx} variant="secondary" className="text-[9px] font-black uppercase bg-primary/5 text-primary border-none py-1 px-2.5 rounded-lg shadow-sm whitespace-nowrap">
                            {item.quantity}x {item.name}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="uppercase text-[9px] font-black tracking-widest border-primary/10 text-muted-foreground bg-muted/20 px-3 py-1.5 whitespace-nowrap">
                        {o.paymentMethod}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-black text-xl text-primary tracking-tighter whitespace-nowrap">
                      R$ {o.total.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleReprint(o)}
                        className="h-12 w-12 rounded-2xl text-primary/40 hover:text-primary hover:bg-primary/10 transition-all hover:scale-110 shadow-sm"
                        title="Reimprimir Fichas"
                      >
                        <Printer className="h-6 w-6" />
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
