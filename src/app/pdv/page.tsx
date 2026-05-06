"use client";

import { AppShell, OrderTicketIcon } from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/use-auth-context';
import { useState, useEffect } from 'react';
import { collection, doc, getDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ShoppingCart, Trash2, Printer, CreditCard, Banknote, QrCode, RefreshCcw, Loader2, Plus, Minus, ArrowRight } from 'lucide-react';
import { PrintTickets } from '@/components/pdv/PrintTickets';
import { SuccessModal } from '@/components/pdv/SuccessModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { cn } from '@/lib/utils';

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
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  // Troco states
  const [receivedAmount, setReceivedAmount] = useState<string>('');
  const [changeAmount, setChangeAmount] = useState<number>(0);

  useEffect(() => {
    if (tenantId) {
      const savedCart = localStorage.getItem(`current_cart_${tenantId}`);
      if (savedCart) {
        try {
          setCart(JSON.parse(savedCart));
        } catch (e) {
          console.error("Erro ao carregar carrinho salvo", e);
        }
      }
    }
  }, [tenantId]);

  useEffect(() => {
    if (tenantId) {
      localStorage.setItem(`current_cart_${tenantId}`, JSON.stringify(cart));
    }
  }, [cart, tenantId]);

  const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  useEffect(() => {
    const received = parseFloat(receivedAmount.replace(',', '.')) || 0;
    if (received > total) {
      setChangeAmount(received - total);
    } else {
      setChangeAmount(0);
    }
  }, [receivedAmount, total]);

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
    toast({ title: `${product.name} adicionado!`, duration: 1000 });
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

  const clearCart = () => {
    setCart([]);
    if (tenantId) localStorage.removeItem(`current_cart_${tenantId}`);
  };

  const handleOpenPayment = () => {
    if (cart.length > 0) {
      setReceivedAmount('');
      setChangeAmount(0);
      setShowPaymentModal(true);
    }
  };

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
        setShowPaymentModal(false);
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

  const scrollToCart = () => {
    document.getElementById('cart-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <AppShell>
      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 pb-24 lg:pb-0">
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-4">
          <div className="flex justify-between items-center bg-card p-4 rounded-2xl border border-primary/10 shadow-sm sticky top-0 z-10 lg:static">
            <h2 className="text-lg font-black text-primary uppercase flex items-center gap-2">
              <Plus className="h-5 w-5" /> Cardápio
            </h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={repeatLastOrder} className="font-bold text-[10px] uppercase h-10 border-primary/20 hover:bg-primary/5 hover:border-primary/40 rounded-xl lg:flex hidden">
                <RefreshCcw className="mr-1 h-3 w-3" /> Repetir Último
              </Button>
            </div>
          </div>
          
          <div className="flex-1">
            {productsLoading || authLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-6">
                <div className="flex gap-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-8 h-12 bg-primary/20 rounded-b-xl animate-bounce" style={{ animationDelay: `${i * 0.1}s` }} />
                  ))}
                </div>
                <p className="font-black uppercase text-[10px] animate-pulse tracking-[0.3em] text-primary">Carregando...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center bg-card rounded-[2rem] border-2 border-dashed border-primary/10 p-8">
                <OrderTicketIcon className="h-16 w-16 text-primary/20 mb-6" />
                <p className="text-muted-foreground font-black uppercase text-sm tracking-widest">Nenhum produto ativo</p>
              </div>
            ) : (
              <div className="pdv-grid">
                {products.map(p => (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className="flex flex-col items-center justify-center p-4 bg-card border-2 border-primary/10 hover:border-primary hover:bg-primary/5 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 rounded-[2rem] shadow-sm transition-all active:scale-95 group relative overflow-hidden h-40"
                  >
                    <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Plus className="h-6 w-6 text-primary" />
                    </div>
                    <span className="font-black text-sm leading-tight uppercase line-clamp-2 mb-4 px-2 text-center group-hover:text-primary">{p.name}</span>
                    <span className="bg-primary text-white px-5 py-2 rounded-full text-[11px] font-black shadow-lg group-hover:scale-110 transition-transform">
                      R$ {p.price.toFixed(2)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div id="cart-section" className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6 lg:h-[calc(100vh-140px)] lg:sticky lg:top-0">
          <Card className="flex flex-col flex-1 shadow-2xl border-none overflow-hidden rounded-[2.5rem] bg-card hover:shadow-primary/5 transition-shadow">
            <CardHeader className="bg-primary text-white py-4 shrink-0 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-20">
                 <OrderTicketIcon className="h-12 w-12 lg:h-16 lg:w-16 rotate-12" />
              </div>
              <CardTitle className="flex items-center justify-between text-base uppercase font-black relative z-10">
                <div className="flex items-center gap-3">
                  <ShoppingCart className="h-5 w-5" /> Carrinho
                </div>
              </CardTitle>
            </CardHeader>
            
            <CardContent className="flex-1 flex flex-col p-0 overflow-hidden bg-muted/10">
              <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px]">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 opacity-10">
                    <OrderTicketIcon className="h-16 w-16 text-primary mb-6" />
                    <p className="text-center font-black uppercase text-xs tracking-widest">Carrinho Vazio</p>
                  </div>
                ) : (
                  cart.map(item => (
                    <div key={item.id} className="flex flex-col bg-card border border-primary/5 p-3 rounded-2xl shadow-sm hover:border-primary/20 transition-all">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-black uppercase text-[11px] leading-tight flex-1 pr-2">{item.name}</span>
                        <span className="font-black text-primary text-xs whitespace-nowrap">R$ {(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center bg-muted/50 rounded-xl p-0.5">
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10" onClick={() => updateQuantity(item.id, -1)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center font-black text-xs">{item.quantity}</span>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10" onClick={() => updateQuantity(item.id, 1)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/40 hover:text-destructive hover:bg-destructive/5 rounded-xl" onClick={() => removeFromCart(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="bg-card border-t border-primary/5 p-6 space-y-4 shadow-[0_-10px_30px_rgba(0,0,0,0.03)] mt-auto">
                <div className="flex justify-between items-center px-2">
                  <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Total</span>
                  <span className="text-3xl font-black text-primary tracking-tighter">R$ {total.toFixed(2)}</span>
                </div>

                <Button 
                  className="w-full h-16 text-xl font-black uppercase shadow-2xl shadow-primary/30 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all" 
                  size="lg"
                  disabled={cart.length === 0}
                  onClick={handleOpenPayment}
                >
                  <ArrowRight className="mr-2 h-6 w-6" /> Fechar Pedido
                </Button>
                
                {cart.length > 0 && (
                  <button className="w-full text-[9px] font-black uppercase text-muted-foreground/40 hover:text-destructive transition-colors tracking-widest py-1" onClick={clearCart}>
                    Limpar Carrinho
                  </button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {cart.length > 0 && (
        <div className="fixed bottom-6 right-6 lg:hidden z-50">
          <Button 
            onClick={scrollToCart} 
            className="h-16 w-16 rounded-full shadow-2xl animate-bounce flex items-center justify-center p-0 hover:scale-110 active:scale-90"
          >
            <div className="relative">
              <ShoppingCart className="h-8 w-8" />
              <span className="absolute -top-3 -right-3 bg-white text-primary text-[10px] font-black h-7 w-7 rounded-full border-4 border-primary flex items-center justify-center shadow-lg">
                {cart.reduce((a, b) => a + b.quantity, 0)}
              </span>
            </div>
          </Button>
        </div>
      )}

      {/* Modal de Pagamento */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="rounded-[2.5rem] border-none shadow-3xl p-0 overflow-hidden sm:max-w-md w-[95vw]">
          <DialogHeader className="bg-primary p-8 text-white relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
               <Banknote className="h-20 w-20 rotate-12" />
            </div>
            <DialogTitle className="text-3xl font-black uppercase tracking-tighter italic z-10">
              Pagamento
            </DialogTitle>
            <p className="text-white/70 font-black uppercase text-[10px] tracking-widest z-10">
              Escolha como o cliente vai pagar
            </p>
          </DialogHeader>
          
          <div className="p-8 space-y-6 bg-card">
            <div className="text-center space-y-1">
              <span className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.3em]">Total a Receber</span>
              <div className="text-5xl font-black text-primary tracking-tighter">R$ {total.toFixed(2)}</div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <PaymentButton 
                active={paymentMethod === 'dinheiro'} 
                onClick={() => setPaymentMethod('dinheiro')}
                icon={<Banknote className="h-8 w-8" />}
                label="Dinheiro"
              />
              <PaymentButton 
                active={paymentMethod === 'pix'} 
                onClick={() => setPaymentMethod('pix')}
                icon={<QrCode className="h-8 w-8" />}
                label="Pix"
              />
              <PaymentButton 
                active={paymentMethod === 'cartao'} 
                onClick={() => setPaymentMethod('cartao')}
                icon={<CreditCard className="h-8 w-8" />}
                label="Cartão"
              />
            </div>

            {paymentMethod === 'dinheiro' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Valor Recebido (R$)</Label>
                  <Input 
                    type="text" 
                    inputMode="decimal"
                    placeholder="0,00" 
                    className="h-16 text-2xl font-black rounded-2xl border-primary/20 bg-muted/30 px-6 text-primary focus:border-primary transition-all"
                    value={receivedAmount}
                    onChange={(e) => setReceivedAmount(e.target.value)}
                    autoFocus
                  />
                </div>
                {changeAmount > 0 && (
                  <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 text-center animate-in zoom-in-95 duration-500">
                    <span className="text-[10px] font-black uppercase text-primary tracking-widest block mb-1">Troco a Devolver</span>
                    <div className="text-4xl font-black text-primary tracking-tighter">R$ {changeAmount.toFixed(2)}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="bg-muted/30 p-8 pt-4">
            <Button 
              className="w-full h-20 text-2xl font-black uppercase shadow-2xl shadow-primary/30 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all" 
              onClick={finalizeOrder}
              disabled={submitting}
            >
              {submitting ? <Loader2 className="animate-spin h-8 w-8" /> : <><Printer className="mr-3 h-8 w-8" /> Finalizar e Imprimir</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
      className={cn(
        "flex flex-col h-24 gap-3 border-2 transition-all rounded-2xl flex-1",
        active ? "border-primary shadow-lg scale-105" : "border-primary/5 opacity-50 hover:opacity-100 hover:border-primary/20"
      )}
      onClick={onClick}
    >
      {icon}
      <span className="text-[10px] font-black uppercase tracking-widest leading-none">{label}</span>
    </Button>
  );
}
