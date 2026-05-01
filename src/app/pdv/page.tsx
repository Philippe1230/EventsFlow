
"use client";

import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/use-auth-context';
import { useState } from 'react';
import { collection, query, where, doc, getDoc, orderBy, serverTimestamp, addDoc } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ShoppingCart, Trash2, Printer, CreditCard, Banknote, QrCode, RefreshCcw, Loader2, Plus, Minus } from 'lucide-react';
import { PrintTickets } from '@/components/pdv/PrintTickets';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  active: boolean;
}

interface CartItem extends Product {
  quantity: number;
}

const JuninaFlagsIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M2 4c5 0 5 4 10 4s5-4 10-4" />
    <path d="M4 4v7l3-2 3 2V4" />
    <path d="M14 4v7l3-2 3 2V4" />
  </svg>
);

export default function PDVPage() {
  const { tenantId, user, tenantMembers, loading: authLoading } = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'dinheiro' | 'cartao' | 'pix'>('dinheiro');
  const [printableTickets, setPrintableTickets] = useState<any[]>([]);

  const productsQuery = useMemoFirebase(() => {
    if (!tenantId || authLoading) return null;
    return query(
      collection(db, 'tenants', tenantId, 'products'),
      where('active', '==', true),
      orderBy('name')
    );
  }, [tenantId, authLoading, db]);

  const { data: products, isLoading: productsLoading } = useCollection<Product>(productsQuery);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const clearCart = () => setCart([]);

  const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const finalizeOrder = async () => {
    if (cart.length === 0 || !tenantId || !user || !tenantMembers) {
      toast({ title: 'Aviso', description: 'O carrinho está vazio ou você não está logado.' });
      return;
    }
    setSubmitting(true);

    try {
      const counterRef = doc(db, 'tenant_counters', tenantId);
      const counterSnap = await getDoc(counterRef);
      let nextNumber = 1;
      
      if (counterSnap.exists()) {
        nextNumber = (counterSnap.data().orderNumber || 0) + 1;
      }
      
      setDocumentNonBlocking(counterRef, { orderNumber: nextNumber }, { merge: true });

      const orderData = {
        tenantId,
        userId: user.uid,
        orderNumber: nextNumber,
        total,
        paymentMethod,
        tenantMembers, // Denormalização estratégica para regras de segurança
        items: cart.map(i => ({
          productId: i.id,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          subtotal: i.price * i.quantity
        })),
        createdAt: serverTimestamp(),
        status: 'completed'
      };

      const ordersColRef = collection(db, 'tenants', tenantId, 'orders');
      
      addDoc(ordersColRef, orderData).then((orderRef) => {
        const tickets: any[] = [];
        cart.forEach(item => {
          for (let i = 0; i < item.quantity; i++) {
            tickets.push({
              orderId: orderRef.id,
              orderNumber: nextNumber,
              productName: item.name,
              timestamp: new Date()
            });
          }
        });

        setPrintableTickets(tickets);
        
        setTimeout(() => {
          window.print();
          clearCart();
          setPrintableTickets([]);
          toast({ title: 'Pedido Finalizado!', description: `Pedido #${nextNumber} registrado.` });
          localStorage.setItem(`last_order_${tenantId}`, JSON.stringify(cart));
          setSubmitting(false);
        }, 500);
      }).catch((err) => {
        const permissionError = new FirestorePermissionError({
          path: ordersColRef.path,
          operation: 'create',
          requestResourceData: orderData,
        });
        errorEmitter.emit('permission-error', permissionError);
        setSubmitting(false);
      });

    } catch (e) {
      console.error("Erro ao finalizar pedido:", e);
      toast({ title: 'Erro', description: 'Ocorreu um problema ao processar a venda.', variant: 'destructive' });
      setSubmitting(false);
    }
  };

  const repeatLastOrder = () => {
    const last = localStorage.getItem(`last_order_${tenantId}`);
    if (last) {
      setCart(JSON.parse(last));
      toast({ title: 'Carrinho Restaurado', description: 'Itens do último pedido adicionados.' });
    } else {
      toast({ title: 'Aviso', description: 'Nenhum pedido anterior encontrado.' });
    }
  };

  return (
    <AppShell>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)]">
        <div className="lg:col-span-8 flex flex-col gap-4 overflow-hidden">
          <div className="flex justify-between items-center bg-card p-3 rounded-lg border border-primary/10 shadow-sm">
            <h2 className="text-lg font-black text-primary uppercase flex items-center gap-2">
              <Plus className="h-5 w-5" /> Selecionar Produtos
            </h2>
            <Button variant="outline" size="sm" onClick={repeatLastOrder} className="font-bold text-xs uppercase h-8 border-primary/20 hover:bg-primary/5">
              <RefreshCcw className="mr-1 h-3 w-3" /> Repetir Último
            </Button>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {productsLoading || authLoading ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="font-bold uppercase text-xs">Carregando cardápio...</p>
              </div>
            ) : !products || products.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center bg-card rounded-xl border-2 border-dashed border-muted p-8">
                <p className="text-muted-foreground font-bold uppercase">Nenhum produto ativo encontrado.</p>
                <Button variant="link" asChild className="mt-2"><a href="/products">Gerenciar Produtos</a></Button>
              </div>
            ) : (
              <div className="pdv-grid pb-4">
                {products.map(p => (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className="flex flex-col items-center justify-center p-4 bg-card border-2 border-primary/10 hover:border-primary hover:bg-primary/5 rounded-2xl shadow-sm transition-all active:scale-95 group relative overflow-hidden h-32"
                  >
                    <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Plus className="h-4 w-4 text-primary" />
                    </div>
                    <span className="font-black text-sm md:text-base leading-tight uppercase line-clamp-2 mb-2">{p.name}</span>
                    <span className="bg-primary text-white px-3 py-1 rounded-full text-xs font-black shadow-md">
                      R$ {p.price.toFixed(2)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 h-full overflow-hidden">
          <Card className="flex flex-col h-full shadow-xl border-2 border-primary/20 overflow-hidden rounded-2xl">
            <CardHeader className="bg-primary text-white py-4 shrink-0">
              <CardTitle className="flex items-center justify-between text-base uppercase font-black">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" /> Carrinho
                </div>
                {cart.length > 0 && (
                  <span className="bg-white text-primary px-2 py-0.5 rounded text-xs">
                    {cart.reduce((a, b) => a + b.quantity, 0)} ITENS
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-0 overflow-hidden bg-muted/20">
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full opacity-40 grayscale">
                    <JuninaFlagsIcon className="h-16 w-16 text-primary mb-4" />
                    <p className="text-center font-black uppercase text-sm">Aguardando itens...</p>
                  </div>
                ) : (
                  cart.map(item => (
                    <div key={item.id} className="flex flex-col bg-card border border-primary/5 p-3 rounded-xl shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-black uppercase text-xs leading-tight flex-1">{item.name}</span>
                        <span className="font-black text-primary ml-2">R$ {(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center bg-muted rounded-lg p-0.5">
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md" onClick={() => updateQuantity(item.id, -1)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center font-black text-sm">{item.quantity}</span>
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md" onClick={() => updateQuantity(item.id, 1)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/50 hover:text-destructive hover:bg-destructive/5" onClick={() => removeFromCart(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="bg-card border-t-2 border-primary/10 p-4 space-y-4 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
                <div className="flex justify-between items-end">
                  <span className="text-xs font-bold uppercase text-muted-foreground">Valor Total:</span>
                  <span className="text-3xl font-black text-primary leading-none">R$ {total.toFixed(2)}</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <PaymentButton 
                    active={paymentMethod === 'dinheiro'} 
                    onClick={() => setPaymentMethod('dinheiro')}
                    icon={<Banknote className="h-5 w-5" />}
                    label="Dinheiro"
                  />
                  <PaymentButton 
                    active={paymentMethod === 'pix'} 
                    onClick={() => setPaymentMethod('pix')}
                    icon={<QrCode className="h-5 w-5" />}
                    label="Pix"
                  />
                  <PaymentButton 
                    active={paymentMethod === 'cartao'} 
                    onClick={() => setPaymentMethod('cartao')}
                    icon={<CreditCard className="h-5 w-5" />}
                    label="Cartão"
                  />
                </div>

                <Button 
                  className="w-full h-16 text-xl font-black uppercase shadow-lg shadow-primary/20 rounded-xl" 
                  size="lg"
                  disabled={cart.length === 0 || submitting}
                  onClick={finalizeOrder}
                >
                  {submitting ? <Loader2 className="animate-spin" /> : <><Printer className="mr-2 h-6 w-6" /> Finalizar Pedido</>}
                </Button>
                
                {cart.length > 0 && (
                  <Button variant="ghost" className="w-full text-xs font-bold uppercase text-muted-foreground hover:bg-destructive/5 hover:text-destructive" onClick={clearCart}>
                    Limpar Carrinho
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <PrintTickets tickets={printableTickets} />
      
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: hsl(var(--primary) / 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--primary) / 0.4);
        }
      `}</style>
    </AppShell>
  );
}

function PaymentButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <Button 
      variant={active ? 'default' : 'outline'} 
      className={`flex flex-col h-16 gap-1 border-2 transition-all ${active ? 'border-primary shadow-inner' : 'border-primary/10 opacity-70'}`}
      onClick={onClick}
    >
      {icon}
      <span className="text-[9px] font-black uppercase tracking-tight leading-none">{label}</span>
    </Button>
  );
}
