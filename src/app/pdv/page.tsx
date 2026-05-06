
"use client";

import { AppShell, OrderTicketIcon } from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/use-auth-context';
import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { collection, doc, getDoc, serverTimestamp, addDoc, increment, updateDoc } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ShoppingCart, Trash2, Printer, CreditCard, Banknote, QrCode, RefreshCcw, Loader2, Plus, Minus, ArrowRight, Calendar, ChevronRight } from 'lucide-react';
import { PrintTickets } from '@/components/pdv/PrintTickets';
import { SuccessModal } from '@/components/pdv/SuccessModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { cn } from '@/lib/utils';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  active: boolean;
  type?: 'own' | 'supplier';
  supplierId?: string;
}

interface CartItem extends Product {
  quantity: number;
}

function PDVContent() {
  const { tenantId, user, tenantMembers, loading: authLoading, selectedEventId, setSelectedEventId } = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const urlEventId = searchParams.get('eventId');
  const activeEventId = urlEventId || selectedEventId;

  const [cart, setCart] = useState<CartItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'dinheiro' | 'cartao' | 'pix'>('dinheiro');
  const [printableTickets, setPrintableTickets] = useState<any[]>([]);
  const [lastOrderNumber, setLastOrderNumber] = useState<number | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  const [receivedAmount, setReceivedAmount] = useState<string>('');
  const [changeAmount, setChangeAmount] = useState<number>(0);

  // Sync Event ID
  useEffect(() => {
    if (urlEventId && urlEventId !== selectedEventId) {
      setSelectedEventId(urlEventId);
    }
  }, [urlEventId, selectedEventId, setSelectedEventId]);

  // Load Event Data
  const eventRef = useMemoFirebase(() => (tenantId && activeEventId) ? doc(db, 'tenants', tenantId, 'events', activeEventId) : null, [tenantId, activeEventId, db]);
  const { data: event } = useCollection(useMemoFirebase(() => tenantId ? collection(db, 'tenants', tenantId, 'events') : null, [tenantId, db]));
  const currentEvent = event?.find(e => e.id === activeEventId);

  // Fetch Products for this specific Event
  const productsQuery = useMemoFirebase(() => {
    if (!tenantId || !activeEventId || authLoading) return null;
    return collection(db, 'tenants', tenantId, 'events', activeEventId, 'products');
  }, [tenantId, activeEventId, authLoading, db]);

  const { data: rawProducts, isLoading: productsLoading } = useCollection<Product>(productsQuery);
  const products = useMemo(() => rawProducts?.filter(p => p.active !== false).sort((a, b) => a.name.localeCompare(b.name)) || [], [rawProducts]);

  useEffect(() => {
    if (tenantId && activeEventId) {
      const savedCart = localStorage.getItem(`current_cart_${activeEventId}`);
      if (savedCart) {
        try {
          setCart(JSON.parse(savedCart));
        } catch (e) {
          console.error("Erro ao carregar carrinho salvo", e);
        }
      }
    }
  }, [tenantId, activeEventId]);

  useEffect(() => {
    if (tenantId && activeEventId) {
      localStorage.setItem(`current_cart_${activeEventId}`, JSON.stringify(cart));
    }
  }, [cart, tenantId, activeEventId]);

  const total = useMemo(() => cart.reduce((acc, item) => acc + item.price * item.quantity, 0), [cart]);

  useEffect(() => {
    const received = parseFloat(receivedAmount.replace(',', '.')) || 0;
    if (received > total) {
      setChangeAmount(received - total);
    } else {
      setChangeAmount(0);
    }
  }, [receivedAmount, total]);

  const addToCart = useCallback((product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    toast({ title: `${product.name} +1`, duration: 800 });
  }, [toast]);

  const updateQuantity = useCallback((id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    if (activeEventId) localStorage.removeItem(`current_cart_${activeEventId}`);
  }, [activeEventId]);

  const finalizeOrder = async () => {
    if (cart.length === 0 || !activeEventId || !tenantId || !user) return;

    setSubmitting(true);

    try {
      // Pedidos agora ficam dentro do evento
      const ordersColRef = collection(db, 'tenants', tenantId, 'events', activeEventId, 'orders');
      
      // Contador global para o Tenant (ou você pode mover para o evento se preferir)
      const counterRef = doc(db, 'tenant_counters', tenantId);
      const counterSnap = await getDoc(counterRef);
      let nextNumber = 1;
      
      if (counterSnap.exists()) {
        nextNumber = (counterSnap.data()?.orderNumber || 0) + 1;
      }
      
      setDocumentNonBlocking(counterRef, { orderNumber: nextNumber }, { merge: true });

      const orderData = {
        tenantId,
        eventId: activeEventId,
        userId: user.uid,
        orderNumber: nextNumber,
        total,
        paymentMethod,
        items: cart.map(i => ({
          productId: i.id,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          subtotal: i.price * i.quantity,
          type: i.type || 'own',
          supplierId: i.supplierId || null
        })),
        createdAt: serverTimestamp(),
        status: 'completed'
      };

      addDoc(ordersColRef, orderData).then((orderRef) => {
        // Atualiza estatísticas dos produtos
        cart.forEach(item => {
          const productRef = doc(db, 'tenants', tenantId, 'events', activeEventId, 'products', item.id);
          updateDocumentNonBlocking(productRef, { soldQuantity: increment(item.quantity) });
        });

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
          localStorage.setItem(`last_order_${activeEventId}`, JSON.stringify(cart));
          clearCart();
          setSubmitting(false);
          setPrintableTickets([]);
        }, 150);
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
    const last = localStorage.getItem(`last_order_${activeEventId}`);
    if (last) {
      setCart(JSON.parse(last));
      toast({ title: 'Carrinho Restaurado' });
    }
  };

  if (!activeEventId && !authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <div className="bg-primary/5 p-10 rounded-[3rem] border-2 border-dashed border-primary/20 mb-8">
          <Calendar className="h-20 w-20 text-primary/20 mx-auto mb-4" />
          <h3 className="text-xl font-black uppercase text-primary tracking-tighter">Selecione um Evento</h3>
          <p className="text-sm text-muted-foreground font-medium italic mt-2">Você precisa estar em um evento ativo para vender.</p>
        </div>
        <div className="grid gap-4 w-full max-w-md">
          {event?.filter(e => e.status === 'ativo').map(e => (
            <Button key={e.id} variant="outline" className="h-16 rounded-2xl border-2 border-primary/10 hover:border-primary font-black uppercase text-xs tracking-widest bg-card shadow-sm" onClick={() => setSelectedEventId(e.id)}>
              {e.name} <ChevronRight className="ml-auto h-5 w-5 text-primary" />
            </Button>
          ))}
          {event?.filter(e => e.status === 'ativo').length === 0 && (
            <p className="text-xs font-black uppercase text-destructive tracking-widest">Nenhum evento ativo no momento.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 pb-24 lg:pb-0 gpu-accelerated">
      <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-4">
        <div className="flex justify-between items-center bg-card p-4 rounded-2xl border border-primary/10 shadow-sm sticky top-0 z-10 lg:static backdrop-blur-md">
          <div className="flex flex-col">
            <h2 className="text-[10px] font-black text-primary uppercase flex items-center gap-2 tracking-[0.2em]">
              <Plus className="h-3 w-3" /> Evento: {currentEvent?.name || 'Carregando...'}
            </h2>
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest italic">{products.length} itens no cardápio</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={repeatLastOrder} className="font-bold text-[10px] uppercase h-9 border-primary/20 hover:bg-primary/5 rounded-xl lg:flex hidden transition-all active:scale-95">
              <RefreshCcw className="mr-1 h-3 w-3" /> Repetir Último
            </Button>
          </div>
        </div>
        
        <div className="flex-1">
          {productsLoading || authLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-6 opacity-40">
              <Loader2 className="animate-spin text-primary h-10 w-10" />
              <p className="font-black uppercase text-[9px] tracking-[0.3em] text-primary">Sincronizando Cardápio...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center bg-card rounded-[2rem] border-2 border-dashed border-primary/10 p-8">
              <OrderTicketIcon className="h-16 w-16 text-primary/20 mb-6" />
              <p className="text-muted-foreground font-black uppercase text-sm tracking-widest">Este evento ainda não tem produtos ativos</p>
              <Button asChild variant="link" className="text-primary font-black uppercase text-xs mt-4">
                <Link href={`/events/${activeEventId}/config`}>Configurar Cardápio</Link>
              </Button>
            </div>
          ) : (
            <div className="pdv-grid">
              {products.map(p => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className="flex flex-col items-center justify-center p-4 bg-card border-2 border-primary/10 hover:border-primary hover:bg-primary/5 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 rounded-[2rem] shadow-sm transition-all active:scale-90 group relative overflow-hidden h-36 gpu-accelerated"
                >
                  <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Plus className="h-5 w-5 text-primary" />
                  </div>
                  <span className="font-black text-xs leading-tight uppercase line-clamp-2 mb-3 px-2 text-center group-hover:text-primary transition-colors">{p.name}</span>
                  <span className="bg-primary text-white px-4 py-1.5 rounded-full text-[10px] font-black shadow-lg group-hover:scale-110 transition-transform">
                    R$ {p.price.toFixed(2)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div id="cart-section" className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6 lg:h-[calc(100vh-140px)] lg:sticky lg:top-0">
        <Card className="flex flex-col flex-1 shadow-2xl border-none overflow-hidden rounded-[2.5rem] bg-card gpu-accelerated">
          <CardHeader className="bg-primary text-white py-4 shrink-0 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
               <OrderTicketIcon className="h-12 w-12 rotate-12" />
            </div>
            <CardTitle className="flex items-center justify-between text-xs uppercase font-black relative z-10 tracking-widest">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" /> Venda Atual
              </div>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden bg-muted/10">
            <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-[150px] scroll-smooth">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 opacity-10">
                  <OrderTicketIcon className="h-12 w-12 text-primary mb-4" />
                  <p className="text-center font-black uppercase text-[10px] tracking-[0.2em]">Aguardando Pedidos</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.id} className="flex flex-col bg-card border border-primary/5 p-3 rounded-2xl shadow-sm hover:border-primary/20 transition-all animate-in fade-in slide-in-from-right-2 duration-150 gpu-accelerated">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-black uppercase text-[10px] leading-tight flex-1 pr-2">{item.name}</span>
                      <span className="font-black text-primary text-[11px] whitespace-nowrap">R$ {(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center bg-muted/50 rounded-xl p-0.5">
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-primary/10 transition-colors" onClick={() => updateQuantity(item.id, -1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-7 text-center font-black text-[11px]">{item.quantity}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-primary/10 transition-colors" onClick={() => updateQuantity(item.id, 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/40 hover:text-destructive hover:bg-destructive/5 rounded-lg transition-colors" onClick={() => removeFromCart(item.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="bg-card border-t border-primary/5 p-4 space-y-4 shadow-[0_-10px_30px_rgba(0,0,0,0.03)] mt-auto">
              <div className="flex justify-between items-center px-2">
                <span className="text-[9px] font-black uppercase text-muted-foreground tracking-[0.2em]">Total</span>
                <span className="text-2xl font-black text-primary tracking-tighter">R$ {total.toFixed(2)}</span>
              </div>

              <Button 
                className="w-full h-14 text-base font-black uppercase shadow-xl shadow-primary/20 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all gpu-accelerated" 
                size="lg"
                disabled={cart.length === 0}
                onClick={() => setShowPaymentModal(true)}
              >
                <ArrowRight className="mr-2 h-5 w-5" /> Fechar Pedido
              </Button>
              
              {cart.length > 0 && (
                <button className="w-full text-[8px] font-black uppercase text-muted-foreground/30 hover:text-destructive transition-colors tracking-widest py-1" onClick={clearCart}>
                  Limpar Carrinho
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="rounded-[2rem] border-none shadow-3xl p-0 overflow-hidden sm:max-w-md w-[95vw] !top-[50%] !translate-y-[-50%] animate-snappy gpu-accelerated">
          <DialogHeader className="bg-primary p-6 text-white relative">
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter italic z-10 text-center">
              Pagamento
            </DialogTitle>
          </DialogHeader>
          
          <div className="p-6 space-y-6 bg-card">
            <div className="text-center space-y-1">
              <span className="text-[9px] font-black uppercase text-muted-foreground tracking-[0.2em]">Valor Final</span>
              <div className="text-4xl font-black text-primary tracking-tighter">R$ {total.toFixed(2)}</div>
            </div>

            <div className="grid grid-cols-3 gap-2">
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

            {paymentMethod === 'dinheiro' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="space-y-1">
                  <Label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest ml-1">Recebido</Label>
                  <Input 
                    type="text" 
                    inputMode="decimal"
                    placeholder="0,00" 
                    className="h-14 text-xl font-black rounded-xl border-primary/10 bg-muted/20 px-6 text-primary focus:border-primary transition-all"
                    value={receivedAmount}
                    onChange={(e) => setReceivedAmount(e.target.value)}
                    autoFocus
                  />
                </div>
                {changeAmount > 0 && (
                  <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 text-center animate-in zoom-in-95 duration-150">
                    <span className="text-[9px] font-black uppercase text-primary tracking-widest block mb-0.5">Troco</span>
                    <div className="text-3xl font-black text-primary tracking-tighter">R$ {changeAmount.toFixed(2)}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="bg-muted/10 p-6 pt-2">
            <Button 
              className="w-full h-16 text-xl font-black uppercase shadow-lg shadow-primary/20 rounded-xl hover:scale-[1.02] active:scale-95 transition-all gpu-accelerated" 
              onClick={finalizeOrder}
              disabled={submitting}
            >
              {submitting ? <Loader2 className="animate-spin h-6 w-6" /> : <><Printer className="mr-2 h-6 w-6" /> Imprimir Fichas</>}
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
    </div>
  );
}

export default function PDVPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary opacity-20" /></div>}>
        <PDVContent />
      </Suspense>
    </AppShell>
  );
}

function PaymentButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <Button 
      variant={active ? 'default' : 'outline'} 
      className={cn(
        "flex flex-col h-20 gap-2 border-2 transition-all rounded-xl flex-1 animate-snappy",
        active ? "border-primary shadow-md scale-105" : "border-primary/5 opacity-50 hover:opacity-100"
      )}
      onClick={onClick}
    >
      {icon}
      <span className="text-[9px] font-black uppercase tracking-widest leading-none text-center">{label}</span>
    </Button>
  );
}
