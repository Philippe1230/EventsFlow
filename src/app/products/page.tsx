"use client";

import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/use-auth-context';
import { useState, useEffect } from 'react';
import { collection, query, addDoc, doc, orderBy, onSnapshot } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Pencil, Trash2, PlusCircle, Loader2, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { cn } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  active: boolean;
}

export default function ProductsPage() {
  const { tenantId, loading: authLoading } = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Partial<Product>>({ name: '', price: 0, category: 'Geral', active: true });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!tenantId || authLoading) return;

    setLoading(true);
    const q = query(collection(db, 'tenants', tenantId, 'products'), orderBy('name'));
    
    const unsubscribe = onSnapshot(q, (snap) => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
      setLoading(false);
    }, (error) => {
      console.error("Erro ao ouvir produtos:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [tenantId, authLoading, db]);

  const handleSave = async () => {
    if (!currentProduct.name || !currentProduct.price || !tenantId) {
      toast({ title: 'Atenção', description: 'Preencha os campos obrigatórios.', variant: 'destructive' });
      return;
    }

    try {
      if (isEditing && currentProduct.id) {
        const productRef = doc(db, 'tenants', tenantId, 'products', currentProduct.id);
        updateDocumentNonBlocking(productRef, currentProduct);
      } else {
        await addDoc(collection(db, 'tenants', tenantId, 'products'), {
          ...currentProduct,
          tenantId,
          active: true,
          createdAt: new Date()
        });
      }
      setIsDialogOpen(false);
      toast({ title: 'Sucesso!', description: 'Cardápio atualizado.' });
    } catch (e) {
      toast({ title: 'Erro', description: 'Não foi possível salvar.', variant: 'destructive' });
    }
  };

  const toggleStatus = (product: Product) => {
    if (!tenantId) return;
    const productRef = doc(db, 'tenants', tenantId, 'products', product.id);
    updateDocumentNonBlocking(productRef, { active: !product.active });
    toast({ 
      title: product.active ? 'Produto Ocultado' : 'Produto Visível', 
      description: `${product.name} foi ${product.active ? 'desativado' : 'ativado'} nos caixas.` 
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Deseja excluir este produto permanentemente?') && tenantId) {
      const productRef = doc(db, 'tenants', tenantId, 'products', id);
      deleteDocumentNonBlocking(productRef);
      toast({ title: 'Produto Removido' });
    }
  };

  const openDialog = (product?: Product) => {
    if (product) {
      setCurrentProduct(product);
      setIsEditing(true);
    } else {
      setCurrentProduct({ name: '', price: 0, category: 'Geral', active: true });
      setIsEditing(false);
    }
    setIsDialogOpen(true);
  };

  return (
    <AppShell>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 max-w-6xl mx-auto">
        <div>
          <h2 className="text-3xl font-black text-primary uppercase tracking-tighter">Cardápio do Evento</h2>
          <p className="text-muted-foreground font-medium italic">Gerencie os produtos disponíveis para venda.</p>
        </div>
        <Button onClick={() => openDialog()} className="w-full md:w-auto font-black uppercase rounded-2xl h-14 px-8 shadow-xl shadow-primary/20 transition-all hover:scale-[1.05] active:scale-95">
          <PlusCircle className="mr-2 h-6 w-6" /> Novo Produto
        </Button>
      </div>

      <div className="rounded-[2.5rem] border border-primary/5 bg-card shadow-2xl overflow-hidden max-w-6xl mx-auto">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent border-primary/5">
                <TableHead className="font-black uppercase text-[10px] py-6 pl-8">Produto</TableHead>
                <TableHead className="font-black uppercase text-[10px]">Categoria</TableHead>
                <TableHead className="font-black uppercase text-[10px]">Preço</TableHead>
                <TableHead className="font-black uppercase text-[10px] text-center">Status</TableHead>
                <TableHead className="text-right font-black uppercase text-[10px] pr-8">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-24">
                    <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary opacity-20" />
                  </TableCell>
                </TableRow>
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-24">
                    <Package className="h-16 w-16 mx-auto mb-4 text-primary/10" />
                    <p className="font-black uppercase text-xs text-muted-foreground tracking-widest">Nenhum produto cadastrado</p>
                  </TableCell>
                </TableRow>
              ) : (
                products.map((p) => (
                  <TableRow key={p.id} className={cn("border-primary/5 transition-all group", !p.active && "opacity-50")}>
                    <TableCell className="py-6 pl-8">
                      <div className="flex flex-col">
                        <span className="font-black text-primary uppercase text-sm tracking-tight group-hover:translate-x-1 transition-transform">{p.name}</span>
                        <span className="text-[9px] font-bold text-muted-foreground tracking-[0.2em] uppercase">Ref: {p.id.substring(0, 5)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-black uppercase text-[9px] bg-primary/5 text-primary border-none px-3">
                        {p.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-black text-lg text-primary tracking-tighter">
                      R$ {p.price.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-3">
                        <span className={cn("text-[10px] font-black uppercase hidden sm:block", p.active ? "text-green-600" : "text-muted-foreground")}>
                          {p.active ? 'Ativo' : 'Pausado'}
                        </span>
                        <Switch 
                          checked={p.active} 
                          onCheckedChange={() => toggleStatus(p)}
                          className="data-[state=checked]:bg-green-500"
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => openDialog(p)}
                          className="h-10 w-10 rounded-xl text-primary/40 hover:text-primary hover:bg-primary/10 transition-all hover:scale-110"
                        >
                          <Pencil className="h-5 w-5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDelete(p.id)}
                          className="h-10 w-10 rounded-xl text-destructive/40 hover:text-destructive hover:bg-destructive/10 transition-all hover:scale-110"
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="rounded-[2.5rem] border-none shadow-3xl p-0 overflow-hidden sm:max-w-md w-[95vw] sm:w-full">
          <DialogHeader className="bg-primary p-8 text-white">
            <DialogTitle className="text-3xl font-black uppercase tracking-tighter italic">
              {isEditing ? 'Editar Item' : 'Novo Produto'}
            </DialogTitle>
            <DialogDescription className="text-white/70 font-bold uppercase text-[10px] tracking-widest">
              Ajuste os detalhes do produto
            </DialogDescription>
          </DialogHeader>
          <div className="p-8 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="font-black uppercase text-[10px] ml-1 tracking-widest text-muted-foreground">Nome Comercial</Label>
              <Input 
                id="name" 
                placeholder="Ex: Cerveja Lata 350ml"
                className="h-14 rounded-2xl border-primary/10 font-bold bg-muted/20 px-6"
                value={currentProduct.name} 
                onChange={(e) => setCurrentProduct({ ...currentProduct, name: e.target.value })} 
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="price" className="font-black uppercase text-[10px] ml-1 tracking-widest text-muted-foreground">Preço (R$)</Label>
                <Input 
                  id="price" 
                  type="number" 
                  step="0.5" 
                  className="h-14 rounded-2xl border-primary/10 font-bold bg-muted/20 px-6"
                  value={currentProduct.price} 
                  onChange={(e) => setCurrentProduct({ ...currentProduct, price: parseFloat(e.target.value) })} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category" className="font-black uppercase text-[10px] ml-1 tracking-widest text-muted-foreground">Categoria</Label>
                <Select value={currentProduct.category} onValueChange={(v) => setCurrentProduct({ ...currentProduct, category: v })}>
                  <SelectTrigger className="h-14 rounded-2xl border-primary/10 font-bold bg-muted/20 px-6">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-none shadow-2xl">
                    <SelectItem value="Geral" className="font-bold uppercase text-xs">Geral</SelectItem>
                    <SelectItem value="Alimentação" className="font-bold uppercase text-xs">Alimentação</SelectItem>
                    <SelectItem value="Bebidas" className="font-bold uppercase text-xs">Bebidas</SelectItem>
                    <SelectItem value="Outros" className="font-bold uppercase text-xs">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="bg-muted/30 p-8 pt-4">
            <Button onClick={handleSave} className="w-full h-16 font-black uppercase text-xl rounded-2xl shadow-2xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95">
              Confirmar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}