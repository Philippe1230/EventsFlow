
"use client";

import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/use-auth-context';
import { useState, useMemo, use } from 'react';
import { collection, query, orderBy, addDoc, doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2, Edit3, Trash2, Store, Package, Users, ChevronLeft, Flag, TrendingUp, Target, Calculator, Info, ArrowUpRight, BarChart3, ShieldCheck, Wallet, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface Supplier {
  id: string;
  name: string;
  responsibleName?: string;
  phone?: string;
  notes?: string;
  totalActualRevenue?: number;
  totalActualCost?: number;
  totalActualProfit?: number;
}

interface Product {
  id: string;
  name: string;
  price: number;
  type: 'own' | 'supplier';
  supplierId?: string;
  supplierUnitCost?: number;
  plannedQuantity?: number;
  active: boolean;
  soldQuantity?: number;
}

const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function EventConfigPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = use(params);
  const { tenantId, role, tenantMembers } = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || "suppliers");

  // Event Data
  const eventRef = useMemoFirebase(() => tenantId ? doc(db, 'tenants', tenantId, 'events', eventId) : null, [tenantId, db, eventId]);
  const { data: event, isLoading: eventLoading } = useDoc(eventRef);
  const isFinalized = event?.status === 'finalizado';

  // Suppliers Data
  const suppliersQuery = useMemoFirebase(() => tenantId ? query(collection(db, 'tenants', tenantId, 'events', eventId, 'suppliers'), orderBy('name')) : null, [tenantId, db, eventId]);
  const { data: suppliersData, isLoading: suppliersLoading } = useCollection<Supplier>(suppliersQuery);
  const suppliers = suppliersData || [];

  // Products Data
  const productsQuery = useMemoFirebase(() => tenantId ? query(collection(db, 'tenants', tenantId, 'events', eventId, 'products'), orderBy('name')) : null, [tenantId, db, eventId]);
  const { data: productsData, isLoading: productsLoading } = useCollection<Product>(productsQuery);
  const products = productsData || [];

  // Projections Calculation
  const projections = useMemo(() => {
    let plannedRevenue = 0;
    let plannedCost = 0;
    let actualRevenue = 0;
    let actualCost = 0;
    let totalPlannedQty = 0;
    let totalActualQty = 0;

    const supplierProjections: Record<string, { plannedRepasse: number, actualRepasse: number, revenue: number }> = {};

    products.forEach(p => {
      const pPlanned = p.plannedQuantity || 0;
      const pSold = p.soldQuantity || 0;
      
      plannedRevenue += pPlanned * p.price;
      actualRevenue += pSold * p.price;
      totalPlannedQty += pPlanned;
      totalActualQty += pSold;

      if (p.type === 'supplier') {
        const unitCost = p.supplierUnitCost || 0;
        const itemPlannedCost = pPlanned * unitCost;
        const itemActualCost = pSold * unitCost;
        
        plannedCost += itemPlannedCost;
        actualCost += itemActualCost;

        if (p.supplierId) {
          if (!supplierProjections[p.supplierId]) {
            supplierProjections[p.supplierId] = { plannedRepasse: 0, actualRepasse: 0, revenue: 0 };
          }
          supplierProjections[p.supplierId].plannedRepasse += itemPlannedCost;
          supplierProjections[p.supplierId].actualRepasse += itemActualCost;
          supplierProjections[p.supplierId].revenue += pSold * p.price;
        }
      }
    });

    const plannedProfit = plannedRevenue - plannedCost;
    const actualProfit = actualRevenue - actualCost;

    return {
      plannedRevenue,
      plannedCost,
      plannedProfit,
      actualRevenue,
      actualCost,
      actualProfit,
      efficiency: totalPlannedQty > 0 ? (totalActualQty / totalPlannedQty) * 100 : 0,
      supplierProjections
    };
  }, [products]);

  // Forms State
  const [submitting, setSubmitting] = useState(false);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [currentSupplier, setCurrentSupplier] = useState<Partial<Supplier>>({});
  const [showProductForm, setShowProductForm] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Partial<Product>>({ type: 'own', active: true });

  const handleSaveSupplier = async () => {
    if (!tenantId || !currentSupplier.name || isFinalized) return;
    setSubmitting(true);
    try {
      const colRef = collection(db, 'tenants', tenantId, 'events', eventId, 'suppliers');
      if (currentSupplier.id) {
        await updateDoc(doc(colRef, currentSupplier.id), { ...currentSupplier });
      } else {
        await addDoc(colRef, { 
          ...currentSupplier,
          totalActualRevenue: 0,
          totalActualCost: 0,
          totalActualProfit: 0
        });
      }
      setShowSupplierForm(false);
      setCurrentSupplier({});
      toast({ title: "Sucesso", description: "Fornecedor salvo." });
    } catch (e) {
      toast({ title: "Erro", description: "Erro ao salvar fornecedor.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveProduct = async () => {
    if (!tenantId || !currentProduct.name || !currentProduct.price || isFinalized) return;
    
    setSubmitting(true);
    try {
      const colRef = collection(db, 'tenants', tenantId, 'events', eventId, 'products');
      if (currentProduct.id) {
        await updateDoc(doc(colRef, currentProduct.id), { ...currentProduct });
      } else {
        await addDoc(colRef, { ...currentProduct, soldQuantity: 0 });
      }
      setShowProductForm(false);
      setCurrentProduct({ type: 'own', active: true });
      toast({ title: "Sucesso", description: "Produto salvo." });
    } catch (e) {
      toast({ title: "Erro", description: "Erro ao salvar produto.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinalizeEvent = async () => {
    if (!tenantId || !event || !confirm("Deseja finalizar o evento? Isso calculará automaticamente os repasses finais e bloqueará novas vendas no PDV.")) return;
    setSubmitting(true);

    try {
      const batch = writeBatch(db);
      const supplierStats: Record<string, { revenue: number, cost: number, profit: number }> = {};
      
      products.forEach(p => {
        const sold = p.soldQuantity || 0;
        const revenue = sold * p.price;
        const cost = p.type === 'supplier' ? sold * (p.supplierUnitCost || 0) : 0;
        const profit = revenue - cost;

        if (p.supplierId) {
          if (!supplierStats[p.supplierId]) supplierStats[p.supplierId] = { revenue: 0, cost: 0, profit: 0 };
          supplierStats[p.supplierId].revenue += revenue;
          supplierStats[p.supplierId].cost += cost;
          supplierStats[p.supplierId].profit += profit;
        }
      });

      Object.entries(supplierStats).forEach(([id, stats]) => {
        const sRef = doc(db, 'tenants', tenantId, 'events', eventId, 'suppliers', id);
        batch.update(sRef, {
          totalActualRevenue: stats.revenue,
          totalActualCost: stats.cost,
          totalActualProfit: stats.profit
        });
      });

      batch.update(eventRef!, { status: 'finalizado' });
      await batch.commit();
      toast({ title: "Evento Finalizado", description: "Todos os repasses financeiros foram processados e o PDV foi encerrado." });
    } catch (e) {
      console.error(e);
      toast({ title: "Erro ao finalizar", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleMemberInEvent = async (userId: string, memberInfo: any) => {
    if (!tenantId || !event || isFinalized) return;
    const currentMembers = event.members || {};
    const newMembers = { ...currentMembers };

    if (newMembers[userId]) {
      delete newMembers[userId];
    } else {
      newMembers[userId] = {
        role: memberInfo.role || 'cashier',
        name: memberInfo.name || 'Operador',
        email: memberInfo.email || ''
      };
    }

    await updateDoc(eventRef!, { members: newMembers });
  };

  const deleteSupplier = async (id: string) => {
    if (isFinalized || !confirm("Excluir este fornecedor?")) return;
    try {
      await deleteDoc(doc(db, 'tenants', tenantId!, 'events', eventId, 'suppliers', id));
    } catch (e) {
      toast({ title: "Erro", variant: "destructive" });
    }
  };

  const deleteProduct = async (id: string) => {
    if (isFinalized || !confirm("Excluir este produto do evento?")) return;
    try {
      await deleteDoc(doc(db, 'tenants', tenantId!, 'events', eventId, 'products', id));
    } catch (e) {
      toast({ title: "Erro", variant: "destructive" });
    }
  };

  if (role !== 'owner') return null;

  return (
    <AppShell>
      <div className="flex flex-col gap-6 md:gap-8 max-w-7xl mx-auto mb-20 px-1">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3 md:gap-4">
            <Button asChild variant="ghost" size="icon" className="rounded-xl h-10 w-10 md:h-12 md:w-12 hover:bg-primary/10 text-primary">
              <Link href="/events"><ChevronLeft className="h-5 w-5 md:h-6 md:w-6" /></Link>
            </Button>
            <div className="space-y-0.5">
              <h2 className="text-xl md:text-3xl font-black text-primary uppercase tracking-tighter italic leading-none truncate max-w-[200px] md:max-w-none">
                {eventLoading ? "Carregando..." : event?.name}
              </h2>
              <p className="text-muted-foreground font-medium italic text-[10px] md:text-sm uppercase tracking-widest">Configuração do Evento</p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
             <Badge className={cn(
                "h-10 flex-1 md:flex-none justify-center px-4 md:px-6 rounded-xl font-black uppercase text-[9px] md:text-[10px] tracking-widest border-none shadow-sm",
                event?.status === 'ativo' ? "bg-green-500 text-white" : 
                event?.status === 'finalizado' ? "bg-primary text-white" : "bg-muted text-muted-foreground"
              )}>
              {event?.status}
            </Badge>
            {event?.status === 'ativo' && (
              <Button onClick={handleFinalizeEvent} disabled={submitting} variant="destructive" className="h-10 flex-1 md:flex-none rounded-xl font-black uppercase text-[9px] md:text-[10px] tracking-widest shadow-lg shadow-destructive/20">
                {submitting ? <Loader2 className="animate-spin h-4 w-4" /> : <><Flag className="mr-2 h-4 w-4" /> Finalizar</>}
              </Button>
            )}
            {isFinalized && (
              <div className="bg-primary/10 text-primary flex items-center gap-2 px-4 py-2 rounded-xl border border-primary/20">
                <Lock className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Fechado</span>
              </div>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6 md:space-y-8">
          <TabsList className="bg-muted/50 p-1 rounded-[1.2rem] h-14 md:h-16 w-full lg:w-auto grid grid-cols-4 gap-1 md:gap-2 shadow-inner">
            <TabsTrigger value="suppliers" className="rounded-xl md:rounded-2xl font-black uppercase text-[8px] md:text-[10px] tracking-tighter md:tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-xl transition-all h-full px-1">
              <Store className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" /> Barracas
            </TabsTrigger>
            <TabsTrigger value="products" className="rounded-xl md:rounded-2xl font-black uppercase text-[8px] md:text-[10px] tracking-tighter md:tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-xl transition-all h-full px-1">
              <Package className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" /> Cardápio
            </TabsTrigger>
            <TabsTrigger value="lucros" className="rounded-xl md:rounded-2xl font-black uppercase text-[8px] md:text-[10px] tracking-tighter md:tracking-widest data-[state=active]:bg-secondary data-[state=active]:text-white data-[state=active]:shadow-xl transition-all h-full px-1">
              <Calculator className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" /> Lucros
            </TabsTrigger>
            <TabsTrigger value="team" className="rounded-xl md:rounded-2xl font-black uppercase text-[8px] md:text-[10px] tracking-tighter md:tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-xl transition-all h-full px-1">
              <Users className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" /> Equipe
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lucros" className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
             {!isFinalized && (
               <div className="space-y-6">
                  <div className="flex items-center gap-3 px-1 border-l-4 border-muted-foreground/20 pl-4">
                    <div className="bg-muted p-2 rounded-lg"><Target className="h-5 w-5 text-muted-foreground" /></div>
                    <div>
                      <h3 className="text-lg font-black uppercase text-muted-foreground leading-none tracking-tight">Análise Prevista (Metas)</h3>
                      <p className="text-[10px] font-bold uppercase text-muted-foreground/60 tracking-widest mt-1">Estimativa baseada no planejamento inicial</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                     <SummaryCard title="Arrecadação Prevista" value={`R$ ${formatCurrency(projections.plannedRevenue)}`} icon={<TrendingUp className="h-5 w-5" />} description="Meta Bruta de Vendas" color="text-muted-foreground" />
                     <SummaryCard title="Custo de Repasse" value={`R$ ${formatCurrency(projections.plannedCost)}`} icon={<Calculator className="h-5 w-5" />} description="Saída Prevista para Terceiros" color="text-secondary" />
                     <SummaryCard title="Lucro Org. Projetado" value={`R$ ${formatCurrency(projections.plannedProfit)}`} icon={<Flag className="h-5 w-5" />} color="text-green-600" description="Expectativa de Ganho Líquido" />
                  </div>
               </div>
             )}

             <div className="space-y-6">
                <div className="flex items-center gap-3 px-1 border-l-4 border-primary pl-4">
                  <div className={cn("p-2 rounded-lg", isFinalized ? "bg-green-500/10" : "bg-primary/10")}>
                    {isFinalized ? <ShieldCheck className="h-5 w-5 text-green-600" /> : <BarChart3 className="h-5 w-5 text-primary" />}
                  </div>
                  <div>
                    <h3 className={cn("text-lg font-black uppercase leading-none tracking-tight", isFinalized ? "text-green-600" : "text-primary")}>
                      {isFinalized ? "Fechamento de Caixa (Final)" : "Resultado Operacional (Real)"}
                    </h3>
                    <p className="text-[10px] font-bold uppercase opacity-60 tracking-widest mt-1">
                      {isFinalized ? "Valores finais consolidados pós-evento" : "Desempenho atual capturado no caixa"}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                   <SummaryCard title="Arrecadação Realizada" value={`R$ ${formatCurrency(projections.actualRevenue)}`} icon={<ArrowUpRight className="h-5 w-5" />} description="Entrada Bruta no Caixa" />
                   <SummaryCard title="Lucro Org. Real" value={`R$ ${formatCurrency(projections.actualProfit)}`} icon={<ShieldCheck className="h-5 w-5" />} color="text-primary" description="Ganho Líquido da Organização" />
                   <SummaryCard title="Atingimento da Meta" value={`${projections.efficiency.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`} icon={<BarChart3 className="h-5 w-5" />} color="text-secondary" description="Volume de Itens Vendidos" />
                </div>
             </div>

             <div className="space-y-6">
                <div className="flex items-center gap-3 px-1 border-l-4 border-secondary pl-4">
                  <div className="bg-secondary/10 p-2 rounded-lg"><Wallet className="h-5 w-5 text-secondary" /></div>
                  <div>
                    <h3 className="text-lg font-black uppercase text-secondary leading-none tracking-tight">Repasses para Terceiros (Barracas)</h3>
                    <p className="text-[10px] font-bold uppercase text-secondary/60 tracking-widest mt-1">Valores {isFinalized ? "pagos" : "a pagar"} para cada barraca</p>
                  </div>
                </div>
                <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-card">
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table className="min-w-[700px]">
                        <TableHeader className="bg-muted/50">
                          <TableRow className="hover:bg-transparent border-primary/5">
                            <TableHead className="font-black uppercase text-[10px] py-6 pl-8">Barraca</TableHead>
                            {!isFinalized && <TableHead className="font-black uppercase text-[10px]">Repasse Previsto (Meta)</TableHead>}
                            <TableHead className="font-black uppercase text-[10px]">{isFinalized ? "Repasse Efetuado" : "Repasse Real (A Pagar)"}</TableHead>
                            <TableHead className="font-black uppercase text-[10px] text-right pr-8">Seu Ganho (Org.)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {suppliers.map(s => {
                            const stats = projections.supplierProjections[s.id] || { plannedRepasse: 0, actualRepasse: 0, revenue: 0 };
                            return (
                              <TableRow key={s.id} className="border-primary/5 hover:bg-primary/5 transition-all">
                                <TableCell className="font-black text-primary py-6 pl-8 uppercase text-sm">{s.name}</TableCell>
                                {!isFinalized && <TableCell className="font-bold text-muted-foreground text-xs italic">R$ {formatCurrency(stats.plannedRepasse)}</TableCell>}
                                <TableCell className="font-black text-secondary text-base">R$ {formatCurrency(stats.actualRepasse)}</TableCell>
                                <TableCell className="text-right pr-8 font-black text-green-600">R$ {formatCurrency(stats.revenue - stats.actualRepasse)}</TableCell>
                              </TableRow>
                            );
                          })}
                          {suppliers.length === 0 && (
                            <TableRow><TableCell colSpan={4} className="py-12 text-center text-muted-foreground font-black uppercase text-[10px] opacity-40">Nenhuma barraca vinculada para repasse</TableCell></TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
             </div>
          </TabsContent>

          <TabsContent value="suppliers" className="space-y-6">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-lg md:text-xl font-black text-primary uppercase tracking-tight">Fornecedores</h3>
              {!isFinalized && (
                <Button onClick={() => { setCurrentSupplier({}); setShowSupplierForm(true); }} className="rounded-xl h-11 md:h-12 font-black uppercase text-[9px] md:text-[10px] tracking-widest px-4">
                  <Plus className="mr-2 h-4 w-4" /> Nova Barraca
                </Button>
              )}
            </div>

            {showSupplierForm && (
              <Card className="border-none shadow-2xl rounded-[2rem] bg-card animate-in fade-in slide-in-from-top-4 duration-300">
                <CardHeader className="bg-primary/5 p-6 md:p-8 pb-4">
                  <CardTitle className="text-base md:text-lg font-black uppercase text-primary">Informações da Barraca</CardTitle>
                </CardHeader>
                <CardContent className="p-6 md:p-8 space-y-4 md:space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div className="space-y-1.5">
                      <Label className="font-black uppercase text-[10px] ml-1">Nome da Barraca</Label>
                      <Input 
                        placeholder="Ex: Pastel da Dona Maria"
                        className="h-12 md:h-14 rounded-xl md:rounded-2xl border-primary/10 font-bold bg-muted/20 px-6"
                        value={currentSupplier.name || ''} 
                        onChange={(e) => setCurrentSupplier({ ...currentSupplier, name: e.target.value })} 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="font-black uppercase text-[10px] ml-1">Responsável</Label>
                      <Input 
                        placeholder="Ex: Maria Silva"
                        className="h-12 md:h-14 rounded-xl md:rounded-2xl border-primary/10 font-bold bg-muted/20 px-6"
                        value={currentSupplier.responsibleName || ''} 
                        onChange={(e) => setCurrentSupplier({ ...currentSupplier, responsibleName: e.target.value })} 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="font-black uppercase text-[10px] ml-1">Telefone</Label>
                      <Input 
                        placeholder="(11) 99999-9999"
                        className="h-12 md:h-14 rounded-xl md:rounded-2xl border-primary/10 font-bold bg-muted/20 px-6"
                        value={currentSupplier.phone || ''} 
                        onChange={(e) => setCurrentSupplier({ ...currentSupplier, phone: e.target.value })} 
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button variant="ghost" onClick={() => setShowSupplierForm(false)} className="rounded-xl font-bold uppercase text-[9px]">Cancelar</Button>
                    <Button onClick={handleSaveSupplier} disabled={submitting} className="rounded-xl px-8 h-12 md:h-14 font-black uppercase text-[9px] md:text-[10px] shadow-xl shadow-primary/20">
                      {submitting ? <Loader2 className="animate-spin h-4 w-4" /> : "Salvar Fornecedor"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="rounded-[2rem] md:rounded-[2.5rem] border border-primary/5 bg-card shadow-2xl overflow-hidden">
              <div className="overflow-x-auto">
              <Table className="min-w-[700px]">
                <TableHeader className="bg-muted/30">
                  <TableRow className="hover:bg-transparent border-primary/5">
                    <TableHead className="font-black uppercase text-[10px] py-6 pl-8">Nome</TableHead>
                    <TableHead className="font-black uppercase text-[10px]">Faturamento</TableHead>
                    <TableHead className="font-black uppercase text-[10px]">Custo Repasse</TableHead>
                    <TableHead className="font-black uppercase text-[10px]">Lucro Org.</TableHead>
                    <TableHead className="text-right font-black uppercase text-[10px] pr-8 w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliersLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-20"><Loader2 className="animate-spin h-10 w-10 mx-auto text-primary opacity-20" /></TableCell></TableRow>
                  ) : suppliers.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-20 text-muted-foreground font-black uppercase text-[10px] tracking-widest opacity-40">Nenhuma barraca cadastrada</TableRow>
                  ) : (
                    suppliers.map((s) => (
                      <TableRow key={s.id} className="border-primary/5 hover:bg-primary/5 transition-all">
                        <TableCell className="font-black text-primary py-6 pl-8 uppercase text-sm">
                          {s.name}
                          <p className="text-[9px] text-muted-foreground font-bold leading-tight">{s.responsibleName || 'Sem responsável'}</p>
                        </TableCell>
                        <TableCell className="font-black text-primary text-xs whitespace-nowrap">R$ {formatCurrency(s.totalActualRevenue || 0)}</TableCell>
                        <TableCell className="font-bold text-secondary text-xs whitespace-nowrap">R$ {formatCurrency(s.totalActualCost || 0)}</TableCell>
                        <TableCell className="font-black text-xs whitespace-nowrap text-green-600">
                          R$ {formatCurrency(s.totalActualProfit || 0)}
                        </TableCell>
                        <TableCell className="text-right pr-8">
                          <div className="flex justify-end gap-1">
                            {!isFinalized && (
                              <Button variant="ghost" size="icon" onClick={() => { setCurrentSupplier(s); setShowSupplierForm(true); }} className="h-9 w-9 rounded-lg text-primary/40 hover:text-primary hover:bg-primary/10">
                                <Edit3 className="h-4 w-4" />
                              </Button>
                            )}
                            {!isFinalized && (
                              <Button variant="ghost" size="icon" onClick={() => deleteSupplier(s.id)} className="h-9 w-9 rounded-lg text-destructive/40 hover:text-destructive hover:bg-destructive/10">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="products" className="space-y-6">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-lg md:text-xl font-black text-primary uppercase tracking-tight">Cardápio</h3>
              {!isFinalized && (
                <Button onClick={() => { setCurrentProduct({ type: 'own', active: true }); setShowProductForm(true); }} className="rounded-xl h-11 md:h-12 font-black uppercase text-[9px] md:text-[10px] tracking-widest px-4">
                  <Plus className="mr-2 h-4 w-4" /> Novo Item
                </Button>
              )}
            </div>

            {showProductForm && (
              <Card className="border-none shadow-2xl rounded-3xl bg-card animate-in fade-in slide-in-from-top-4 duration-300 border-2 border-primary/5">
                <CardHeader className="bg-primary/5 p-6 md:p-8 pb-4">
                  <CardTitle className="text-base md:text-lg font-black uppercase text-primary">Detalhes do Produto</CardTitle>
                </CardHeader>
                <CardContent className="p-6 md:p-8 space-y-4 md:space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    <div className="space-y-1.5">
                      <Label className="font-black uppercase text-[10px] ml-1">Nome do Produto</Label>
                      <Input 
                        placeholder="Ex: Pastel de Carne"
                        className="h-12 md:h-14 rounded-xl md:rounded-2xl border-primary/10 font-bold bg-muted/20 px-6"
                        value={currentProduct.name || ''} 
                        onChange={(e) => setCurrentProduct({ ...currentProduct, name: e.target.value })} 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="font-black uppercase text-[10px] ml-1">Preço de Venda (R$)</Label>
                      <Input 
                        type="number"
                        placeholder="12,00"
                        className="h-12 md:h-14 rounded-xl md:rounded-2xl border-primary/10 font-bold bg-muted/20 px-6"
                        value={currentProduct.price || ''} 
                        onChange={(e) => setCurrentProduct({ ...currentProduct, price: parseFloat(e.target.value) })} 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="font-black uppercase text-[10px] ml-1">Origem</Label>
                      <Select value={currentProduct.type} onValueChange={(v: any) => setCurrentProduct({ ...currentProduct, type: v })}>
                        <SelectTrigger className="h-12 md:h-14 rounded-xl md:rounded-2xl border-primary/10 font-bold bg-muted/20 px-6 uppercase text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-none shadow-2xl">
                          <SelectItem value="own" className="font-black uppercase text-xs">Próprio (Dono)</SelectItem>
                          <SelectItem value="supplier" className="font-black uppercase text-xs">Barraca (Terceiro)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="font-black uppercase text-[10px] ml-1">Meta de Venda (Unidades)</Label>
                      <Input 
                        type="number"
                        placeholder="300"
                        className="h-12 md:h-14 rounded-xl md:rounded-2xl border-primary/10 font-bold bg-muted/20 px-6"
                        value={currentProduct.plannedQuantity || ''} 
                        onChange={(e) => setCurrentProduct({ ...currentProduct, plannedQuantity: parseInt(e.target.value) })} 
                      />
                    </div>

                    {currentProduct.type === 'supplier' && (
                      <>
                        <div className="space-y-1.5">
                          <Label className="font-black uppercase text-[10px] ml-1">Vincular Barraca</Label>
                          <Select value={currentProduct.supplierId} onValueChange={(v) => setCurrentProduct({ ...currentProduct, supplierId: v })}>
                            <SelectTrigger className="h-12 md:h-14 rounded-xl md:rounded-2xl border-primary/10 font-bold bg-muted/20 px-6 uppercase text-xs">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl">
                              {suppliers.map(s => (
                                <SelectItem key={s.id} value={s.id} className="font-black uppercase text-xs">{s.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="font-black uppercase text-[10px] ml-1">Valor do Fornecedor (Repasse)</Label>
                          <Input 
                            type="number"
                            placeholder="7,00"
                            className="h-12 md:h-14 rounded-xl md:rounded-2xl border-primary/10 font-bold bg-muted/20 px-6"
                            value={currentProduct.supplierUnitCost || ''} 
                            onChange={(e) => setCurrentProduct({ ...currentProduct, supplierUnitCost: parseFloat(e.target.value) })} 
                          />
                        </div>
                      </>
                    )}
                  </div>
                  
                  <div className="flex justify-end gap-3 pt-4">
                    <Button variant="ghost" onClick={() => setShowProductForm(false)} className="rounded-xl font-bold uppercase text-[9px]">Cancelar</Button>
                    <Button onClick={handleSaveProduct} disabled={submitting} className="rounded-xl px-8 h-12 md:h-14 font-black uppercase text-[9px] md:text-[10px] shadow-xl shadow-primary/20">
                      {submitting ? <Loader2 className="animate-spin h-4 w-4" /> : "Salvar Item"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="rounded-[2rem] md:rounded-[2.5rem] border border-primary/5 bg-card shadow-2xl overflow-hidden">
              <div className="overflow-x-auto">
              <Table className="min-w-[700px]">
                <TableHeader className="bg-muted/30">
                  <TableRow className="hover:bg-transparent border-primary/5">
                    <TableHead className="font-black uppercase text-[10px] py-6 pl-8">Produto</TableHead>
                    <TableHead className="font-black uppercase text-[10px]">Vendido</TableHead>
                    <TableHead className="font-black uppercase text-[10px]">Meta (Restante)</TableHead>
                    <TableHead className="font-black uppercase text-[10px]">Arrecadado</TableHead>
                    <TableHead className="text-right font-black uppercase text-[10px] pr-8 w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productsLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-20"><Loader2 className="animate-spin h-10 w-10 mx-auto text-primary opacity-20" /></TableCell></TableRow>
                  ) : products.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-20 text-muted-foreground font-black uppercase text-[10px] tracking-widest opacity-40">Nenhum item cadastrado</TableCell></TableRow>
                  ) : (
                    products.map((p) => {
                      const missed = Math.max(0, (p.plannedQuantity || 0) - (p.soldQuantity || 0));
                      return (
                        <TableRow key={p.id} className="border-primary/5 hover:bg-primary/5 transition-all">
                          <TableCell className="font-black text-primary py-6 pl-8 uppercase text-sm">
                            {p.name}
                            <Badge variant="outline" className="ml-2 text-[7px] border-primary/20 uppercase px-1 h-3">{p.type === 'own' ? 'Dono' : 'Barraca'}</Badge>
                          </TableCell>
                          <TableCell className="font-black text-lg md:text-xl tracking-tighter whitespace-nowrap">{p.soldQuantity || 0} un</TableCell>
                          <TableCell className={cn("font-bold text-[10px] md:text-xs", missed > 0 ? "text-secondary" : "text-green-600")}>
                            {missed > 0 ? `${missed} pendentes` : 'Meta batida!'}
                          </TableCell>
                          <TableCell className="font-black text-primary text-sm md:text-base whitespace-nowrap">R$ {formatCurrency((p.soldQuantity || 0) * p.price)}</TableCell>
                          <TableCell className="text-right pr-8">
                            <div className="flex justify-end gap-1">
                              {!isFinalized && (
                                <Button variant="ghost" size="icon" onClick={() => { setCurrentProduct(p); setShowProductForm(true); }} className="h-9 w-9 rounded-lg text-primary/40 hover:text-primary hover:bg-primary/10">
                                  <Edit3 className="h-4 w-4" />
                                </Button>
                              )}
                              {!isFinalized && (
                                <Button variant="ghost" size="icon" onClick={() => deleteProduct(p.id)} className="h-9 w-9 rounded-lg text-destructive/40 hover:text-destructive hover:bg-destructive/10">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="team" className="space-y-6">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-lg md:text-xl font-black text-primary uppercase tracking-tight">Equipe</h3>
            </div>

            <div className="rounded-[2rem] md:rounded-[2.5rem] border border-primary/5 bg-card shadow-2xl overflow-hidden">
              <div className="overflow-x-auto">
              <Table className="min-w-[700px]">
                <TableHeader className="bg-muted/30">
                  <TableRow className="hover:bg-transparent border-primary/5">
                    <TableHead className="font-black uppercase text-[10px] py-6 pl-8">Operador</TableHead>
                    <TableHead className="font-black uppercase text-[10px]">E-mail</TableHead>
                    <TableHead className="font-black uppercase text-[10px]">Status</TableHead>
                    <TableHead className="text-right font-black uppercase text-[10px] pr-8 w-[120px]">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(tenantMembers || {}).map(([uid, info]: [string, any]) => {
                    const isLinked = event?.members?.[uid] != null;
                    return (
                      <TableRow key={uid} className={cn("border-primary/5 transition-all", isLinked ? "bg-primary/5" : "hover:bg-muted/30")}>
                        <TableCell className="font-black text-primary py-6 pl-8 uppercase text-sm">
                          {info.name || 'Operador'}
                          {info.role === 'owner' && <Badge variant="outline" className="ml-2 text-[8px] border-primary/20 text-primary">Dono</Badge>}
                        </TableCell>
                        <TableCell className="font-bold text-muted-foreground text-[10px]">{info.email}</TableCell>
                        <TableCell>
                          {isLinked ? (
                            <Badge className="bg-green-500 font-black uppercase text-[8px] tracking-widest px-2">Ativo</Badge>
                          ) : (
                            <Badge variant="outline" className="font-black uppercase text-[8px] tracking-widest px-2 opacity-40">Sem acesso</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right pr-8">
                          {!isFinalized && (
                            <Button 
                              variant={isLinked ? "ghost" : "default"} 
                              size="sm" 
                              onClick={() => toggleMemberInEvent(uid, info)}
                              className={cn("font-black uppercase text-[9px] rounded-lg h-10 px-4 whitespace-nowrap", isLinked ? "text-destructive hover:bg-destructive/5" : "shadow-lg shadow-primary/10")}
                            >
                              {isLinked ? "Remover" : "Vincular"}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

function SummaryCard({ title, value, icon, color = "text-primary", description }: { title: string, value: string, icon: React.ReactNode, color?: string, description?: string }) {
  return (
    <Card className="border-none shadow-xl rounded-3xl bg-card overflow-hidden group">
      <CardHeader className="flex flex-row items-center justify-between pb-2 p-5 md:p-6">
        <CardTitle className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground">{title}</CardTitle>
        <div className={cn("p-2 rounded-lg bg-muted", color)}>{icon}</div>
      </CardHeader>
      <CardContent className="px-5 md:px-6 pb-5 md:pb-6">
        <div className={cn("text-xl md:text-2xl font-black tracking-tighter", color)}>{value}</div>
        {description && <p className="text-[9px] font-bold text-muted-foreground mt-1 uppercase tracking-widest leading-none">{description}</p>}
      </CardContent>
    </Card>
  );
}
