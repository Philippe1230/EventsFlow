
"use client";

import { AppShell, JuninaFlagsIcon } from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/use-auth-context';
import { useState } from 'react';
import { collection, doc, getDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ShoppingCart, Trash2, Printer, CreditCard, Banknote, QrCode, RefreshCcw, Loader2, Plus, Minus } from 'lucide-react';
import { PrintTickets } from '@/components/pdv/PrintTickets';
import { SuccessModal } from '@/components/pdv/SuccessModal';
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

export default function PDVPage() {
  const { tenantId, user, tenantMembers, loading: authLoading } = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'dinheiro' | 'cartao' | 'pix'>('dinheiro');
  const [printableTickets, setPrintableTickets] = useState<any[]>([]);
  const [lastOrderNumber, setLastOrderNumber] = useState<number | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const productsQuery = useMemoFirebase(() => {
    if (!tenantId || authLoading) return null;
    return collection(db, 'tenants', tenantId, 'products');
  }, [tenantId, authLoading, db]);

  const { data: rawProducts, isLoading: productsLoading } = useCollection<Product>(productsQuery);
  const products = rawProducts?.filter(p => p.active !== false).sort((a, b) => a.name.localeCompare(b.name)) || [];

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
    if (cart.length === 0) return;
    if (!tenantId || !user || !tenantMembers) return;

    setSubmitting(true);

    try {
      const counterRef = doc(db, 'tenant_counters', tenantId);
      const counterSnap = await getDoc(counterRef);
      let nextNumber = 1;
      
      if (counterSnap.exists()) {
        nextNumber = (counterSnap.data()?.orderNumber || 0) + 1;
      }
      
      setDocumentNonBlocking(counterRef, { orderNumber: nextNumber }, { merge: true });

      const orderData = {
        tenantId,
        userId: user.uid,
        orderNumber: nextNumber,
        total,
        paymentMethod,
        tenantMembers,
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
        setLastOrderNumber(nextNumber);
        setShowSuccessModal(true);
        
        setTimeout(() => {
          window.print();
          localStorage.setItem(`last_order_${tenantId}`, JSON.stringify(cart));
          clearCart();
          setSubmitting(false);
          setPrintableTickets([]);
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

    } catch (e: any) {
      console.error(e);
      setSubmitting(false);
    }
  };

  const repeatLastOrder = () => {
    const last = localStorage.getItem(`last_order_${tenantId}`);
    if (last) {
      setCart(JSON.parse(last));
      toast({ title: 'Carrinho Restaurado' });
    }
  };

  return (
    <AppShell>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)]">
        <div className="lg:col-span-8 flex flex-col gap-4 overflow-hidden">
          <div className="flex justify-between items-center bg-card p-3 rounded-2xl border border-primary/10 shadow-sm">
            <h2 className="text-lg font-black text-primary uppercase flex items-center gap-2">
              <Plus className="h-5 w-5" /> Selecionar Produtos
            </h2>
            <Button variant="outline" size="sm" onClick={repeatLastOrder} className="font-bold text-xs uppercase h-8 border-primary/20 hover:bg-primary/5 rounded-xl">
              <RefreshCcw className="mr-1 h-3 w-3" /> Repetir Último
            </Button>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {productsLoading || authLoading ? (
              <div className="flex flex-col items-center justify-center h-full gap-6">
                <div className="flex gap-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-8 h-12 bg-primary/20 rounded-b-xl animate-bounce" style={{ animationDelay: `${i * 0.1}s` }} />
                  ))}
                </div>
                <p className="font-black uppercase text-[10px] animate-pulse tracking-[0.3em] text-primary">Sincronizando Cardápio</p>
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center bg-card rounded-[2rem] border-2 border-dashed border-primary/10 p-12">
                <JuninaFlagsIcon className="h-16 w-16 text-primary/20 mb-6" />
                <p className="text-muted-foreground font-black uppercase text-sm tracking-widest">Cardápio Vazio</p>
                <Button variant="link" asChild className="mt-4 font-black uppercase text-xs text-primary"><a href="/products">Cadastrar Produtos</a></Button>
              </div>
            ) : (
              <div className="pdv-grid pb-4">
                {products.map(p => (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className="flex flex-col items-center justify-center p-4 bg-card border-2 border-primary/10 hover:border-primary hover:bg-primary/5 rounded-3xl shadow-sm transition-all active:scale-95 group relative overflow-hidden h-36"
                  >
                    <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Plus className="h-5 w-5 text-primary" />
                    </div>
                    <span className="font-black text-sm leading-tight uppercase line-clamp-2 mb-3 px-2 text-center">{p.name}</span>
                    <span className="bg-primary text-white px-4 py-1.5 rounded-full text-[10px] font-black shadow-lg">
                      R$ {p.price.toFixed(2)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 h-full overflow-hidden">
          <Card className="flex flex-col h-full shadow-2xl border-none overflow-hidden rounded-[2.5rem] bg-card">
            <CardHeader className="bg-primary text-white py-6 shrink-0 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-20">
                 <JuninaFlagsIcon className="h-20 w-20 rotate-12" />
              </div>
              <CardTitle className="flex items-center justify-between text-base uppercase font-black relative z-10">
                <div className="flex items-center gap-3">
                  <ShoppingCart className="h-6 w-6" /> Carrinho
                </div>
                {cart.length > 0 && (
                  <span className="bg-white text-primary px-3 py-1 rounded-full text-[10px] font-black shadow-lg">
                    {cart.reduce((a, b) => a + b.quantity, 0)} ITENS
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-0 overflow-hidden bg-muted/10">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full opacity-10">
                    <JuninaFlagsIcon className="h-24 w-24 text-primary mb-6" />
                    <p className="text-center font-black uppercase text-xs tracking-widest">Esperando Pedidos</p>
                  </div>
                ) : (
                  cart.map(item => (
                    <div key={item.id} className="flex flex-col bg-card border border-primary/5 p-4 rounded-2xl shadow-sm hover:border-primary/20 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <span className="font-black uppercase text-xs leading-tight flex-1 pr-2">{item.name}</span>
                        <span className="font-black text-primary text-sm whitespace-nowrap">R$ {(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center bg-muted/50 rounded-xl p-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => updateQuantity(item.id, -1)}>
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-10 text-center font-black text-sm">{item.quantity}</span>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => updateQuantity(item.id, 1)}>
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive/40 hover:text-destructive hover:bg-destructive/5 rounded-xl" onClick={() => removeFromCart(item.id)}>
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="bg-card border-t border-primary/5 p-6 space-y-6 shadow-[0_-10px_30px_rgba(0,0,0,0.03)]">
                <div className="flex justify-between items-end px-2">
                  <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Total Geral</span>
                  <span className="text-4xl font-black text-primary tracking-tighter">R$ {total.toFixed(2)}</span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <PaymentButton 
                    active={paymentMethod === 'dinheiro'} 
                    onClick={() => setPaymentMethod('dinheiro')}
                    icon={<Banknote className="h-6 w-6" />}
                    label="Dinheiro"
                  />
                  <PaymentButton 
                    active={paymentMethod === 'pix'} 
                    onClick={() => setPaymentMethod('pix')}
                    icon={<QrCode className="h-6 w-6" />}
                    label="Pix"
                  />
                  <PaymentButton 
                    active={paymentMethod === 'cartao'} 
                    onClick={() => setPaymentMethod('cartao')}
                    icon={<CreditCard className="h-6 w-6" />}
                    label="Cartão"
                  />
                </div>

                <Button 
                  className="w-full h-20 text-2xl font-black uppercase shadow-2xl shadow-primary/30 rounded-[1.5rem] hover:scale-[1.02] active:scale-95 transition-all" 
                  size="lg"
                  disabled={cart.length === 0 || submitting}
                  onClick={finalizeOrder}
                >
                  {submitting ? <Loader2 className="animate-spin h-8 w-8" /> : <><Printer className="mr-3 h-8 w-8" /> Finalizar</>}
                </Button>
                
                {cart.length > 0 && (
                  <button className="w-full text-[10px] font-black uppercase text-muted-foreground/40 hover:text-destructive transition-colors tracking-widest" onClick={clearCart}>
                    Limpar Tudo
                  </button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <PrintTickets tickets={printableTickets} />
      <SuccessModal 
        isOpen={showSuccessModal} 
        onClose={() => setShowSuccessModal(false)} 
        orderNumber={lastOrderNumber || 0} 
      />
    </AppShell>
  );
}

function PaymentButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <Button 
      variant={active ? 'default' : 'outline'} 
      className={`flex flex-col h-20 gap-2 border-2 transition-all rounded-2xl ${active ? 'border-primary shadow-lg scale-105' : 'border-primary/5 opacity-50'}`}
      onClick={onClick}
    >
      {icon}
      <span className="text-[9px] font-black uppercase tracking-widest leading-none">{label}</span>
    </Button>
  );
}
