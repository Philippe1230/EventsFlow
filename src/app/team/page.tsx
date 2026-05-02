
"use client";

import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/use-auth-context';
import { useState, useEffect } from 'react';
import { doc, updateDoc, onSnapshot, collection, setDoc, addDoc, deleteField } from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth as getFirebaseAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore as getFirebaseFirestore } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { firebaseConfig } from '@/firebase/config';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Trash2, Loader2, ShieldCheck, ShoppingCart, Key } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function TeamPage() {
  const { tenantId, loading: authLoading, role } = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && role !== 'owner') {
      router.push('/pdv');
    }
  }, [authLoading, role, router]);

  useEffect(() => {
    if (!tenantId || authLoading) return;

    setLoading(true);
    const unsubscribe = onSnapshot(doc(db, 'tenants', tenantId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const memberList: any[] = [];
        
        if (data.members) {
          Object.entries(data.members).forEach(([uid, info]: [string, any]) => {
            if (info && typeof info === 'object') {
              memberList.push({ 
                id: uid, 
                name: info.name || 'Sem nome', 
                email: info.email || 'Sem e-mail',
                role: info.role || 'cashier', 
              });
            }
          });
        }
        setMembers(memberList);
      }
      setLoading(false);
    }, (error) => {
      console.error("Erro ao ouvir equipe:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [tenantId, authLoading, db]);

  const handleCreateCashier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name || !tenantId) return;

    setSubmitting(true);
    let tempApp;

    try {
      const appName = `temp-app-${Date.now()}`;
      tempApp = initializeApp(firebaseConfig, appName);
      const tempAuth = getFirebaseAuth(tempApp);
      const tempDb = getFirebaseFirestore(tempApp);

      const userCred = await createUserWithEmailAndPassword(tempAuth, email, password);
      const newUid = userCred.user.uid;

      await setDoc(doc(tempDb, 'userProfiles', newUid), {
        id: newUid,
        email: email,
        displayName: name,
        createdAt: new Date()
      });

      await addDoc(collection(tempDb, 'userProfiles', newUid, 'memberships'), {
        userId: newUid,
        tenantId: tenantId,
        role: 'cashier',
        joinedAt: new Date()
      });

      const tenantRef = doc(db, 'tenants', tenantId);
      await updateDoc(tenantRef, {
        [`members.${newUid}`]: {
          role: 'cashier',
          name: name,
          email: email
        }
      });

      toast({ 
        title: 'Caixa Criado!', 
        description: `O acesso para ${name} foi gerado com sucesso.` 
      });
      
      setName('');
      setEmail('');
      setPassword('');
    } catch (error: any) {
      console.error(error);
      toast({ title: 'Erro', description: error.message || 'Não foi possível criar o caixa.', variant: 'destructive' });
    } finally {
      if (tempApp) {
        try {
          await deleteApp(tempApp);
        } catch (e) {}
      }
      setSubmitting(false);
    }
  };

  const removeMember = async (uid: string) => {
    if (!confirm('Deseja excluir este acesso permanentemente?') || !tenantId) return;

    try {
      const tenantRef = doc(db, 'tenants', tenantId);
      await updateDoc(tenantRef, {
        [`members.${uid}`]: deleteField()
      });
      toast({ title: 'Sucesso', description: 'Acesso removido do Arraial.' });
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro', description: 'Erro ao remover acesso.', variant: 'destructive' });
    }
  };

  if (role !== 'owner') return null;

  return (
    <AppShell>
      <div className="flex flex-col gap-8">
        <div>
          <h2 className="text-3xl font-black text-primary uppercase">Gestão da Equipe</h2>
          <p className="text-muted-foreground font-medium">Crie e gerencie os acessos dos seus caixas.</p>
        </div>

        <Card className="border-primary/10 shadow-lg overflow-hidden">
          <CardHeader className="bg-primary/5">
            <CardTitle className="text-lg font-black uppercase text-primary flex items-center gap-2">
              <UserPlus className="h-5 w-5" /> Gerar Novo Acesso de Caixa
            </CardTitle>
            <CardDescription className="font-bold">Defina as credenciais que o caixa usará para entrar.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleCreateCashier} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="name" className="font-bold">Identificação (Nome)</Label>
                <Input 
                  id="name" 
                  placeholder="Ex: Caixa 1" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="font-bold">E-mail de Login</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="caixa1@arraial.com" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="font-bold">Senha Inicial</Label>
                <div className="relative">
                  <Input 
                    id="password" 
                    type="text" 
                    placeholder="senha123" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required
                  />
                  <Key className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <div className="md:col-span-3 flex justify-end">
                <Button type="submit" className="font-black uppercase px-8 h-12 rounded-xl shadow-lg" disabled={submitting}>
                  {submitting ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : "Gerar Acesso Imediato"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="rounded-xl border bg-card shadow-md overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-black uppercase text-[10px]">Identificação</TableHead>
                <TableHead className="font-black uppercase text-[10px]">E-mail de Login</TableHead>
                <TableHead className="font-black uppercase text-[10px]">Papel</TableHead>
                <TableHead className="text-right font-black uppercase text-[10px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : members.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12 text-muted-foreground font-bold">
                    Nenhum outro membro na equipe.
                  </TableCell>
                </TableRow>
              ) : (
                members.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-black text-primary uppercase">
                      {m.name}
                    </TableCell>
                    <TableCell className="font-medium text-muted-foreground">
                      {m.email}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {m.role === 'owner' ? <ShieldCheck className="h-4 w-4 text-primary" /> : <ShoppingCart className="h-4 w-4 text-muted-foreground" />}
                        <Badge variant={m.role === 'owner' ? 'default' : 'secondary'} className="font-black text-[10px] uppercase">
                          {m.role === 'owner' ? 'Admin / Dono' : 'Operador de Caixa'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {m.role !== 'owner' && (
                        <Button variant="ghost" size="icon" onClick={() => removeMember(m.id)} className="text-destructive hover:bg-destructive/5">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppShell>
  );
}
