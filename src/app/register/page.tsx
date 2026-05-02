
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

const JuninaFlagsIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M2 4c5 0 5 4 10 4s5-4 10-4" />
    <path d="M4 4v7l3-2 3 2V4" />
    <path d="M14 4v7l3-2 3 2V4" />
  </svg>
);

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
      // 1. Criar usuário no Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Criar Perfil do Usuário
      await setDoc(doc(db, 'userProfiles', user.uid), {
        id: user.uid,
        email: user.email,
        displayName: name,
        createdAt: new Date()
      });

      // 3. Criar o Tenant (Organização) com dados denormalizados do proprietário
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

      // 4. Criar a Membership ligando o usuário ao tenant
      await addDoc(collection(db, 'userProfiles', user.uid, 'memberships'), {
        userId: user.uid,
        tenantId: tenantRef.id,
        role: 'owner',
        joinedAt: new Date()
      });

      // 5. Adicionar produtos iniciais (seed) para o novo tenant
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
      <Card className="w-full max-w-md shadow-xl border-primary/10">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-primary p-3 rounded-2xl text-white shadow-lg">
              <JuninaFlagsIcon className="h-8 w-8" />
            </div>
          </div>
          <CardTitle className="text-2xl font-black uppercase text-primary">Novo Arraial</CardTitle>
          <CardDescription className="font-medium">Crie sua conta e organize sua festa junina.</CardDescription>
        </CardHeader>
        <form onSubmit={handleRegister}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Seu Nome</Label>
              <Input 
                id="name" 
                placeholder="Ex: João Silva" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orgName">Nome da Festa/Organização</Label>
              <Input 
                id="orgName" 
                placeholder="Ex: Arraial da Paróquia" 
                value={orgName} 
                onChange={(e) => setOrgName(e.target.value)} 
                required 
              />
            </div>
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
                minLength={6}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full font-black uppercase" disabled={loading}>
              {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : "Criar meu Arraial"}
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              Já tem uma conta?{" "}
              <Link href="/login" className="text-primary font-bold hover:underline">
                Fazer login
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
