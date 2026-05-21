"use client";

import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/use-auth-context';
import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { collection, doc, getDoc, getDocFromCache, serverTimestamp, increment } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ShoppingCart, Banknote, QrCode, CreditCard, RefreshCcw, Loader2, Plus, Minus, ArrowRight, Calendar, ArrowLeftRight, Lock } from 'lucide-react';
import { PrintTickets } from '@/components/pdv/PrintTickets';
import { SuccessModal } from '@/components/pdv/SuccessModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  active: boolean;
  type?: 'own' | 'supplier';
  supplierId?: string;
  supplierUnitCost?: number;
}

interface CartItem extends Product {
  quantity: number;
}

const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

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
  const isEventFinalized = currentEvent?.status === 'finalizado';

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
    if (isEventFinalized) {
      toast({ title: "Evento Encerrado", description: "Não é possível realizar vendas em eventos finalizados.", variant: "destructive" });
      return;
    }
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  }, [isEventFinalized, toast]);

  const updateQuantity = (id: string, delta: number) => {
    if (isEventFinalized) return;
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
    if (cart.length === 0 || !activeEventId || !tenantId || !user || isEventFinalized) return;
    setSubmitting(true);

    try {
      const counterRef = doc(db, 'tenant_counters', tenantId);
      let nextNumber = 1;
      
      try {
        // Tenta obter o contador em tempo real do servidor
        const counterSnap = await getDoc(counterRef);
        nextNumber = (counterSnap.data()?.orderNumber || 0) + 1;
      } catch (error) {
        console.warn("Flow Events: Erro ao obter contador do servidor (provavelmente offline). Tentando cache local...", error);
        try {
          // Fallback Offline: Lê o último valor salvo no cache local do IndexedDB
          const counterSnap = await getDocFromCache(counterRef);
          nextNumber = (counterSnap.data()?.orderNumber || 0) + 1;
        } catch (cacheError) {
          console.warn("Flow Events: Falha ao ler contador do cache local. Gerando número offline provisório...", cacheError);
          // Fallback Emergencial: Se for o primeiro acesso sem internet e o cache estiver limpo,
          // gera um número baseado no timestamp atual para evitar colisão e não travar a impressão.
          nextNumber = Math.floor(Date.now() / 1000) % 100000;
        }
      }
      
      // Atualiza contador imediatamente (Offline-Safe)
      updateDocumentNonBlocking(counterRef, { orderNumber: increment(1) });

      const ordersColRef = collection(db, 'tenants', tenantId, 'events', activeEventId, 'orders');
      const orderRef = doc(ordersColRef); // Pre-genera ID para uso imediato no ticket (Offline-Safe)
      
      const orderData = {
        id: orderRef.id,
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
          supplierId: i.supplierId || null,
          supplierUnitCost: i.supplierUnitCost || 0
        })),
        createdAt: serverTimestamp(),
        status: 'completed'
      };

      // Dispara gravação do pedido (Offline-Safe)
      setDocumentNonBlocking(orderRef, orderData, { merge: true });

      // Atualiza estoque/vendas de produtos (Offline-Safe)
      cart.forEach(item => {
        const productRef = doc(db, 'tenants', tenantId, 'events', activeEventId, 'products', item.id);
        updateDocumentNonBlocking(productRef, { soldQuantity: increment(item.quantity) });
      });

      // Prepara os cupons para impressão imediata
      const tickets = cart.flatMap(item => Array(item.quantity).fill({
        orderId: orderRef.id,
        orderNumber: nextNumber,
        productName: item.name,
        timestamp: new Date()
      }));

      // Ações de UI instantâneas (Latência Zero)
      setPrintableTickets(tickets);
      setLastOrderNumber(nextNumber);
      setShowPaymentModal(false);
      setShowSuccessModal(true);
      
      setTimeout(() => {
        window.print();
        localStorage.setItem(`last_order_${activeEventId}`, JSON.stringify(cart));
        clearCart();
        setSubmitting(false);
        setReceivedAmount('');
        
        // Mantém as fichas no DOM por 2 segundos para dar tempo de qualquer celular capturar para a impressão
        setTimeout(() => {
          setPrintableTickets([]);
        }, 2000);
      }, 300);

    } catch (e) {
      console.error("Erro ao processar pedido:", e);
      setSubmitting(false);
      toast({ title: "Erro no Pedido", description: "Verifique sua conexão ou tente novamente.", variant: "destructive" });
    }
  };

  if (!activeEventId && !authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 max-w-md mx-auto">
        <div className="bg-primary/5 p-8 md:p-10 rounded-[2.5rem] border-2 border-dashed border-primary/20 mb-8 w-full">
          <Calendar className="h-16 w-16 md:h-20 md:w-20 text-primary/20 mx-auto mb-4" />
          <h3 className="text-xl font-black uppercase text-primary tracking-tighter">Selecione um Evento</h3>
          <p className="text-[10px] md:text-xs text-muted-foreground mt-2 font-black uppercase tracking-widest leading-tight">Você precisa escolher um evento para operar o PDV.</p>
        </div>
        <div className="w-full space-y-4">
          <Select onValueChange={(v) => handleSwitchEventRequest(v)}>
            <SelectTrigger className="h-16 rounded-2xl border-2 border-primary font-bold bg-white text-primary px-6 shadow-xl uppercase text-xs">
              <SelectValue placeholder="Escolher Evento Ativo" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-none shadow-2xl">
              {events.map(e => (
                <SelectItem key={e.id} value={e.id} className="font-bold uppercase text-xs">{e.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button asChild variant="outline" className="w-full h-14 rounded-2xl font-black uppercase text-[10px] border-primary text-primary tracking-widest">
            <Link href="/events">Ir para Meus Eventos</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 pb-32 lg:pb-0 gpu-accelerated">
      <div className="lg:col-span-12 flex flex-col md:flex-row justify-between items-center gap-4 bg-card p-4 rounded-2xl border-2 border-primary shadow-lg">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="bg-primary/10 p-2 md:p-3 rounded-xl shrink-0">
             <Calendar className="h-5 w-5 md:h-6 md:w-6 text-primary" />
          </div>
          <div className="overflow-hidden">
            <h2 className="text-base md:text-xl font-black text-primary uppercase leading-none tracking-tighter truncate">
              {currentEvent?.name || '---'}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">PDV OPERACIONAL</p>
              {isEventFinalized && (
                <Badge variant="destructive" className="h-4 font-black text-[7px] uppercase tracking-widest px-1.5 rounded-sm">Finalizado</Badge>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Select value={activeEventId || ''} onValueChange={(v) => handleSwitchEventRequest(v)}>
            <SelectTrigger className="h-11 md:h-12 rounded-xl border-2 border-primary font-black bg-white text-primary px-3 md:px-4 shadow-sm flex-1 md:min-w-[200px] uppercase text-[9px] md:text-[10px]">
              <ArrowLeftRight className="mr-2 h-3 w-3 md:h-4 md:w-4" />
              <SelectValue placeholder="Trocar" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-none shadow-2xl">
              {events.map(e => (
                <SelectItem key={e.id} value={e.id} className="font-bold uppercase text-[10px]">{e.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={() => {
            if (isEventFinalized) return;
            const last = localStorage.getItem(`last_order_${activeEventId}`);
            if (last) setCart(JSON.parse(last));
          }} disabled={isEventFinalized} className="font-black text-[9px] md:text-[10px] uppercase h-11 md:h-12 border-2 border-primary/20 rounded-xl px-4 md:px-6">
            <RefreshCcw className="mr-2 h-3 w-3 md:h-4 md:w-4" /> Repetir
          </Button>
        </div>
      </div>

      {isEventFinalized && (
        <div className="lg:col-span-12 animate-in slide-in-from-top-2">
          <div className="bg-destructive/10 border-2 border-destructive/20 p-6 rounded-[2rem] flex flex-col md:flex-row items-center justify-center gap-4 text-center md:text-left">
            <div className="bg-destructive/20 p-4 rounded-2xl"><Lock className="h-8 w-8 text-destructive" /></div>
            <div>
              <h3 className="text-xl font-black uppercase text-destructive tracking-tighter italic">Vendas Bloqueadas</h3>
              <p className="text-xs font-bold text-destructive/70 uppercase tracking-widest">Este evento foi finalizado e não aceita mais novos pedidos.</p>
            </div>
            <Button asChild variant="outline" className="md:ml-auto border-destructive/20 text-destructive font-black uppercase text-[10px] tracking-widest rounded-xl h-12 px-6">
              <Link href="/events">Voltar para Eventos</Link>
            </Button>
          </div>
        </div>
      )}

      <div className={cn("lg:col-span-7 xl:col-span-8", isEventFinalized && "opacity-50 pointer-events-none")}>
        {productsLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-40">
            <Loader2 className="animate-spin text-primary h-10 w-10" />
            <span className="font-black uppercase text-[9px] tracking-widest">Carregando Cardápio...</span>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-[2.5rem] border-2 border-dashed border-primary/5">
             <span className="font-black uppercase text-[10px] text-muted-foreground tracking-widest opacity-40">Nenhum produto cadastrado</span>
             <Button asChild variant="link" className="text-primary font-black uppercase text-[9px] mt-4 tracking-widest">
                <Link href={`/events/${activeEventId}/config`}>Configurar Cardápio</Link>
             </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4 px-1 md:px-0">
            {products.map(p => (
              <button 
                key={p.id} 
                onClick={() => addToCart(p)} 
                disabled={isEventFinalized}
                className="flex flex-col items-center justify-center p-3 md:p-4 bg-card border-2 border-primary/10 hover:border-primary hover:bg-primary/5 rounded-3xl md:rounded-[2.5rem] shadow-sm transition-all active:scale-95 h-36 md:h-44 group relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-primary/10 group-hover:bg-primary transition-colors" />
                <span className="font-black text-[11px] md:text-sm leading-tight uppercase line-clamp-3 mb-3 md:mb-4 text-center group-hover:text-primary transition-colors">{p.name}</span>
                <span className="bg-primary text-white px-4 md:px-6 py-2 md:py-3 rounded-full text-[10px] md:text-xs font-black shadow-lg shadow-primary/20">R$ {formatCurrency(p.price)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {!isEventFinalized && (
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6 lg:h-[calc(100vh-140px)] lg:sticky lg:top-4 self-start">
          {cart.length > 0 && (
            <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-primary p-4 pb-8 flex items-center justify-between shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.4)] animate-in slide-in-from-bottom-full duration-300">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase text-white/70 tracking-widest">Total ({cart.reduce((a,b)=>a+b.quantity,0)})</span>
                <span className="text-3xl font-black text-white tracking-tighter leading-none italic">R$ {formatCurrency(total)}</span>
              </div>
              <Button 
                className="h-16 px-8 bg-white text-primary hover:bg-white/90 font-black uppercase text-sm rounded-2xl shadow-xl active:scale-90 transition-all"
                onClick={() => setShowPaymentModal(true)}
              >
                Finalizar <ArrowRight className="ml-2 h-6 w-6" />
              </Button>
            </div>
          )}

          <Card className="hidden lg:flex flex-col flex-1 shadow-2xl border-none overflow-hidden rounded-[2.5rem] bg-card">
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
                      <span className="font-black uppercase text-[11px] leading-tight flex-1">{item.name}</span>
                      <span className="font-black text-primary text-[12px]">R$ {formatCurrency(item.price * item.quantity)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center bg-muted/50 rounded-xl p-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10" onClick={() => updateQuantity(item.id, -1)}><Minus className="h-4 w-4" /></Button>
                        <span className="w-8 text-center font-black text-sm">{item.quantity}</span>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10" onClick={() => updateQuantity(item.id, 1)}><Plus className="h-4 w-4" /></Button>
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
                  <span className="text-3xl font-black text-primary tracking-tighter">R$ {formatCurrency(total)}</span>
                </div>
                <Button className="w-full h-16 font-black uppercase text-lg rounded-2xl shadow-2xl shadow-primary/20 active:scale-95 transition-all" disabled={cart.length === 0} onClick={() => setShowPaymentModal(true)}>
                  Concluir Venda <ArrowRight className="ml-2 h-6 w-6" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={showSwitchDialog} onOpenChange={setShowSwitchDialog}>
        <DialogContent className="rounded-[2.5rem] border-none p-0 overflow-hidden sm:max-w-md w-[92vw] !top-[50%] !translate-y-[-50%] shadow-3xl">
          <DialogHeader className="bg-primary p-8 text-white text-center">
            <RefreshCcw className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter">Trocar Evento?</DialogTitle>
          </DialogHeader>
          <div className="p-8 text-center space-y-6">
            <div className="bg-primary/5 p-6 rounded-2xl border-2 border-primary/10">
              <p className="text-[10px] font-black text-muted-foreground leading-relaxed uppercase tracking-widest">
                Você quer mudar para o PDV do evento:
              </p>
              <div className="text-xl font-black text-primary mt-2 uppercase tracking-tight">
                {events.find(e => e.id === pendingEventId)?.name}
              </div>
            </div>
            <p className="text-[10px] font-black text-destructive uppercase tracking-widest animate-pulse">
              Atenção: O carrinho atual será esvaziado.
            </p>
          </div>
          <DialogFooter className="p-8 pt-0 grid grid-cols-2 gap-4">
            <Button variant="ghost" onClick={() => setShowSwitchDialog(false)} className="h-14 font-black uppercase text-[10px] rounded-xl tracking-widest">Cancelar</Button>
            <Button onClick={confirmSwitchEvent} className="h-14 font-black uppercase text-[10px] rounded-xl shadow-lg tracking-widest">Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="rounded-[2.5rem] border-none p-0 overflow-hidden sm:max-w-md w-[92vw] !top-[50%] !translate-y-[-50%] shadow-4xl max-h-[92vh] overflow-y-auto flex flex-col scrollbar-thin scrollbar-thumb-muted">
          <DialogHeader className="bg-primary p-5 md:p-6 text-white shrink-0">
            <DialogTitle className="text-2xl md:text-3xl font-black uppercase text-center italic tracking-tighter text-white">Pagamento</DialogTitle>
            <p className="text-center text-white/70 font-black text-[9px] md:text-[10px] uppercase tracking-[0.2em] mt-1">Selecione a forma de entrada</p>
          </DialogHeader>
          <div className="p-5 md:p-6 space-y-4 md:space-y-6 flex-1">
            <div className="text-center bg-primary/5 p-4 md:p-5 rounded-[1.5rem] md:rounded-[2rem] border-2 border-primary/10 shadow-inner">
              <span className="text-[9px] md:text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-0.5 block">Total a Receber</span>
              <div className="text-3xl md:text-4xl font-black text-primary tracking-tighter italic">R$ {formatCurrency(total)}</div>
            </div>
            <div className="grid grid-cols-3 gap-2 md:gap-3">
              <Button variant={paymentMethod === 'dinheiro' ? 'default' : 'outline'} className="flex flex-col h-20 md:h-24 gap-1 border-2 rounded-2xl font-black uppercase text-[8px] md:text-[9px] shadow-sm transition-all" onClick={() => setPaymentMethod('dinheiro')}><Banknote className="h-6 w-6 md:h-7 md:w-7 text-primary" /><span>Dinheiro</span></Button>
              <Button variant={paymentMethod === 'pix' ? 'default' : 'outline'} className="flex flex-col h-20 md:h-24 gap-1 border-2 rounded-2xl font-black uppercase text-[8px] md:text-[9px] shadow-sm transition-all" onClick={() => setPaymentMethod('pix')}><QrCode className="h-6 w-6 md:h-7 md:w-7 text-primary" /><span>Pix</span></Button>
              <Button variant={paymentMethod === 'cartao' ? 'default' : 'outline'} className="flex flex-col h-20 md:h-24 gap-1 border-2 rounded-2xl font-black uppercase text-[8px] md:text-[9px] shadow-sm transition-all" onClick={() => setPaymentMethod('cartao')}><CreditCard className="h-6 w-6 md:h-7 md:w-7 text-primary" /><span>Cartão</span></Button>
            </div>
            {paymentMethod === 'dinheiro' && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                <Label className="text-[9px] md:text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Valor Recebido (Dinheiro)</Label>
                <Input type="text" inputMode="decimal" className="h-14 md:h-16 text-2xl md:text-3xl font-black rounded-2xl border-primary/20 px-6 bg-muted/20 text-center shadow-inner" value={receivedAmount} onChange={(e) => setReceivedAmount(e.target.value)} autoFocus />
                {changeAmount > 0 && (
                  <div className="bg-green-500/10 rounded-[1.5rem] md:rounded-[2rem] p-4 md:p-5 text-center border-2 border-green-500/20">
                    <span className="text-[9px] md:text-[10px] font-black uppercase text-green-600 tracking-widest">Troco ao Cliente</span>
                    <div className="text-3xl md:text-4xl font-black text-green-600 italic leading-none mt-0.5">R$ {formatCurrency(changeAmount)}</div>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="p-5 md:p-6 pt-0 shrink-0">
            <Button className="w-full h-14 md:h-16 text-xl md:text-2xl font-black uppercase rounded-2xl shadow-3xl shadow-primary/30 bg-primary hover:bg-primary/90 tracking-tighter italic" onClick={finalizeOrder} disabled={submitting}>
              {submitting ? <Loader2 className="animate-spin h-6 w-6 md:h-8 md:w-8" /> : "Emitir Fichas"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <PrintTickets tickets={printableTickets} />
      <SuccessModal isOpen={showSuccessModal} onClose={() => setShowSuccessModal(false)} orderNumber={lastOrderNumber || 0} />
    </div>
  );
}

export default function PDVPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="flex h-[60vh] w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" /></div>}>
        <PDVContent />
      </Suspense>
    </AppShell>
  );
}
