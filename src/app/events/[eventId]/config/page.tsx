
"use client";

import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/use-auth-context';
import { useState, useEffect, use } from 'react';
import { collection, query, orderBy, addDoc, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2, Edit3, Trash2, Store, Package, Users, ChevronLeft, UserPlus, UserMinus, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Supplier {
  id: string;
  name: string;
  responsibleName?: string;
  phone?: string;
  notes?: string;
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
}

export default function EventConfigPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = use(params);
  const { tenantId, role, tenantMembers } = useAuth();
  const db = useFirestore();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("suppliers");

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
        await addDoc(colRef, { ...currentSupplier });
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

  const toggleMemberInEvent = async (userId: string, memberInfo: any) => {
    if (!tenantId || !event) return;
    const currentMembers = event.members || {};
    const newMembers = { ...currentMembers };

    if (newMembers[userId]) {
      delete newMembers[userId];
      toast({ title: "Acesso Removido", description: "O caixa não verá mais este evento." });
    } else {
      newMembers[userId] = {
        role: memberInfo.role || 'cashier',
        name: memberInfo.name || 'Operador',
        email: memberInfo.email || ''
      };
      toast({ title: "Acesso Concedido", description: "O caixa agora pode operar neste evento." });
    }

    await updateDoc(eventRef!, { members: newMembers });
  };

  const deleteSupplier = async (id: string) => {
    if (!confirm("Excluir este fornecedor?")) return;
    try {
      await deleteDoc(doc(db, 'tenants', tenantId!, 'events', eventId, 'suppliers', id));
      toast({ title: "Removido" });
    } catch (e) {
      toast({ title: "Erro", variant: "destructive" });
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("Excluir este produto do evento?")) return;
    try {
      await deleteDoc(doc(db, 'tenants', tenantId!, 'events', eventId, 'products', id));
      toast({ title: "Removido" });
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
              <p className="text-muted-foreground font-medium italic text-sm">Configuração de barracas, cardápio e equipe do evento.</p>
            </div>
          </div>
          <Badge className="h-10 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest bg-primary/10 text-primary border-none">
            {event?.status}
          </Badge>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="bg-muted/50 p-1.5 rounded-[1.5rem] h-16 w-full lg:w-auto grid grid-cols-3 gap-2">
            <TabsTrigger value="suppliers" className="rounded-2xl font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-xl transition-all h-full">
              <Store className="mr-2 h-4 w-4" /> Barracas
            </TabsTrigger>
            <TabsTrigger value="products" className="rounded-2xl font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-xl transition-all h-full">
              <Package className="mr-2 h-4 w-4" /> Cardápio
            </TabsTrigger>
            <TabsTrigger value="team" className="rounded-2xl font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-xl transition-all h-full">
              <Users className="mr-2 h-4 w-4" /> Equipe
            </TabsTrigger>
          </TabsList>

          <TabsContent value="suppliers" className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-primary uppercase tracking-tight">Fornecedores & Barracas</h3>
              <Button onClick={() => { setCurrentSupplier({}); setShowSupplierForm(true); }} className="rounded-xl h-12 font-black uppercase text-[10px] tracking-widest">
                <Plus className="mr-2 h-4 w-4" /> Nova Barraca
              </Button>
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
                    <TableHead className="font-black uppercase text-[10px]">Responsável</TableHead>
                    <TableHead className="font-black uppercase text-[10px]">Telefone</TableHead>
                    <TableHead className="text-right font-black uppercase text-[10px] pr-8">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliersLoading ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-20"><Loader2 className="animate-spin h-10 w-10 mx-auto text-primary opacity-20" /></TableCell></TableRow>
                  ) : suppliers.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-20 text-muted-foreground font-black uppercase text-[10px] tracking-widest opacity-40">Nenhum fornecedor cadastrado</TableCell></TableRow>
                  ) : (
                    suppliers.map((s) => (
                      <TableRow key={s.id} className="border-primary/5 hover:bg-primary/5 transition-all">
                        <TableCell className="font-black text-primary py-6 pl-8 uppercase text-sm">{s.name}</TableCell>
                        <TableCell className="font-bold text-muted-foreground text-xs">{s.responsibleName || '---'}</TableCell>
                        <TableCell className="font-bold text-muted-foreground text-xs">{s.phone || '---'}</TableCell>
                        <TableCell className="text-right pr-8">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => { setCurrentSupplier(s); setShowSupplierForm(true); }} className="h-10 w-10 rounded-xl text-primary/40 hover:text-primary hover:bg-primary/10">
                              <Edit3 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteSupplier(s.id)} className="h-10 w-10 rounded-xl text-destructive/40 hover:text-destructive hover:bg-destructive/10">
                              <Trash2 className="h-4 w-4" />
                            </Button>
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
              <h3 className="text-xl font-black text-primary uppercase tracking-tight">Cardápio do Evento</h3>
              <Button onClick={() => { setCurrentProduct({ type: 'own', active: true }); setShowProductForm(true); }} className="rounded-xl h-12 font-black uppercase text-[10px] tracking-widest">
                <Plus className="mr-2 h-4 w-4" /> Novo Produto
              </Button>
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
                        placeholder="10.00"
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
                          <Label className="font-black uppercase text-[10px] ml-1">Custo Unitário (R$)</Label>
                          <Input 
                            type="number"
                            placeholder="7.00"
                            className="h-14 rounded-2xl border-primary/10 font-bold bg-muted/20 px-6"
                            value={currentProduct.supplierUnitCost || ''} 
                            onChange={(e) => setCurrentProduct({ ...currentProduct, supplierUnitCost: parseFloat(e.target.value) })} 
                          />
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
                    <TableHead className="font-black uppercase text-[10px]">Origem</TableHead>
                    <TableHead className="font-black uppercase text-[10px]">Barraca</TableHead>
                    <TableHead className="font-black uppercase text-[10px]">Preço</TableHead>
                    <TableHead className="text-right font-black uppercase text-[10px] pr-8">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productsLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-20"><Loader2 className="animate-spin h-10 w-10 mx-auto text-primary opacity-20" /></TableCell></TableRow>
                  ) : products.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-20 text-muted-foreground font-black uppercase text-[10px] tracking-widest opacity-40">Nenhum produto cadastrado para este evento</TableCell></TableRow>
                  ) : (
                    products.map((p) => (
                      <TableRow key={p.id} className="border-primary/5 hover:bg-primary/5 transition-all">
                        <TableCell className="font-black text-primary py-6 pl-8 uppercase text-sm">{p.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-black uppercase text-[8px] tracking-widest px-2 py-0.5 border-primary/20 text-primary/60">
                            {p.type === 'own' ? 'Próprio' : 'Terceiro'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-bold text-muted-foreground text-xs">
                          {p.supplierId ? suppliers.find(s => s.id === p.supplierId)?.name || 'Desconhecido' : '---'}
                        </TableCell>
                        <TableCell className="font-black text-primary text-base tracking-tighter">R$ {p.price.toFixed(2)}</TableCell>
                        <TableCell className="text-right pr-8">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => { setCurrentProduct(p); setShowProductForm(true); }} className="h-10 w-10 rounded-xl text-primary/40 hover:text-primary hover:bg-primary/10">
                              <Edit3 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteProduct(p.id)} className="h-10 w-10 rounded-xl text-destructive/40 hover:text-destructive hover:bg-destructive/10">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="team" className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-primary uppercase tracking-tight">Equipe Vinculada</h3>
              <p className="text-xs text-muted-foreground font-medium italic">Selecione quais operadores podem trabalhar neste evento.</p>
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
                          <Button 
                            variant={isLinked ? "ghost" : "default"} 
                            size="sm" 
                            onClick={() => toggleMemberInEvent(uid, info)}
                            className={cn("font-black uppercase text-[9px] rounded-lg h-10 px-4", isLinked ? "text-destructive hover:bg-destructive/5" : "shadow-lg shadow-primary/10")}
                          >
                            {isLinked ? <><UserMinus className="mr-1.5 h-3 w-3" /> Remover</> : <><UserPlus className="mr-1.5 h-3 w-3" /> Vincular</>}
                          </Button>
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
