
"use client";

import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/use-auth-context';
import { useState, useEffect } from 'react';
import { collection, query, getDocs, addDoc, updateDoc, doc, orderBy, onSnapshot } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Pencil, Trash2, PlusCircle, Loader2, Package, Power } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';

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
      toast({ title: 'Sucesso!', description: 'Produto atualizado no cardápio.' });
    } catch (e) {
      toast({ title: 'Erro', description: 'Não foi possível salvar.', variant: 'destructive' });
    }
  };

  const toggleStatus = (product: Product) => {
    if (!tenantId) return;
    const productRef = doc(db, 'tenants', tenantId, 'products', product.id);
    updateDocumentNonBlocking(productRef, { active: !product.active });
    toast({ 
      title: product.active ? 'Produto Desativado' : 'Produto Ativado', 
      description: `${product.name} foi ${product.active ? 'removido' : 'adicionado'} aos caixas.` 
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Deseja excluir este produto permanentemente?') && tenantId) {
      const productRef = doc(db, 'tenants', tenantId, 'products', id);
      deleteDocumentNonBlocking(productRef);
      toast({ title: 'Produto Excluído' });
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-black text-primary uppercase">Cardápio do Evento</h2>
          <p className="text-muted-foreground font-medium italic">Gerencie o que está disponível para venda nos caixas.</p>
        </div>
        <Button onClick={() => openDialog()} className="font-black uppercase rounded-xl h-12 px-6 shadow-lg shadow-primary/20">
          <PlusCircle className="mr-2 h-5 w-5" /> Novo Produto
        </Button>
      </div>

      <div className="rounded-[2rem] border border-primary/5 bg-card shadow-xl overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-transparent border-primary/5">
              <TableHead className="font-black uppercase text-[10px] py-6 pl-8">Produto</TableHead>
              <TableHead className="font-black uppercase text-[10px]">Categoria</TableHead>
              <TableHead className="font-black uppercase text-[10px]">Preço</TableHead>
              <TableHead className="font-black uppercase text-[10px] text-center">Disponibilidade</TableHead>
              <TableHead className="text-right font-black uppercase text-[10px] pr-8">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-20">
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <span className="font-black uppercase text-[10px] tracking-widest text-primary/40">Sincronizando Cardápio...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-20 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2 opacity-20">
                    <Package className="h-16 w-16 mb-2" />
                    <span className="font-black uppercase text-sm">Nenhum produto cadastrado</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              products.map((p) => (
                <TableRow key={p.id} className={cn("border-primary/5 transition-all group", !p.active && "opacity-50 grayscale-[0.5]")}>
                  <TableCell className="py-6 pl-8">
                    <div className="flex flex-col">
                      <span className="font-black text-primary uppercase text-sm tracking-tight">{p.name}</span>
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">ID: {p.id.substring(0, 6)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-black uppercase text-[9px] bg-primary/5 text-primary border-none">
                      {p.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-black text-lg text-primary tracking-tighter">
                    R$ {p.price.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-3">
                      <span className={cn("text-[10px] font-black uppercase tracking-tighter", p.active ? "text-green-600" : "text-muted-foreground")}>
                        {p.active ? 'Ativo' : 'Inativo'}
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
                        className="h-10 w-10 rounded-xl text-primary/40 hover:text-primary hover:bg-primary/10"
                      >
                        <Pencil className="h-5 w-5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDelete(p.id)}
                        className="h-10 w-10 rounded-xl text-destructive/40 hover:text-destructive hover:bg-destructive/10"
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden">
          <DialogHeader className="bg-primary p-8 text-white">
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter italic">
              {isEditing ? 'Editar Item' : 'Novo Item'}
            </DialogTitle>
            <DialogDescription className="text-white/70 font-bold uppercase text-[10px] tracking-widest">
              Configure as informações do produto
            </DialogDescription>
          </DialogHeader>
          <div className="p-8 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="font-black uppercase text-[10px] ml-1">Nome do Produto</Label>
              <Input 
                id="name" 
                placeholder="Ex: Cerveja Lata"
                className="h-12 rounded-xl border-primary/10 font-bold"
                value={currentProduct.name} 
                onChange={(e) => setCurrentProduct({ ...currentProduct, name: e.target.value })} 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price" className="font-black uppercase text-[10px] ml-1">Preço (R$)</Label>
                <Input 
                  id="price" 
                  type="number" 
                  step="0.5" 
                  className="h-12 rounded-xl border-primary/10 font-bold"
                  value={currentProduct.price} 
                  onChange={(e) => setCurrentProduct({ ...currentProduct, price: parseFloat(e.target.value) })} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category" className="font-black uppercase text-[10px] ml-1">Categoria</Label>
                <Select value={currentProduct.category} onValueChange={(v) => setCurrentProduct({ ...currentProduct, category: v })}>
                  <SelectTrigger className="h-12 rounded-xl border-primary/10 font-bold">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
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
            <Button onClick={handleSave} className="w-full h-14 font-black uppercase text-lg rounded-2xl shadow-xl shadow-primary/20">
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
