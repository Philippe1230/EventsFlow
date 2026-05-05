
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
import { JuninaFlagsIcon } from '@/components/layout/AppShell';

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

      await setDoc(doc(db, 'userProfiles', user.uid), {
        id: user.uid,
        email: user.email,
        displayName: name,
        createdAt: new Date()
      });

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

      const initialProducts = [
        { name: 'Pipoca', price: 5.0, category: 'Comida', active: true, tenantId: tenantRef.id, createdAt: new Date() },
        { name: 'Quentão', price: 8.0, category: 'Bebida', active: true, tenantId: tenantRef.id, createdAt: new Date() },
        { name: 'Milho Cozido', price: 6.0, category: 'Comida', active: true, tenantId: tenantRef.id, createdAt: new Date() },
        { name: 'Pescaria', price: 5.0, category: 'Brincadeira', active: true, tenantId: tenantRef.id, createdAt: new Date() },
      ];

      for (const p of initialProducts) {
        await addDoc(collection(db, 'tenants', tenantRef.id, 'products'), p);
      }

      toast({ title: "Arraial criado!", description: "Sua conta e organização foram configuradas." });
      router.push('/');
    } catch (error: any) {
      console.error(error);
      toast({ title: "Erro no registro", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md shadow-2xl border-primary/10 rounded-[2rem] overflow-hidden">
        <CardHeader className="text-center pt-8">
          <div className="flex justify-center mb-6">
            <div className="bg-primary p-4 rounded-2xl text-white shadow-xl -rotate-3">
              <JuninaFlagsIcon className="h-8 w-8" />
            </div>
          </div>
          <CardTitle className="text-3xl font-black uppercase text-primary tracking-tighter">Novo Arraial</CardTitle>
          <CardDescription className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground mt-2">Crie sua organização</CardDescription>
        </CardHeader>
        <form onSubmit={handleRegister}>
          <CardContent className="space-y-4 px-8">
            <div className="space-y-2">
              <Label htmlFor="name" className="font-bold uppercase text-[10px] ml-1">Seu Nome</Label>
              <Input 
                id="name" 
                placeholder="Ex: João Silva" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                required 
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orgName" className="font-bold uppercase text-[10px] ml-1">Nome da Festa</Label>
              <Input 
                id="orgName" 
                placeholder="Ex: Arraial da Paróquia" 
                value={orgName} 
                onChange={(e) => setOrgName(e.target.value)} 
                required 
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="font-bold uppercase text-[10px] ml-1">E-mail</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="seu@email.com" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                className="h-11 rounded-xl"
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
                minLength={6}
                className="h-11 rounded-xl"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 p-8">
            <Button type="submit" className="w-full h-14 font-black uppercase text-lg rounded-2xl shadow-xl shadow-primary/20" disabled={loading}>
              {loading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : "Criar meu Arraial"}
            </Button>
            <p className="text-sm text-center text-muted-foreground font-medium">
              Já tem uma conta?{" "}
              <Link href="/login" className="text-primary font-black hover:underline uppercase text-xs">
                Fazer login
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
