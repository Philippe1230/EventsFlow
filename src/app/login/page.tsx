"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useAuth as useFirebaseAuth } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { OrderTicketIcon } from '@/components/layout/AppShell';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const auth = useFirebaseAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: "Bem-vindo de volta!", description: "Entrando no Flow Events..." });
      
      // Se for o Master, força redirecionamento para o Painel Global
      if (email.toLowerCase() === 'flowevents@gmail.com') {
        router.push('/super-admin');
      } else {
        router.push('/');
      }
    } catch (error: any) {
      console.error("Erro no login:", error.code);
      let message = "E-mail ou senha incorretos.";
      
      if (error.code === 'auth/user-not-found') {
        message = "Usuário não encontrado. Se for seu primeiro acesso, use a tela de Registro.";
      } else if (error.code === 'auth/wrong-password') {
        message = "Senha incorreta. Verifique suas credenciais.";
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
              />
            </div>

            {email.toLowerCase() === 'flowevents@gmail.com' && (
              <div className="flex items-start gap-2 p-3 bg-primary/5 border border-primary/10 rounded-xl">
                <AlertCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p className="text-[10px] font-bold text-primary uppercase leading-tight tracking-tight">
                  Atenção Fundador: Caso não tenha criado sua conta ainda, vá em "Crie seu Evento".
                </p>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-6 p-6 sm:p-10">
            <Button type="submit" className="w-full h-16 font-black uppercase text-lg rounded-2xl shadow-2xl shadow-primary/30 transition-all hover:scale-[1.02] active:scale-95" disabled={loading}>
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