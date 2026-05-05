"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, collection, addDoc } from 'firebase/firestore';
import { useAuth as useFirebaseAuth, useFirestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { OrderTicketIcon } from '@/components/layout/AppShell';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const auth = useFirebaseAuth();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Criar Perfil de Usuário
      await setDoc(doc(db, 'userProfiles', user.uid), {
        id: user.uid,
        email: user.email,
        displayName: name,
        createdAt: new Date()
      });

      // Lógica Especial para o Super Admin
      if (email.toLowerCase() === 'flowevents@gmail.com') {
        toast({ 
          title: "Fundador Registrado!", 
          description: "Acesso mestre concedido. Bem-vindo ao Controle Global." 
        });
        router.push('/super-admin');
        return;
      }

      // Lógica Normal para outros usuários (Criação de Evento)
      const tenantRef = await addDoc(collection(db, 'tenants'), {
        name: orgName,
        createdAt: new Date(),
        members: {
          [user.uid]: {
            role: 'owner',
            name: name,
            email: email
          }
        }
      });

      await addDoc(collection(db, 'userProfiles', user.uid, 'memberships'), {
        userId: user.uid,
        tenantId: tenantRef.id,
        role: 'owner',
        joinedAt: new Date()
      });

      // Produtos iniciais de exemplo
      const initialProducts = [
        { name: 'Água Mineral', price: 5.0, category: 'Bebidas', active: true, tenantId: tenantRef.id, createdAt: new Date() },
        { name: 'Cerveja Lata', price: 12.0, category: 'Bebidas', active: true, tenantId: tenantRef.id, createdAt: new Date() },
      ];

      for (const p of initialProducts) {
        await addDoc(collection(db, 'tenants', tenantRef.id, 'products'), p);
      }

      toast({ title: "Evento criado!", description: "Sua conta Flow Events foi configurada." });
      router.push('/');
    } catch (error: any) {
      console.error(error);
      let message = "Erro ao criar conta.";
      if (error.code === 'auth/email-already-in-use') {
        message = "Este e-mail já está em uso.";
      }
      toast({ title: "Erro no registro", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md shadow-2xl border-primary/10 rounded-[2.5rem] overflow-hidden my-8">
        <CardHeader className="text-center pt-10 pb-6">
          <div className="flex justify-center mb-6">
            <div className="bg-primary p-4 rounded-2xl text-white shadow-xl -rotate-3">
              <OrderTicketIcon className="h-8 w-8" />
            </div>
          </div>
          <CardTitle className="text-3xl font-black uppercase text-primary tracking-tighter">Novo Evento</CardTitle>
          <CardDescription className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground mt-2">Cadastre-se no Flow Events</CardDescription>
        </CardHeader>
        <form onSubmit={handleRegister}>
          <CardContent className="space-y-4 px-6 sm:px-10">
            <div className="space-y-1">
              <Label htmlFor="name" className="font-black uppercase text-[10px] ml-1 text-muted-foreground">Seu Nome</Label>
              <Input 
                id="name" 
                placeholder="Ex: João Silva" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                required 
                className="h-12 rounded-xl border-primary/10 bg-muted/20 font-bold px-5"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email" className="font-black uppercase text-[10px] ml-1 text-muted-foreground">E-mail</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="seu@email.com" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                className="h-12 rounded-xl border-primary/10 bg-muted/20 font-bold px-5"
              />
            </div>
            {email.toLowerCase() !== 'flowevents@gmail.com' && (
              <div className="space-y-1">
                <Label htmlFor="orgName" className="font-black uppercase text-[10px] ml-1 text-muted-foreground">Nome do Evento</Label>
                <Input 
                  id="orgName" 
                  placeholder="Ex: Festival de Verão" 
                  value={orgName} 
                  onChange={(e) => setOrgName(e.target.value)} 
                  required 
                  className="h-12 rounded-xl border-primary/10 bg-muted/20 font-bold px-5"
                />
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="password" className="font-black uppercase text-[10px] ml-1 text-muted-foreground">Senha</Label>
              <Input 
                id="password" 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                minLength={6}
                className="h-12 rounded-xl border-primary/10 bg-muted/20 font-bold px-5"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 p-6 sm:p-10">
            <Button type="submit" className="w-full h-16 font-black uppercase text-lg rounded-2xl shadow-xl shadow-primary/20" disabled={loading}>
              {loading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : "Criar meu Flow Events"}
            </Button>
            <p className="text-sm text-center text-muted-foreground font-medium">
              Já tem uma conta?{" "}
              <Link href="/login" className="text-primary font-black hover:underline uppercase text-xs tracking-tighter">
                Fazer login
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}