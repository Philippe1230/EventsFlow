
"use client";

import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/use-auth-context';
import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { collection, doc, getDoc, serverTimestamp, addDoc, increment } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ShoppingCart, Banknote, QrCode, CreditCard, RefreshCcw, Loader2, Plus, Minus, ArrowRight, Calendar, ChevronRight, ChevronLeft, ArrowLeftRight } from 'lucide-react';
import { PrintTickets } from '@/components/pdv/PrintTickets';
import { SuccessModal } from '@/components/pdv/SuccessModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
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
  const { tenantId, user, role, loading: authLoading, selectedEventId, setSelectedEventId } = useAuth();
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

  // Controle de Troca de Evento
  const [showSwitchDialog, setShowSwitchDialog] = useState(false);
  const [pendingEventId, setPendingEventId] = useState<string | null>(null);

  useEffect(() => {
    if (urlEventId && urlEventId !== selectedEventId) {
      setSelectedEventId(urlEventId);
    }
  }, [urlEventId, selectedEventId, setSelectedEventId]);

  const eventsQuery = useMemoFirebase(() => {
    if (!tenantId || !user) return null;
    return collection(db, 'tenants', tenantId, 'events');
  }, [tenantId, db, user]);
  
  const { data: rawEvents } = useCollection(eventsQuery);
  const events = useMemo(() => (rawEvents || []).filter(e => {
    if (role === 'owner' || user?.email === 'flowevents@gmail.com') return true;
    return e.members?.[user?.uid || ''] != null;
  }), [rawEvents, role, user]);

  const currentEvent = events?.find(e => e.id === activeEventId);

  const productsQuery = useMemoFirebase(() => {
    if (!tenantId || !activeEventId) return null;
    return collection(db, 'tenants', tenantId, 'events', activeEventId, 'products');
  }, [tenantId, activeEventId, db]);

  const { data: rawProducts, isLoading: productsLoading } = useCollection<Product>(productsQuery);
  const products = useMemo(() => rawProducts?.filter(p => p.active !== false).sort((a, b) => a.name.localeCompare(b.name)) || [], [rawProducts]);

  useEffect(() => {
    if (activeEventId) {
      const savedCart = localStorage.getItem(`current_cart_${activeEventId}`);
      if (savedCart) {
        try { setCart(JSON.parse(savedCart)); } catch (e) {}
      } else {
        setCart([]);
      }
    }
  }, [activeEventId]);

  useEffect(() => {
    if (activeEventId && cart.length > 0) {
      localStorage.setItem(`current_cart_${activeEventId}`, JSON.stringify(cart));
    } else if (activeEventId) {
      localStorage.removeItem(`current_cart_${activeEventId}`);
    }
  }, [cart, activeEventId]);

  const total = useMemo(() => cart.reduce((acc, item) => acc + item.price * item.quantity, 0), [cart]);

  useEffect(() => {
    const received = parseFloat(receivedAmount.replace(',', '.')) || 0;
    setChangeAmount(received > total ? received - total : 0);
  }, [receivedAmount, total]);

  const addToCart = useCallback((product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  }, []);

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) return { ...item, quantity: Math.max(0, item.quantity + delta) };
      return item;
    }).filter(item => item.quantity > 0));
  };

  const clearCart = () => {
    setCart([]);
    if (activeEventId) localStorage.removeItem(`current_cart_${activeEventId}`);
  };

  const handleSwitchEventRequest = (id: string) => {
    if (id === activeEventId) return;
    setPendingEventId(id);
    setShowSwitchDialog(true);
  };

  const confirmSwitchEvent = () => {
    if (pendingEventId) {
      setSelectedEventId(pendingEventId);
      router.push(`/pdv?eventId=${pendingEventId}`);
      setShowSwitchDialog(false);
      setPendingEventId(null);
      setCart([]);
    }
  };

  const finalizeOrder = async () => {
    if (cart.length === 0 || !activeEventId || !tenantId || !user) return;
    setSubmitting(true);

    try {
      const ordersColRef = collection(db, 'tenants', tenantId, 'events', activeEventId, 'orders');
      const counterRef = doc(db, 'tenant_counters', tenantId);
      const counterSnap = await getDoc(counterRef);
      let nextNumber = (counterSnap.data()?.orderNumber || 0) + 1;
      
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
        cart.forEach(item => {
          const productRef = doc(db, 'tenants', tenantId, 'events', activeEventId, 'products', item.id);
          updateDocumentNonBlocking(productRef, { soldQuantity: increment(item.quantity) });
        });

        const tickets = cart.flatMap(item => Array(item.quantity).fill({
          orderId: orderRef.id,
          orderNumber: nextNumber,
          productName: item.name,
          timestamp: new Date()
        }));

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
          setReceivedAmount('');
        }, 150);
      }).catch((err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: ordersColRef.path, operation: 'create', requestResourceData: orderData
        }));
        setSubmitting(false);
      });
    } catch (e) {
      setSubmitting(false);
    }
  };

  if (!activeEventId && !authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 max-w-md mx-auto">
        <div className="bg-primary/5 p-10 rounded-[3rem] border-2 border-dashed border-primary/20 mb-8 w-full">
          <Calendar className="h-20 w-20 text-primary/20 mx-auto mb-4" />
          <h3 className="text-xl font-black uppercase text-primary tracking-tighter">Selecione um Evento</h3>
          <p className="text-xs text-muted-foreground mt-2 font-medium">Você precisa escolher um evento para operar o PDV.</p>
        </div>
        <div className="w-full space-y-4">
          <Select onValueChange={(v) => handleSwitchEventRequest(v)}>
            <SelectTrigger className="h-16 rounded-2xl border-2 border-primary font-bold bg-white text-primary px-6 shadow-xl">
              <SelectValue placeholder="Escolher Evento Ativo" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              {events.map(e => (
                <SelectItem key={e.id} value={e.id} className="font-bold uppercase text-xs">{e.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button asChild variant="outline" className="w-full h-14 rounded-2xl font-black uppercase text-xs border-primary text-primary">
            <Link href="/events">Ir para Meus Eventos</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 pb-24 lg:pb-0 gpu-accelerated">
      {/* Header Contextual do PDV */}
      <div className="lg:col-span-12 flex flex-col md:flex-row justify-between items-center gap-4 bg-card p-4 rounded-2xl border-2 border-primary shadow-lg">
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 p-3 rounded-xl">
             <Calendar className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-black text-primary uppercase leading-none tracking-tighter">
              {currentEvent?.name || '---'}
            </h2>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">PDV OPERACIONAL</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Select value={activeEventId || ''} onValueChange={(v) => handleSwitchEventRequest(v)}>
            <SelectTrigger className="h-12 rounded-xl border-2 border-primary font-black bg-white text-primary px-4 shadow-sm min-w-[200px] uppercase text-[10px]">
              <ArrowLeftRight className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Trocar Evento" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {events.map(e => (
                <SelectItem key={e.id} value={e.id} className="font-bold uppercase text-xs">{e.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={() => {
            const last = localStorage.getItem(`last_order_${activeEventId}`);
            if (last) setCart(JSON.parse(last));
          }} className="font-black text-[10px] uppercase h-12 border-2 border-primary/20 rounded-xl px-6">
            <RefreshCcw className="mr-2 h-4 w-4" /> Repetir Último
          </Button>
        </div>
      </div>

      <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-4">
        <div className="flex-1">
          {productsLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-40">
              <Loader2 className="animate-spin text-primary h-10 w-10" />
              <span className="font-black uppercase text-[9px]">Carregando Cardápio...</span>
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-[2.5rem] border-2 border-dashed border-primary/5">
               <span className="font-black uppercase text-[10px] text-muted-foreground tracking-widest opacity-40">Nenhum produto neste evento</span>
               <Button asChild variant="link" className="text-primary font-black uppercase text-[9px] mt-4">
                  <Link href={`/events/${activeEventId}/config`}>Configurar Cardápio</Link>
               </Button>
            </div>
          ) : (
            <div className="pdv-grid">
              {products.map(p => (
                <button key={p.id} onClick={() => addToCart(p)} className="flex flex-col items-center justify-center p-4 bg-card border-2 border-primary/10 hover:border-primary hover:bg-primary/5 rounded-[2.5rem] shadow-sm transition-all active:scale-90 h-40 group relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-primary/10 group-hover:bg-primary transition-colors" />
                  <span className="font-black text-xs leading-tight uppercase line-clamp-2 mb-3 text-center group-hover:text-primary transition-colors">{p.name}</span>
                  <span className="bg-primary text-white px-5 py-2 rounded-full text-[11px] font-black shadow-lg shadow-primary/10">R$ {p.price.toFixed(2)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6 lg:h-[calc(100vh-140px)] lg:sticky lg:top-4">
        <Card className="flex flex-col flex-1 shadow-2xl border-none overflow-hidden rounded-[2.5rem] bg-card">
          <CardHeader className="bg-primary text-white py-5 shrink-0">
            <CardTitle className="flex items-center justify-between text-xs uppercase font-black tracking-widest">
              <div className="flex items-center gap-2"><ShoppingCart className="h-4 w-4" /> Carrinho</div>
              <Badge className="bg-white/20 text-white border-none">{cart.reduce((a,b)=>a+b.quantity,0)} itens</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden bg-muted/10">
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {cart.map(item => (
                <div key={item.id} className="flex flex-col bg-card border border-primary/5 p-3 rounded-2xl shadow-sm">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-black uppercase text-[10px] leading-tight flex-1">{item.name}</span>
                    <span className="font-black text-primary text-[11px]">R$ {(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center bg-muted/50 rounded-xl p-0.5">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.id, -1)}><Minus className="h-3 w-3" /></Button>
                      <span className="w-7 text-center font-black text-[11px]">{item.quantity}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.id, 1)}><Plus className="h-3 w-3" /></Button>
                    </div>
                  </div>
                </div>
              ))}
              {cart.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center opacity-20 py-20">
                  <ShoppingCart className="h-12 w-12 mb-2" />
                  <span className="font-black uppercase text-[10px] tracking-widest">Carrinho Vazio</span>
                </div>
              )}
            </div>
            <div className="bg-card border-t-2 border-primary/10 p-5 space-y-4">
              <div className="flex justify-between items-center px-2">
                <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Subtotal</span>
                <span className="text-3xl font-black text-primary tracking-tighter">R$ {total.toFixed(2)}</span>
              </div>
              <Button className="w-full h-16 font-black uppercase text-lg rounded-2xl shadow-2xl shadow-primary/20 active:scale-95 transition-all" disabled={cart.length === 0} onClick={() => setShowPaymentModal(true)}>
                Concluir Venda <ArrowRight className="ml-2 h-6 w-6" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pop-up de Confirmação de Troca de Evento */}
      <Dialog open={showSwitchDialog} onOpenChange={setShowSwitchDialog}>
        <DialogContent className="rounded-[2.5rem] border-none p-0 overflow-hidden sm:max-w-md w-[95vw] !top-[50%] !translate-y-[-50%]">
          <DialogHeader className="bg-primary p-6 text-white text-center">
            <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter">Trocar de Evento?</DialogTitle>
          </DialogHeader>
          <div className="p-8 text-center space-y-6">
            <div className="bg-primary/5 p-6 rounded-2xl border-2 border-primary/10">
              <p className="text-sm font-bold text-muted-foreground leading-relaxed uppercase">
                Você quer mudar para o PDV do evento:
              </p>
              <div className="text-xl font-black text-primary mt-2 uppercase tracking-tight">
                {events.find(e => e.id === pendingEventId)?.name}
              </div>
            </div>
            <p className="text-[10px] font-black text-destructive uppercase tracking-widest">
              Atenção: O carrinho atual será esvaziado.
            </p>
          </div>
          <DialogFooter className="p-8 pt-0 grid grid-cols-2 gap-4">
            <Button variant="ghost" onClick={() => setShowSwitchDialog(false)} className="h-14 font-black uppercase text-xs rounded-xl">Cancelar</Button>
            <Button onClick={confirmSwitchEvent} className="h-14 font-black uppercase text-xs rounded-xl shadow-lg">Confirmar Troca</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="rounded-[2.5rem] border-none p-0 overflow-hidden sm:max-w-md w-[95vw] !top-[50%] !translate-y-[-50%]">
          <DialogHeader className="bg-primary p-6 text-white"><DialogTitle className="text-2xl font-black uppercase text-center italic tracking-tighter">Pagamento</DialogTitle></DialogHeader>
          <div className="p-8 space-y-8">
            <div className="text-center">
              <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Valor do Pedido</span>
              <div className="text-5xl font-black text-primary tracking-tighter italic">R$ {total.toFixed(2)}</div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Button variant={paymentMethod === 'dinheiro' ? 'default' : 'outline'} className="flex flex-col h-24 gap-2 border-2 rounded-2xl font-black uppercase text-[10px]" onClick={() => setPaymentMethod('dinheiro')}><Banknote className="h-8 w-8 text-primary" /><span>Dinheiro</span></Button>
              <Button variant={paymentMethod === 'pix' ? 'default' : 'outline'} className="flex flex-col h-24 gap-2 border-2 rounded-2xl font-black uppercase text-[10px]" onClick={() => setPaymentMethod('pix')}><QrCode className="h-8 w-8 text-primary" /><span>Pix</span></Button>
              <Button variant={paymentMethod === 'cartao' ? 'default' : 'outline'} className="flex flex-col h-24 gap-2 border-2 rounded-2xl font-black uppercase text-[10px]" onClick={() => setPaymentMethod('cartao')}><CreditCard className="h-8 w-8 text-primary" /><span>Cartão</span></Button>
            </div>
            {paymentMethod === 'dinheiro' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Valor Recebido</Label>
                <Input type="text" inputMode="decimal" className="h-16 text-3xl font-black rounded-2xl border-primary/20 px-8 bg-muted/20" value={receivedAmount} onChange={(e) => setReceivedAmount(e.target.value)} autoFocus />
                {changeAmount > 0 && <div className="bg-primary/5 rounded-[2rem] p-6 text-center border-2 border-primary/10"><span className="text-[10px] font-black uppercase text-primary tracking-widest">Troco a Devolver</span><div className="text-4xl font-black text-primary italic">R$ {changeAmount.toFixed(2)}</div></div>}
              </div>
            )}
          </div>
          <DialogFooter className="p-8 pt-0"><Button className="w-full h-18 text-xl font-black uppercase rounded-2xl shadow-2xl shadow-primary/20 bg-primary hover:bg-primary/90" onClick={finalizeOrder} disabled={submitting}>{submitting ? <Loader2 className="animate-spin h-8 w-8" /> : "Emitir Fichas"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <PrintTickets tickets={printableTickets} />
      <SuccessModal isOpen={showSuccessModal} onClose={() => setShowSuccessModal(false)} orderNumber={lastOrderNumber || 0} />
    </div>
  );
}

export default function PDVPage() {
  return <AppShell><Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary opacity-20" /></div>}><PDVContent /></Suspense></AppShell>;
}
