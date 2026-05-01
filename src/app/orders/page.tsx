
"use client";

import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/use-auth-context';
import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

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

  useEffect(() => {
    if (tenantId && !authLoading) fetchOrders();
  }, [tenantId, authLoading, db]);

  async function fetchOrders() {
    setLoading(true);
    try {
      const q = query(collection(db, 'orders'), where('tenantId', '==', tenantId), orderBy('createdAt', 'desc'));
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
    link.setAttribute("download", `pedidos_arraial_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AppShell>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold font-headline">Histórico de Pedidos</h2>
        <Button onClick={exportCSV} variant="outline" disabled={orders.length === 0}>
          <Download className="mr-2 h-4 w-4" /> Exportar CSV
        </Button>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Itens</TableHead>
              <TableHead>Pagamento</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Nenhum pedido encontrado.
                </TableCell>
              </TableRow>
            ) : (
              orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-bold">#{o.orderNumber}</TableCell>
                  <TableCell>
                    {format(o.createdAt instanceof Timestamp ? o.createdAt.toDate() : new Date(o.createdAt), 'dd/MM/yyyy HH:mm')}
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    <div className="flex flex-wrap gap-1">
                      {o.items.map((item, idx) => (
                        <Badge key={idx} variant="secondary" className="text-[10px]">
                          {item.quantity}x {item.name}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="uppercase text-xs font-semibold">{o.paymentMethod}</TableCell>
                  <TableCell className="text-right font-bold text-primary">R$ {o.total.toFixed(2)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </AppShell>
  );
}
