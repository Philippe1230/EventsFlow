
"use client";

import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/use-auth-context';
import { useState, useMemo } from 'react';
import { collection, query, orderBy, Timestamp, limit, where } from 'firebase/firestore';
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
import { Download, Loader2, Printer, Filter, User as UserIcon, Users } from 'lucide-react';
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
}

export default function OrdersPage() {
  const { tenantId, user, role, tenantMembers, isSuperAdmin, loading: authLoading } = useAuth();
  const db = useFirestore();
  const [printableTickets, setPrintableTickets] = useState<any[]>([]);
  const [ordersLimit, setOrdersLimit] = useState<string>("20");
  const [selectedCashier, setSelectedCashier] = useState<string>(user?.uid || "all");

  const isAdminView = role === 'owner' || isSuperAdmin;

  const ordersQuery = useMemoFirebase(() => {
    if (!tenantId || !user) return null;
    
    const ordersCol = collection(db, 'tenants', tenantId, 'orders');
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
  }, [db, tenantId, user, role, ordersLimit, selectedCashier]);

  const { data: orders = [], isLoading: loading } = useCollection<Order>(ordersQuery);

  const cashierList = useMemo(() => {
    if (!tenantMembers) return [];
    return Object.entries(tenantMembers).map(([uid, info]: [string, any]) => ({
      id: uid,
      name: typeof info === 'object' ? info.name : `Operador ${uid.substring(0, 4)}`,
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [tenantMembers]);

  const exportCSV = () => {
    if (!orders || orders.length === 0) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Data,Pedido #,Produto,Quantidade,Valor,Pagamento,Operador\n";

    orders.forEach(order => {
      const date = order.createdAt instanceof Timestamp ? order.createdAt.toDate() : new Date(order.createdAt || new Date());
      const dateStr = format(date, 'dd/MM/yyyy HH:mm');
      const cashierName = tenantMembers?.[order.userId]?.name || order.userId;
      
      order.items.forEach(item => {
        csvContent += `${dateStr},${order.orderNumber},"${item.name}",${item.quantity},"${item.price.toFixed(2)}","${order.paymentMethod}","${cashierName}"\n`;
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
              {role === 'cashier' ? 'Minhas Vendas' : 'Histórico de Vendas'}
            </h2>
            <p className="text-sm md:text-base text-muted-foreground font-medium italic">
              {role === 'cashier' ? 'Gerencie seus pedidos realizados.' : 'Filtre e visualize a performance da equipe.'}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <Button 
              onClick={exportCSV} 
              variant="outline" 
              className="flex-1 sm:flex-none font-black uppercase rounded-2xl h-14 px-8 shadow-xl shadow-primary/5 border-primary/10 transition-all hover:scale-[1.02] active:scale-95 bg-card" 
              disabled={!orders || orders.length === 0}
            >
              <Download className="mr-3 h-5 w-5 text-primary" /> Exportar CSV
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-card p-6 rounded-[2rem] border border-primary/5 shadow-xl shadow-primary/5">
          {isAdminView && (
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase text-primary tracking-widest ml-1 flex items-center gap-2">
                <Users className="h-3 w-3" /> Filtrar por Operador
              </span>
              <Select value={selectedCashier} onValueChange={setSelectedCashier}>
                <SelectTrigger className="h-12 rounded-xl border-primary/10 font-bold bg-muted/20 shadow-none hover:border-primary/40 transition-all px-4">
                  <SelectValue placeholder="Selecione o caixa" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-none shadow-2xl">
                  <SelectItem value="all" className="font-bold uppercase text-xs">Todos os Operadores</SelectItem>
                  {cashierList.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="font-bold uppercase text-xs">
                      {c.name} {c.id === user?.uid ? "(Você)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase text-primary tracking-widest ml-1 flex items-center gap-2">
              <Filter className="h-3 w-3" /> Exibir Quantidade
            </span>
            <Select value={ordersLimit} onValueChange={setOrdersLimit}>
              <SelectTrigger className="h-12 rounded-xl border-primary/10 font-bold bg-muted/20 shadow-none hover:border-primary/40 transition-all px-4">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-none shadow-2xl">
                <SelectItem value="5" className="font-bold uppercase text-xs">Últimos 5 Pedidos</SelectItem>
                <SelectItem value="20" className="font-bold uppercase text-xs">Últimos 20 Pedidos</SelectItem>
                <SelectItem value="30" className="font-bold uppercase text-xs">Últimos 30 Pedidos</SelectItem>
                <SelectItem value="100" className="font-bold uppercase text-xs">Últimos 100 Pedidos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="rounded-[2rem] md:rounded-[2.5rem] border border-primary/5 bg-card shadow-2xl overflow-hidden max-w-7xl mx-auto">
        <div className="overflow-x-auto">
          <Table className="min-w-[900px]">
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent border-primary/5">
                <TableHead className="font-black uppercase text-[10px] py-6 pl-8 tracking-widest w-[120px]">Ticket</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest w-[150px]">Data & Hora</TableHead>
                {isAdminView && <TableHead className="font-black uppercase text-[10px] tracking-widest w-[150px]">Operador</TableHead>}
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Produtos Vendidos</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest w-[120px]">Pagamento</TableHead>
                <TableHead className="text-right font-black uppercase text-[10px] tracking-widest w-[140px]">Faturado</TableHead>
                <TableHead className="text-right font-black uppercase text-[10px] tracking-widest pr-8 w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={isAdminView ? 7 : 6} className="text-center py-24">
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="h-12 w-12 animate-spin text-primary opacity-20" />
                      <span className="font-black uppercase text-[10px] tracking-[0.3em] text-primary/40">Sincronizando Histórico...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : !orders || orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdminView ? 7 : 6} className="text-center py-24 text-muted-foreground">
                    <div className="flex flex-col items-center gap-4">
                      <div className="bg-primary/5 p-6 rounded-[2rem]">
                        <Printer className="h-12 w-12 text-primary/20" />
                      </div>
                      <div className="space-y-1">
                        <span className="font-black uppercase text-sm block">Vazio por enquanto</span>
                        <span className="text-[10px] uppercase font-bold tracking-widest opacity-40">Nenhuma venda encontrada</span>
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
                      {o.createdAt ? format(o.createdAt instanceof Timestamp ? o.createdAt.toDate() : new Date(o.createdAt), 'dd/MM/yyyy HH:mm') : 'Pendente...'}
                    </TableCell>
                    {isAdminView && (
                      <TableCell>
                         <div className="flex items-center gap-2">
                           <UserIcon className="h-3.5 w-3.5 text-primary/40" />
                           <span className="font-black uppercase text-[10px] text-muted-foreground">
                             {tenantMembers?.[o.userId]?.name || "Desconhecido"}
                           </span>
                         </div>
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5 max-w-[350px]">
                        {o.items?.map((item: any, idx: number) => (
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
                      R$ {o.total?.toFixed(2) || '0.00'}
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
