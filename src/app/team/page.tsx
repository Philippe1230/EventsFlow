
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

      // Salvando perfil com senha visível para o Super Admin
      await setDoc(doc(tempDb, 'userProfiles', newUid), {
        id: newUid,
        email: email,
        displayName: name,
        password: password, // Armazenado para consulta do Super Admin
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
      toast({ title: 'Sucesso', description: 'Acesso removido do Evento.' });
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro', description: 'Erro ao remover acesso.', variant: 'destructive' });
    }
  };

  if (role !== 'owner') return null;

  return (
    <AppShell>
      <div className="flex flex-col gap-8 max-w-6xl mx-auto">
        <div>
          <h2 className="text-3xl font-black text-primary uppercase tracking-tighter">Gestão da Equipe</h2>
          <p className="text-muted-foreground font-medium italic">Crie e gerencie os acessos dos seus caixas.</p>
        </div>

        <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden bg-card">
          <CardHeader className="bg-primary/5 p-8 pb-4">
            <CardTitle className="text-xl font-black uppercase text-primary flex items-center gap-3">
              <UserPlus className="h-6 w-6" /> Novo Operador
            </CardTitle>
            <CardDescription className="font-bold uppercase text-[10px] tracking-widest">Defina as credenciais de acesso</CardDescription>
          </CardHeader>
          <CardContent className="p-8 pt-6">
            <form onSubmit={handleCreateCashier} className="flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="font-black uppercase text-[10px] ml-1">Nome do Caixa</Label>
                  <Input 
                    id="name" 
                    placeholder="Ex: Caixa Entrada" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    required
                    className="h-12 rounded-xl border-primary/10 font-bold px-4"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="font-black uppercase text-[10px] ml-1">E-mail de Login</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="caixa1@evento.com" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    required
                    className="h-12 rounded-xl border-primary/10 font-bold px-4"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="font-black uppercase text-[10px] ml-1">Senha Inicial</Label>
                  <div className="relative">
                    <Input 
                      id="password" 
                      type="text" 
                      placeholder="senha123" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      required
                      className="h-12 rounded-xl border-primary/10 font-bold px-4 pr-10"
                    />
                    <Key className="absolute right-3 top-3.5 h-5 w-5 text-primary/30" />
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" className="w-full md:w-auto font-black uppercase px-12 h-14 rounded-2xl shadow-xl shadow-primary/20 transition-all hover:scale-[1.02]" disabled={submitting}>
                  {submitting ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : "Gerar Acesso"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="rounded-[2.5rem] border border-primary/5 bg-card shadow-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-primary/5">
                  <TableHead className="font-black uppercase text-[10px] py-6 pl-8">Operador</TableHead>
                  <TableHead className="font-black uppercase text-[10px]">Acesso</TableHead>
                  <TableHead className="font-black uppercase text-[10px]">Papel</TableHead>
                  <TableHead className="text-right font-black uppercase text-[10px] pr-8">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-20">
                      <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
                    </TableCell>
                  </TableRow>
                ) : members.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-20 text-muted-foreground font-black uppercase text-xs">
                      Nenhum operador cadastrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  members.map((m) => (
                    <TableRow key={m.id} className="border-primary/5 hover:bg-primary/5 transition-colors group">
                      <TableCell className="font-black text-primary uppercase text-sm pl-8">
                        {m.name}
                      </TableCell>
                      <TableCell className="font-bold text-muted-foreground text-xs italic">
                        {m.email}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {m.role === 'owner' ? <ShieldCheck className="h-4 w-4 text-primary" /> : <ShoppingCart className="h-4 w-4 text-muted-foreground" />}
                          <Badge variant={m.role === 'owner' ? 'default' : 'secondary'} className="font-black text-[9px] uppercase tracking-tighter px-3 py-1">
                            {m.role === 'owner' ? 'Dono' : 'Caixa'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-8">
                        {m.role !== 'owner' && (
                          <Button variant="ghost" size="icon" onClick={() => removeMember(m.id)} className="h-10 w-10 rounded-xl text-destructive/40 hover:text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-5 w-5" />
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
      </div>
    </AppShell>
  );
}
