
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
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { JuninaFlagsIcon } from '@/components/layout/AppShell';

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
      toast({ title: "Bem-vindo de volta!", description: "Entrando no seu Arraial..." });
      router.push('/');
    } catch (error: any) {
      let message = "Erro ao entrar. Verifique seus dados.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        message = "E-mail ou senha incorretos.";
      }
      toast({ title: "Erro no login", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md shadow-2xl border-primary/10 rounded-[2rem] overflow-hidden">
        <CardHeader className="text-center pt-10">
          <div className="flex justify-center mb-6">
            <div className="bg-primary p-5 rounded-[1.5rem] text-white shadow-xl rotate-3 scale-110">
              <JuninaFlagsIcon className="h-10 w-10" />
            </div>
          </div>
          <CardTitle className="text-3xl font-black uppercase text-primary tracking-tighter">Arraial PDV</CardTitle>
          <CardDescription className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground mt-2">Acesse sua organização</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-6 px-8">
            <div className="space-y-2">
              <Label htmlFor="email" className="font-bold uppercase text-[10px] ml-1">E-mail</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="seu@email.com" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                className="h-12 rounded-xl border-primary/10 focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="font-bold uppercase text-[10px] ml-1">Senha</Label>
              <Input 
                id="password" 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                className="h-12 rounded-xl border-primary/10 focus:border-primary"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-6 p-8">
            <Button type="submit" className="w-full h-14 font-black uppercase text-lg rounded-2xl shadow-xl shadow-primary/20" disabled={loading}>
              {loading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : "Entrar no Arraial"}
            </Button>
            <p className="text-sm text-center text-muted-foreground font-medium">
              Ainda não tem uma conta?{" "}
              <Link href="/register" className="text-primary font-black hover:underline uppercase text-xs">
                Crie seu Arraial
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
