
"use client";

import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/use-auth-context';
import { useState, useEffect } from 'react';
import { doc, updateDoc, getDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Trash2, Loader2, ShieldCheck, ShoppingCart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function TeamPage() {
  const { tenantId, loading: authLoading, role, organizationName } = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && role !== 'owner') {
      router.push('/pdv');
    }
  }, [authLoading, role, router]);

  useEffect(() => {
    if (tenantId && !authLoading) fetchTeam();
  }, [tenantId, authLoading, db]);

  async function fetchTeam() {
    setLoading(true);
    try {
      const tenantRef = doc(db, 'tenants', tenantId!);
      const snap = await getDoc(tenantRef);
      if (snap.exists()) {
        const data = snap.data();
        const memberList = [];
        
        // Membros já cadastrados (pelo UID)
        if (data.members) {
          Object.entries(data.members).forEach(([uid, role]) => {
            memberList.push({ id: uid, role, status: 'Ativo' });
          });
        }
        
        // Convites pendentes (pelo e-mail)
        if (data.members_emails) {
          Object.entries(data.members_emails).forEach(([emailKey, role]) => {
            const emailAddr = emailKey.replace(/_/g, '.');
            memberList.push({ id: emailKey, email: emailAddr, role, status: 'Pendente' });
          });
        }
        
        setMembers(memberList);
      }
    } catch (e) {
      console.error("Erro ao buscar equipe:", e);
    }
    setLoading(false);
  }

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !tenantId) return;

    setSubmitting(true);
    try {
      const emailKey = email.toLowerCase().replace(/\./g, '_');
      const tenantRef = doc(db, 'tenants', tenantId);
      
      await updateDoc(tenantRef, {
        [`members_emails.${emailKey}`]: 'cashier'
      });

      toast({ title: 'Convite Enviado!', description: `A pessoa com e-mail ${email} agora pode se cadastrar e acessar este Arraial.` });
      setEmail('');
      fetchTeam();
    } catch (e) {
      toast({ title: 'Erro', description: 'Não foi possível adicionar o membro.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const removeMember = async (id: string, isEmail: boolean) => {
    if (!confirm('Deseja remover este acesso?') || !tenantId) return;

    try {
      const tenantRef = doc(db, 'tenants', tenantId);
      if (isEmail) {
        await updateDoc(tenantRef, {
          [`members_emails.${id}`]: null // Firestore delete field syntax
        });
      } else {
        await updateDoc(tenantRef, {
          [`members.${id}`]: null
        });
      }
      fetchTeam();
      toast({ title: 'Sucesso', description: 'Acesso removido.' });
    } catch (e) {
      toast({ title: 'Erro', description: 'Erro ao remover.' });
    }
  };

  if (role !== 'owner') return null;

  return (
    <AppShell>
      <div className="flex flex-col gap-8">
        <div>
          <h2 className="text-3xl font-black text-primary uppercase">Gestão da Equipe</h2>
          <p className="text-muted-foreground font-medium">Crie acessos para seus caixas trabalharem simultaneamente.</p>
        </div>

        <Card className="border-primary/10 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-black uppercase text-primary flex items-center gap-2">
              <UserPlus className="h-5 w-5" /> Adicionar Novo Caixa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddMember} className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor="email" className="font-bold">E-mail do Caixa</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="caixa@email.com" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required
                />
              </div>
              <Button type="submit" className="md:mt-8 font-black uppercase" disabled={submitting}>
                {submitting ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : "Autorizar Caixa"}
              </Button>
            </form>
            <div className="mt-4 p-4 bg-muted/50 rounded-xl border border-dashed text-sm">
              <p className="font-bold text-muted-foreground leading-relaxed">
                Como funciona: Ao autorizar um e-mail, essa pessoa poderá criar uma conta (ou usar uma existente) para entrar no seu Arraial como **Caixa**. Eles só terão acesso à tela de vendas.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="rounded-xl border bg-card shadow-md overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-black uppercase text-[10px]">Identificação / E-mail</TableHead>
                <TableHead className="font-black uppercase text-[10px]">Papel</TableHead>
                <TableHead className="font-black uppercase text-[10px]">Status</TableHead>
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
                    <TableCell className="font-bold">
                      {m.email || `Usuário ID: ...${m.id.slice(-6)}`}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {m.role === 'owner' ? <ShieldCheck className="h-4 w-4 text-primary" /> : <ShoppingCart className="h-4 w-4 text-muted-foreground" />}
                        <span className="font-bold text-xs uppercase">{m.role === 'owner' ? 'Admin' : 'Caixa'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={m.status === 'Ativo' ? 'default' : 'secondary'} className="font-black text-[10px]">
                        {m.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {m.role !== 'owner' && (
                        <Button variant="ghost" size="icon" onClick={() => removeMember(m.id, !!m.email)} className="text-destructive hover:bg-destructive/5">
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
