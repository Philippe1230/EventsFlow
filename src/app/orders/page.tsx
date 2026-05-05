
"use client";

import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/use-auth-context';
import { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Loader2, Printer } from 'lucide-react';
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

  useEffect(() => {
    if (tenantId && !authLoading) fetchOrders();
  }, [tenantId, authLoading, db]);

  async function fetchOrders() {
    setLoading(true);
    try {
      const q = query(collection(db, 'tenants', tenantId!, 'orders'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
    } catch (e) {
      console.error("Erro ao buscar pedidos:", e);
    }
    setLoading(false);
  }

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
    
    // Pequeno delay para garantir que o DOM de impressão foi populado
    setTimeout(() => {
      window.print();
      setPrintableTickets([]);
    }, 100);
  };

  return (
    <AppShell>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-black text-primary uppercase">Histórico de Pedidos</h2>
          <p className="text-muted-foreground font-medium italic">Gerencie e acompanhe todas as vendas do evento.</p>
        </div>
        <Button onClick={exportCSV} variant="outline" className="font-bold rounded-xl h-12 px-6 border-primary/20" disabled={orders.length === 0}>
          <Download className="mr-2 h-4 w-4 text-primary" /> Exportar CSV
        </Button>
      </div>

      <div className="rounded-[2rem] border border-primary/5 bg-card shadow-xl overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-transparent border-primary/5">
              <TableHead className="font-black uppercase text-[10px] py-6">Número</TableHead>
              <TableHead className="font-black uppercase text-[10px]">Data/Hora</TableHead>
              <TableHead className="font-black uppercase text-[10px]">Itens</TableHead>
              <TableHead className="font-black uppercase text-[10px]">Pagamento</TableHead>
              <TableHead className="text-right font-black uppercase text-[10px]">Total</TableHead>
              <TableHead className="text-right font-black uppercase text-[10px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-20">
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <span className="font-black uppercase text-[10px] tracking-widest text-primary/40">Carregando Histórico...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-20 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <span className="font-black uppercase text-sm">Nenhum pedido encontrado</span>
                    <span className="text-xs italic font-medium">As vendas realizadas aparecerão aqui.</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              orders.map((o) => (
                <TableRow key={o.id} className="border-primary/5 hover:bg-primary/5 transition-colors group">
                  <TableCell className="font-black text-primary">#{o.orderNumber}</TableCell>
                  <TableCell className="font-bold text-muted-foreground text-xs">
                    {format(o.createdAt instanceof Timestamp ? o.createdAt.toDate() : new Date(o.createdAt), 'dd/MM/yyyy HH:mm')}
                  </TableCell>
                  <TableCell className="max-w-[250px]">
                    <div className="flex flex-wrap gap-1">
                      {o.items.map((item, idx) => (
                        <Badge key={idx} variant="secondary" className="text-[9px] font-black uppercase bg-primary/5 text-primary border-none py-1">
                          {item.quantity}x {item.name}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="uppercase text-[10px] font-black tracking-widest text-muted-foreground">{o.paymentMethod}</TableCell>
                  <TableCell className="text-right font-black text-lg text-primary tracking-tighter">R$ {o.total.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleReprint(o)}
                      className="h-10 w-10 rounded-xl text-primary/40 hover:text-primary hover:bg-primary/10"
                      title="Reimprimir Fichas"
                    >
                      <Printer className="h-5 w-5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Componente Invisível para Impressão */}
      <PrintTickets tickets={printableTickets} />
    </AppShell>
  );
}
