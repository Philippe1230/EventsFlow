"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useAuth as useFirebaseAuth } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle, WifiOff } from 'lucide-react';
import Link from 'next/link';
import { OrderTicketIcon } from '@/components/layout/AppShell';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const auth = useFirebaseAuth();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isOnline) {
      toast({ 
        title: "Sem conexão", 
        description: "Você precisa de internet para fazer o primeiro acesso. Se já logou antes, tente recarregar a página.", 
        variant: "destructive" 
      });
      return;
    }

    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: "Bem-vindo de volta!", description: "Entrando no Flow Events..." });
      
      if (email.toLowerCase() === 'flowevents@gmail.com') {
        router.push('/super-admin');
      } else {
        router.push('/');
      }
    } catch (error: any) {
      console.error("Erro no login:", error.code);
      let message = "E-mail ou senha incorretos.";
      
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        message = "Usuário ou senha inválidos.";
      } else if (error.code === 'auth/wrong-password') {
        message = "Senha incorreta.";
      } else if (error.code === 'auth/network-request-failed') {
        message = "Erro de conexão. Verifique sua internet.";
      }
      
      toast({ 
        title: "Erro no acesso", 
        description: message, 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md shadow-2xl border-primary/10 rounded-[2.5rem] overflow-hidden">
        <CardHeader className="text-center pt-12 pb-8">
          <div className="flex justify-center mb-6">
            <div className="bg-primary p-5 rounded-[1.5rem] text-white shadow-xl rotate-3 scale-110">
              <OrderTicketIcon className="h-10 w-10" />
            </div>
          </div>
          <CardTitle className="text-3xl font-black uppercase text-primary tracking-tighter">Flow Events</CardTitle>
          <CardDescription className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground mt-2">Acesse sua conta</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-6 px-6 sm:px-10">
            {!isOnline && (
              <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-2xl text-destructive">
                <WifiOff className="h-5 w-5 shrink-0" />
                <p className="text-[10px] font-black uppercase leading-tight tracking-widest">
                  Você está offline. Conecte-se para validar seu acesso.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="font-black uppercase text-[10px] ml-1 tracking-wider text-muted-foreground">E-mail</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="seu@email.com" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                className="h-14 rounded-2xl border-primary/10 focus:border-primary bg-muted/30 font-bold px-6"
                disabled={!isOnline}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="font-black uppercase text-[10px] ml-1 tracking-wider text-muted-foreground">Senha</Label>
              <Input 
                id="password" 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                className="h-14 rounded-2xl border-primary/10 focus:border-primary bg-muted/30 font-bold px-6"
                disabled={!isOnline}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-6 p-6 sm:p-10">
            <Button type="submit" className="w-full h-16 font-black uppercase text-lg rounded-2xl shadow-2xl shadow-primary/30 transition-all hover:scale-[1.02] active:scale-95" disabled={loading || !isOnline}>
              {loading ? <Loader2 className="animate-spin mr-2 h-6 w-6" /> : "Entrar no Flow Events"}
            </Button>
            <p className="text-sm text-center text-muted-foreground font-medium">
              Não tem uma conta?{" "}
              <Link href="/register" className="text-primary font-black hover:underline uppercase text-xs tracking-tighter">
                Crie seu Evento
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
