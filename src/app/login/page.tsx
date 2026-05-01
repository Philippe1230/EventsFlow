
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

const JuninaFlagsIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M2 4c5 0 5 4 10 4s5-4 10-4" />
    <path d="M4 4v7l3-2 3 2V4" />
    <path d="M14 4v7l3-2 3 2V4" />
  </svg>
);

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
      <Card className="w-full max-w-md shadow-xl border-primary/10">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-primary p-3 rounded-2xl text-white shadow-lg">
              <JuninaFlagsIcon className="h-8 w-8" />
            </div>
          </div>
          <CardTitle className="text-2xl font-black uppercase text-primary">Arraial PDV</CardTitle>
          <CardDescription className="font-medium">Acesse sua conta para gerenciar as vendas.</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="seu@email.com" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input 
                id="password" 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full font-black uppercase" disabled={loading}>
              {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : "Entrar no Arraial"}
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              Ainda não tem uma conta?{" "}
              <Link href="/register" className="text-primary font-bold hover:underline">
                Crie seu Arraial agora
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
