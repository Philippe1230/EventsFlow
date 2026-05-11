
"use client";

import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/use-auth-context';
import { useState, useEffect, use, useMemo } from 'react';
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
import { Plus, Loader2, Edit3, Trash2, Store, Package, Users, ChevronLeft, UserPlus, UserMinus, ShieldCheck, Flag, TrendingUp, DollarSign, Target, Calculator } from 'lucide-react';
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

    products.forEach(p => {
      const pPlanned = p.plannedQuantity || 0;
      const pSold = p.soldQuantity || 0;
      
      plannedRevenue += pPlanned * p.price;
      actualRevenue += pSold * p.price;

      if (p.type === 'supplier') {
        plannedCost += pPlanned * (p.supplierUnitCost || 0);
        actualCost += pSold * (p.supplierUnitCost || 0);
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
      efficiency: plannedProfit > 0 ? (actualProfit / plannedProfit) * 100 : 0
    };
  }, [products]);

  // Forms State
  const [submitting, setSubmitting] = useState(false);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [currentSupplier, setCurrentSupplier] = useState<Partial<Supplier>>({});
  const [showProductForm, setShowProductForm] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Partial<Product>>({ type: 'own', active: true });

  const handleSaveSupplier = async () => {
    if (!tenantId || !currentSupplier.name) return;
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
    if (!tenantId || !currentProduct.name || !currentProduct.price) return;
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
    if (!tenantId || !event || !confirm("Deseja finalizar o evento? Isso calculará automaticamente todos os lucros e custos de barracas.")) return;
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
      toast({ title: "Evento Finalizado", description: "Todos os cálculos foram processados com sucesso." });
    } catch (e) {
      console.error(e);
      toast({ title: "Erro ao finalizar", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleMemberInEvent = async (userId: string, memberInfo: any) => {
    if (!tenantId || !event) return;
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
    if (!confirm("Excluir este fornecedor?")) return;
    try {
      await deleteDoc(doc(db, 'tenants', tenantId!, 'events', eventId, 'suppliers', id));
    } catch (e) {
      toast({ title: "Erro", variant: "destructive" });
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("Excluir este produto do evento?")) return;
    try {
      await deleteDoc(doc(db, 'tenants', tenantId!, 'events', eventId, 'products', id));
    } catch (e) {
      toast({ title: "Erro", variant: "destructive" });
    }
  };

  if (role !== 'owner') return null;

  return (
    <AppShell>
      <div className="flex flex-col gap-8 max-w-7xl mx-auto mb-20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="icon" className="rounded-xl h-12 w-12 hover:bg-primary/10 text-primary">
              <Link href="/events"><ChevronLeft className="h-6 w-6" /></Link>
            </Button>
            <div className="space-y-1">
              <h2 className="text-3xl font-black text-primary uppercase tracking-tighter italic leading-none">
                {eventLoading ? "Carregando..." : event?.name}
              </h2>
              <p className="text-muted-foreground font-medium italic text-sm">Painel de controle e análise de lucros.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <Badge className={cn(
                "h-10 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest border-none shadow-sm",
                event?.status === 'ativo' ? "bg-green-500 text-white" : 
                event?.status === 'finalizado' ? "bg-primary text-white" : "bg-muted text-muted-foreground"
              )}>
              {event?.status}
            </Badge>
            {event?.status === 'ativo' && (
              <Button onClick={handleFinalizeEvent} disabled={submitting} variant="destructive" className="h-10 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-destructive/20">
                {submitting ? <Loader2 className="animate-spin h-4 w-4" /> : <><Flag className="mr-2 h-4 w-4" /> Finalizar Evento</>}
              </Button>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="bg-muted/50 p-1.5 rounded-[1.5rem] h-16 w-full lg:w-auto grid grid-cols-4 gap-2 shadow-inner">
            <TabsTrigger value="suppliers" className="rounded-2xl font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-xl transition-all h-full">
              <Store className="mr-2 h-4 w-4" /> Barracas
            </TabsTrigger>
            <TabsTrigger value="products" className="rounded-2xl font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-xl transition-all h-full">
              <Package className="mr-2 h-4 w-4" /> Cardápio
            </TabsTrigger>
            <TabsTrigger value="lucros" className="rounded-2xl font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-secondary data-[state=active]:text-white data-[state=active]:shadow-xl transition-all h-full">
              <Calculator className="mr-2 h-4 w-4" /> Lucros
            </TabsTrigger>
            <TabsTrigger value="team" className="rounded-2xl font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-xl transition-all h-full">
              <Users className="mr-2 h-4 w-4" /> Equipe
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lucros" className="space-y-8">
             <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-in fade-in slide-in-from-top-4">
                <SummaryCard title="Arrecadação Projetada" value={`R$ ${formatCurrency(projections.plannedRevenue)}`} icon={<Target className="h-5 w-5" />} description="Baseado nas metas" />
                <SummaryCard title="Lucro Projetado" value={`R$ ${formatCurrency(projections.plannedProfit)}`} icon={<TrendingUp className="h-5 w-5" />} color="text-green-500" description="Margem esperada" />
                <SummaryCard title="Lucro Atual (Real)" value={`R$ ${formatCurrency(projections.actualProfit)}`} icon={<ShieldCheck className="h-5 w-5" />} color="text-primary" description="Vendas realizadas" />
                <SummaryCard title="Eficiência do Evento" value={`${projections.efficiency.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`} icon={<Flag className="h-5 w-5" />} color="text-secondary" description="Atingimento da meta" />
             </div>

             <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-card">
                <CardHeader className="bg-muted/10 p-8">
                  <CardTitle className="text-xl font-black uppercase text-primary">Detalhamento de Projeções</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                   <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow className="hover:bg-transparent border-primary/5">
                          <TableHead className="font-black uppercase text-[10px] py-6 pl-8">Produto</TableHead>
                          <TableHead className="font-black uppercase text-[10px]">Preço</TableHead>
                          <TableHead className="font-black uppercase text-[10px]">Lucro Unit. Org.</TableHead>
                          <TableHead className="font-black uppercase text-[10px]">Lucro Total Projetado</TableHead>
                          <TableHead className="font-black uppercase text-[10px] text-right pr-8">Status Meta</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {products.map((p) => {
                          const profitPerUnit = p.price - (p.type === 'supplier' ? (p.supplierUnitCost || 0) : 0);
                          const totalPlannedProfit = (p.plannedQuantity || 0) * profitPerUnit;
                          const progress = p.plannedQuantity ? ((p.soldQuantity || 0) / p.plannedQuantity) * 100 : 0;
                          
                          return (
                            <TableRow key={p.id} className="border-primary/5 hover:bg-primary/5 transition-all">
                              <TableCell className="font-black text-primary py-6 pl-8 uppercase text-sm">{p.name}</TableCell>
                              <TableCell className="font-bold">R$ {formatCurrency(p.price)}</TableCell>
                              <TableCell className="font-black text-green-600">R$ {formatCurrency(profitPerUnit)}</TableCell>
                              <TableCell className="font-black text-primary">R$ {formatCurrency(totalPlannedProfit)}</TableCell>
                              <TableCell className="text-right pr-8">
                                <div className="flex flex-col items-end gap-1">
                                  <span className="font-black text-[10px] uppercase text-muted-foreground">{p.soldQuantity || 0} / {p.plannedQuantity || 0}</span>
                                  <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div className="h-full bg-primary" style={{ width: `${Math.min(100, progress)}%` }} />
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                   </Table>
                </CardContent>
             </Card>
          </TabsContent>

          <TabsContent value="suppliers" className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-primary uppercase tracking-tight">Fornecedores & Barracas</h3>
              {event?.status !== 'finalizado' && (
                <Button onClick={() => { setCurrentSupplier({}); setShowSupplierForm(true); }} className="rounded-xl h-12 font-black uppercase text-[10px] tracking-widest">
                  <Plus className="mr-2 h-4 w-4" /> Nova Barraca
                </Button>
              )}
            </div>

            {showSupplierForm && (
              <Card className="border-none shadow-2xl rounded-[2rem] bg-card animate-in fade-in slide-in-from-top-4 duration-300">
                <CardHeader className="bg-primary/5 p-8 pb-4">
                  <CardTitle className="text-lg font-black uppercase text-primary">Informações da Barraca</CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="font-black uppercase text-[10px] ml-1">Nome da Barraca</Label>
                      <Input 
                        placeholder="Ex: Pastel da Dona Maria"
                        className="h-14 rounded-2xl border-primary/10 font-bold bg-muted/20 px-6"
                        value={currentSupplier.name || ''} 
                        onChange={(e) => setCurrentSupplier({ ...currentSupplier, name: e.target.value })} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-black uppercase text-[10px] ml-1">Responsável</Label>
                      <Input 
                        placeholder="Ex: Maria Silva"
                        className="h-14 rounded-2xl border-primary/10 font-bold bg-muted/20 px-6"
                        value={currentSupplier.responsibleName || ''} 
                        onChange={(e) => setCurrentSupplier({ ...currentSupplier, responsibleName: e.target.value })} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-black uppercase text-[10px] ml-1">Telefone</Label>
                      <Input 
                        placeholder="(11) 99999-9999"
                        className="h-14 rounded-2xl border-primary/10 font-bold bg-muted/20 px-6"
                        value={currentSupplier.phone || ''} 
                        onChange={(e) => setCurrentSupplier({ ...currentSupplier, phone: e.target.value })} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-black uppercase text-[10px] ml-1">Notas</Label>
                      <Input 
                        placeholder="Observações adicionais"
                        className="h-14 rounded-2xl border-primary/10 font-bold bg-muted/20 px-6"
                        value={currentSupplier.notes || ''} 
                        onChange={(e) => setCurrentSupplier({ ...currentSupplier, notes: e.target.value })} 
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button variant="ghost" onClick={() => setShowSupplierForm(false)} className="rounded-xl font-bold uppercase text-[10px]">Cancelar</Button>
                    <Button onClick={handleSaveSupplier} disabled={submitting} className="rounded-xl px-10 h-14 font-black uppercase text-[10px] shadow-xl shadow-primary/20">
                      {submitting ? <Loader2 className="animate-spin h-4 w-4" /> : "Salvar Fornecedor"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="rounded-[2.5rem] border border-primary/5 bg-card shadow-2xl overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="hover:bg-transparent border-primary/5">
                    <TableHead className="font-black uppercase text-[10px] py-6 pl-8">Nome</TableHead>
                    <TableHead className="font-black uppercase text-[10px]">Faturamento</TableHead>
                    <TableHead className="font-black uppercase text-[10px]">Custo Repasse</TableHead>
                    <TableHead className="font-black uppercase text-[10px]">Lucro Organização</TableHead>
                    <TableHead className="text-right font-black uppercase text-[10px] pr-8">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliersLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-20"><Loader2 className="animate-spin h-10 w-10 mx-auto text-primary opacity-20" /></TableCell></TableRow>
                  ) : suppliers.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-20 text-muted-foreground font-black uppercase text-[10px] tracking-widest opacity-40">Nenhuma barraca cadastrada</TableCell></TableRow>
                  ) : (
                    suppliers.map((s) => (
                      <TableRow key={s.id} className="border-primary/5 hover:bg-primary/5 transition-all">
                        <TableCell className="font-black text-primary py-6 pl-8 uppercase text-sm">
                          {s.name}
                          <p className="text-[9px] text-muted-foreground font-bold">{s.responsibleName || 'Sem responsável'}</p>
                        </TableCell>
                        <TableCell className="font-black text-primary">R$ {formatCurrency(s.totalActualRevenue || 0)}</TableCell>
                        <TableCell className="font-bold text-secondary">R$ {formatCurrency(s.totalActualCost || 0)}</TableCell>
                        <TableCell className="font-black text-green-600">R$ {formatCurrency(s.totalActualProfit || 0)}</TableCell>
                        <TableCell className="text-right pr-8">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => { setCurrentSupplier(s); setShowSupplierForm(true); }} className="h-10 w-10 rounded-xl text-primary/40 hover:text-primary hover:bg-primary/10">
                              <Edit3 className="h-4 w-4" />
                            </Button>
                            {event?.status !== 'finalizado' && (
                              <Button variant="ghost" size="icon" onClick={() => deleteSupplier(s.id)} className="h-10 w-10 rounded-xl text-destructive/40 hover:text-destructive hover:bg-destructive/10">
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
          </TabsContent>

          <TabsContent value="products" className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-primary uppercase tracking-tight">Gestão do Cardápio</h3>
              {event?.status !== 'finalizado' && (
                <Button onClick={() => { setCurrentProduct({ type: 'own', active: true }); setShowProductForm(true); }} className="rounded-xl h-12 font-black uppercase text-[10px] tracking-widest">
                  <Plus className="mr-2 h-4 w-4" /> Novo Produto
                </Button>
              )}
            </div>

            {showProductForm && (
              <Card className="border-none shadow-2xl rounded-[2rem] bg-card animate-in fade-in slide-in-from-top-4 duration-300">
                <CardHeader className="bg-primary/5 p-8 pb-4">
                  <CardTitle className="text-lg font-black uppercase text-primary">Detalhes do Produto</CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label className="font-black uppercase text-[10px] ml-1">Nome do Produto</Label>
                      <Input 
                        placeholder="Ex: Pastel de Carne"
                        className="h-14 rounded-2xl border-primary/10 font-bold bg-muted/20 px-6"
                        value={currentProduct.name || ''} 
                        onChange={(e) => setCurrentProduct({ ...currentProduct, name: e.target.value })} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-black uppercase text-[10px] ml-1">Preço de Venda (R$)</Label>
                      <Input 
                        type="number"
                        placeholder="10,00"
                        className="h-14 rounded-2xl border-primary/10 font-bold bg-muted/20 px-6"
                        value={currentProduct.price || ''} 
                        onChange={(e) => setCurrentProduct({ ...currentProduct, price: parseFloat(e.target.value) })} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-black uppercase text-[10px] ml-1">Origem</Label>
                      <Select value={currentProduct.type} onValueChange={(v: any) => setCurrentProduct({ ...currentProduct, type: v })}>
                        <SelectTrigger className="h-14 rounded-2xl border-primary/10 font-bold bg-muted/20 px-6">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl">
                          <SelectItem value="own" className="font-black uppercase text-xs">Próprio</SelectItem>
                          <SelectItem value="supplier" className="font-black uppercase text-xs">Fornecedor / Barraca</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="font-black uppercase text-[10px] ml-1">Meta de Venda (Un)</Label>
                      <Input 
                        type="number"
                        placeholder="300"
                        className="h-14 rounded-2xl border-primary/10 font-bold bg-muted/20 px-6"
                        value={currentProduct.plannedQuantity || ''} 
                        onChange={(e) => setCurrentProduct({ ...currentProduct, plannedQuantity: parseInt(e.target.value) })} 
                      />
                    </div>

                    {currentProduct.type === 'supplier' && (
                      <>
                        <div className="space-y-2">
                          <Label className="font-black uppercase text-[10px] ml-1">Vincular Barraca</Label>
                          <Select value={currentProduct.supplierId} onValueChange={(v) => setCurrentProduct({ ...currentProduct, supplierId: v })}>
                            <SelectTrigger className="h-14 rounded-2xl border-primary/10 font-bold bg-muted/20 px-6">
                              <SelectValue placeholder="Selecione a barraca" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl">
                              {suppliers.map(s => (
                                <SelectItem key={s.id} value={s.id} className="font-black uppercase text-xs">{s.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="font-black uppercase text-[10px] ml-1">Custo Repasse (R$)</Label>
                          <Input 
                            type="number"
                            placeholder="7,00"
                            className="h-14 rounded-2xl border-primary/10 font-bold bg-muted/20 px-6"
                            value={currentProduct.supplierUnitCost || ''} 
                            onChange={(e) => setCurrentProduct({ ...currentProduct, supplierUnitCost: parseFloat(e.target.value) })} 
                          />
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button variant="ghost" onClick={() => setShowProductForm(false)} className="rounded-xl font-bold uppercase text-[10px]">Cancelar</Button>
                    <Button onClick={handleSaveProduct} disabled={submitting} className="rounded-xl px-10 h-14 font-black uppercase text-[10px] shadow-xl shadow-primary/20">
                      {submitting ? <Loader2 className="animate-spin h-4 w-4" /> : "Salvar Produto"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="rounded-[2.5rem] border border-primary/5 bg-card shadow-2xl overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="hover:bg-transparent border-primary/5">
                    <TableHead className="font-black uppercase text-[10px] py-6 pl-8">Produto</TableHead>
                    <TableHead className="font-black uppercase text-[10px]">Vendido</TableHead>
                    <TableHead className="font-black uppercase text-[10px]">Faltou (Meta)</TableHead>
                    <TableHead className="font-black uppercase text-[10px]">Arrecadado</TableHead>
                    <TableHead className="text-right font-black uppercase text-[10px] pr-8">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productsLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-20"><Loader2 className="animate-spin h-10 w-10 mx-auto text-primary opacity-20" /></TableCell></TableRow>
                  ) : products.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-20 text-muted-foreground font-black uppercase text-[10px] tracking-widest opacity-40">Nenhum produto cadastrado</TableCell></TableRow>
                  ) : (
                    products.map((p) => {
                      const missed = Math.max(0, (p.plannedQuantity || 0) - (p.soldQuantity || 0));
                      return (
                        <TableRow key={p.id} className="border-primary/5 hover:bg-primary/5 transition-all">
                          <TableCell className="font-black text-primary py-6 pl-8 uppercase text-sm">
                            {p.name}
                            <Badge variant="outline" className="ml-2 text-[7px] border-primary/20 uppercase px-1 h-3">{p.type === 'own' ? 'Prop' : 'Fornec'}</Badge>
                          </TableCell>
                          <TableCell className="font-black text-xl tracking-tighter">{p.soldQuantity || 0} un</TableCell>
                          <TableCell className={cn("font-bold text-xs", missed > 0 ? "text-secondary" : "text-green-600")}>
                            {missed > 0 ? `${missed} pendentes` : 'Meta batida!'}
                          </TableCell>
                          <TableCell className="font-black text-primary text-base">R$ {formatCurrency((p.soldQuantity || 0) * p.price)}</TableCell>
                          <TableCell className="text-right pr-8">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => { setCurrentProduct(p); setShowProductForm(true); }} className="h-10 w-10 rounded-xl text-primary/40 hover:text-primary hover:bg-primary/10">
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              {event?.status !== 'finalizado' && (
                                <Button variant="ghost" size="icon" onClick={() => deleteProduct(p.id)} className="h-10 w-10 rounded-xl text-destructive/40 hover:text-destructive hover:bg-destructive/10">
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
          </TabsContent>

          <TabsContent value="team" className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-primary uppercase tracking-tight">Equipe Vinculada</h3>
            </div>

            <div className="rounded-[2.5rem] border border-primary/5 bg-card shadow-2xl overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="hover:bg-transparent border-primary/5">
                    <TableHead className="font-black uppercase text-[10px] py-6 pl-8">Operador</TableHead>
                    <TableHead className="font-black uppercase text-[10px]">Acesso</TableHead>
                    <TableHead className="font-black uppercase text-[10px]">Vínculo</TableHead>
                    <TableHead className="text-right font-black uppercase text-[10px] pr-8">Ação</TableHead>
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
                        <TableCell className="font-bold text-muted-foreground text-xs">{info.email}</TableCell>
                        <TableCell>
                          {isLinked ? (
                            <Badge className="bg-green-500 font-black uppercase text-[8px] tracking-widest px-2">Ativo no Evento</Badge>
                          ) : (
                            <Badge variant="outline" className="font-black uppercase text-[8px] tracking-widest px-2 opacity-40">Sem acesso</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right pr-8">
                          {event?.status !== 'finalizado' && (
                            <Button 
                              variant={isLinked ? "ghost" : "default"} 
                              size="sm" 
                              onClick={() => toggleMemberInEvent(uid, info)}
                              className={cn("font-black uppercase text-[9px] rounded-lg h-10 px-4", isLinked ? "text-destructive hover:bg-destructive/5" : "shadow-lg shadow-primary/10")}
                            >
                              {isLinked ? <><UserMinus className="mr-1.5 h-3 w-3" /> Remover</> : <><UserPlus className="mr-1.5 h-3 w-3" /> Vincular</>}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
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
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{title}</CardTitle>
        <div className={cn("p-2 rounded-lg bg-muted", color)}>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-black tracking-tighter", color)}>{value}</div>
        {description && <p className="text-[9px] font-bold text-muted-foreground mt-1 uppercase">{description}</p>}
      </CardContent>
    </Card>
  );
}
