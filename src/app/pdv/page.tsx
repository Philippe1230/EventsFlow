
"use client";

import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/use-auth-context';
import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, doc, setDoc, getDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ShoppingCart, Trash2, Printer, CreditCard, Banknote, QrCode, RefreshCcw, Loader2 } from 'lucide-react';
import { PrintTickets } from '@/components/pdv/PrintTickets';

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
}

interface CartItem extends Product {
  quantity: number;
}

export default function PDVPage() {
  const { tenantId, loading: authLoading } = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'dinheiro' | 'cartao' | 'pix'>('dinheiro');
  const [printableTickets, setPrintableTickets] = useState<any[]>([]);

  useEffect(() => {
    if (tenantId && !authLoading) fetchProducts();
  }, [tenantId, authLoading, db]);

  async function fetchProducts() {
    setLoading(true);
    try {
      const q = query(collection(db, 'products'), where('tenantId', '==', tenantId), where('active', '==', true));
      const snap = await getDocs(q);
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
    } catch (e) {
      console.error("Erro ao buscar produtos:", e);
    }
    setLoading(false);
  }

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const clearCart = () => setCart([]);

  const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const finalizeOrder = async () => {
    if (cart.length === 0 || !tenantId) return;
    setSubmitting(true);

    try {
      // Get next order number for tenant
      const counterRef = doc(db, 'tenant_counters', tenantId);
      const counterSnap = await getDoc(counterRef);
      let nextNumber = 1;
      
      if (counterSnap.exists()) {
        nextNumber = (counterSnap.data().orderNumber || 0) + 1;
      }
      await setDoc(counterRef, { orderNumber: nextNumber }, { merge: true });

      const orderData = {
        tenantId,
        items: cart,
        total,
        paymentMethod,
        orderNumber: nextNumber,
        createdAt: new Date()
      };

      const orderRef = await addDoc(collection(db, 'orders'), orderData);
      
      // Prepare tickets for printing
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
      
      // Trigger print after state update
      setTimeout(() => {
        window.print();
        clearCart();
        setPrintableTickets([]);
        toast({ title: 'Pedido Finalizado', description: 'Fichas enviadas para impressão.' });
        localStorage.setItem(`last_order_${tenantId}`, JSON.stringify(cart));
      }, 500);

    } catch (e) {
      toast({ title: 'Erro', description: 'Erro ao processar pedido.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const repeatLastOrder = () => {
    const last = localStorage.getItem(`last_order_${tenantId}`);
    if (last) {
      setCart(JSON.parse(last));
    } else {
      toast({ title: 'Aviso', description: 'Nenhum pedido anterior encontrado.' });
    }
  };

  return (
    <AppShell>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold font-headline">Produtos</h2>
            <Button variant="outline" size="sm" onClick={repeatLastOrder}>
              <RefreshCcw className="mr-2 h-4 w-4" /> Repetir Último
            </Button>
          </div>
          
          {loading ? (
            <div className="flex justify-center p-12"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
          ) : (
            <div className="pdv-grid">
              {products.map(p => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className="flex flex-col items-center justify-between p-4 bg-card border-2 border-transparent hover:border-primary rounded-xl shadow-sm transition-all active:scale-95 text-center min-h-[120px]"
                >
                  <span className="font-bold text-lg leading-tight uppercase">{p.name}</span>
                  <span className="text-primary font-bold mt-2">R$ {p.price.toFixed(2)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <Card className="flex flex-col h-full shadow-lg border-2 border-primary/10">
            <CardHeader className="bg-primary/5 pb-4">
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" /> Carrinho
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-4 overflow-hidden">
              <div className="flex-1 overflow-auto space-y-3 mb-4">
                {cart.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Vazio</p>
                ) : (
                  cart.map(item => (
                    <div key={item.id} className="flex justify-between items-center bg-muted/40 p-2 rounded-lg">
                      <div className="flex-1">
                        <div className="font-bold uppercase text-sm">{item.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.quantity}x R$ {item.price.toFixed(2)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">R$ {(item.price * item.quantity).toFixed(2)}</span>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeFromCart(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t pt-4 space-y-4">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-muted-foreground">Total do Pedido:</span>
                  <span className="text-3xl font-black text-primary">R$ {total.toFixed(2)}</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <PaymentButton 
                    active={paymentMethod === 'dinheiro'} 
                    onClick={() => setPaymentMethod('dinheiro')}
                    icon={<Banknote className="h-4 w-4" />}
                    label="Dinheiro"
                  />
                  <PaymentButton 
                    active={paymentMethod === 'pix'} 
                    onClick={() => setPaymentMethod('pix')}
                    icon={<QrCode className="h-4 w-4" />}
                    label="Pix"
                  />
                  <PaymentButton 
                    active={paymentMethod === 'cartao'} 
                    onClick={() => setPaymentMethod('cartao')}
                    icon={<CreditCard className="h-4 w-4" />}
                    label="Cartão"
                  />
                </div>

                <Button 
                  className="w-full h-16 text-xl font-bold uppercase shadow-lg" 
                  size="lg"
                  disabled={cart.length === 0 || submitting}
                  onClick={finalizeOrder}
                >
                  {submitting ? <Loader2 className="animate-spin" /> : <><Printer className="mr-2" /> Finalizar Pedido</>}
                </Button>
                <Button variant="ghost" className="w-full text-muted-foreground" onClick={clearCart}>Limpar Carrinho</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <PrintTickets tickets={printableTickets} />
    </AppShell>
  );
}

function PaymentButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <Button 
      variant={active ? 'default' : 'outline'} 
      className={`flex flex-col h-16 gap-1 ${active ? 'ring-2 ring-primary ring-offset-2' : ''}`}
      onClick={onClick}
    >
      {icon}
      <span className="text-[10px] font-bold uppercase">{label}</span>
    </Button>
  );
}
