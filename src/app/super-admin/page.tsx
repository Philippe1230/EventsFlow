
"use client";

import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/use-auth-context';
import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Building2, ShieldCheck, Loader2, Key, Copy, Check } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export default function SuperAdminPage() {
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [users, setUsers] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isSuperAdmin) {
      router.replace('/');
    }
  }, [authLoading, isSuperAdmin, router]);

  useEffect(() => {
    if (!isSuperAdmin) return;

    async function fetchData() {
      setLoading(true);
      try {
        const usersSnap = await getDocs(query(collection(db, 'userProfiles'), orderBy('createdAt', 'desc')));
        const tenantsSnap = await getDocs(query(collection(db, 'tenants'), orderBy('createdAt', 'desc')));
        
        setUsers(usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setTenants(tenantsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Erro ao buscar dados globais:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [db, isSuperAdmin]);

  const copyToClipboard = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast({ title: "Copiado!", description: "Senha enviada para a área de transferência." });
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (authLoading || !isSuperAdmin) return null;

  return (
    <AppShell>
      <div className="flex flex-col gap-10 max-w-7xl mx-auto mb-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-4xl font-black text-primary uppercase tracking-tighter italic leading-none">Painel do Fundador</h2>
            <p className="text-muted-foreground font-medium italic">Gestão centralizada de credenciais e eventos do Flow Events.</p>
          </div>
          <div className="flex gap-4">
            <div className="bg-primary/10 border border-primary/20 rounded-2xl px-6 py-3 flex items-center gap-3">
              <Users className="h-5 w-5 text-primary" />
              <div className="flex flex-col">
                <span className="text-lg font-black text-primary leading-none">{users.length}</span>
                <span className="text-[9px] font-black uppercase text-primary/60 tracking-widest">Usuários</span>
              </div>
            </div>
            <div className="bg-secondary/10 border border-secondary/20 rounded-2xl px-6 py-3 flex items-center gap-3">
              <Building2 className="h-5 w-5 text-secondary" />
              <div className="flex flex-col">
                <span className="text-lg font-black text-secondary leading-none">{tenants.length}</span>
                <span className="text-[9px] font-black uppercase text-secondary/60 tracking-widest">Eventos</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <Card className="lg:col-span-8 border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-card">
            <CardHeader className="bg-primary p-8 text-white">
              <CardTitle className="flex items-center gap-3 text-xl font-black uppercase tracking-widest">
                <ShieldCheck className="h-6 w-6" /> Credenciais de Acesso
              </CardTitle>
              <CardDescription className="text-white/70 font-bold uppercase text-[10px] tracking-[0.2em]">Consulte senhas para suporte rápido</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow className="border-primary/5 hover:bg-transparent">
                      <TableHead className="py-6 pl-8 font-black uppercase text-[10px] tracking-widest">Usuário</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest">E-mail</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest">Senha Suporte</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest text-right pr-8">Data Cadastro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={4} className="py-20 text-center"><Loader2 className="animate-spin h-10 w-10 mx-auto text-primary opacity-20" /></TableCell></TableRow>
                    ) : users.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="py-20 text-center text-muted-foreground font-black uppercase text-xs">Nenhum usuário cadastrado.</TableCell></TableRow>
                    ) : users.map(user => (
                      <TableRow key={user.id} className="border-primary/5 hover:bg-primary/5 transition-colors group">
                        <TableCell className="py-6 pl-8">
                          <div className="flex flex-col">
                            <span className="font-black uppercase text-xs text-primary">{user.displayName}</span>
                            <span className="text-[9px] font-bold text-muted-foreground">ID: {user.id.substring(0, 8)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-bold text-muted-foreground text-xs italic">{user.email}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2 bg-primary/5 border border-primary/10 rounded-lg px-3 py-1.5 min-w-[120px]">
                              <Key className="h-3 w-3 text-primary/40" />
                              <span className="font-mono text-xs font-black text-primary">{user.password || '******'}</span>
                            </div>
                            {user.password && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => copyToClipboard(user.password, user.id)}
                                className="h-8 w-8 rounded-lg text-primary/40 hover:text-primary hover:bg-primary/10"
                              >
                                {copiedId === user.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-8 font-bold text-muted-foreground text-[10px]">
                          {user.createdAt?.toDate ? format(user.createdAt.toDate(), 'dd/MM/yyyy', { locale: ptBR }) : '---'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-4 border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-card">
            <CardHeader className="bg-secondary p-8 text-white">
              <CardTitle className="flex items-center gap-3 text-xl font-black uppercase tracking-widest">
                <Building2 className="h-6 w-6" /> Eventos Ativos
              </CardTitle>
              <CardDescription className="text-white/70 font-bold uppercase text-[10px] tracking-[0.2em]">Organizações no Sistema</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow className="border-primary/5 hover:bg-transparent">
                      <TableHead className="py-6 pl-8 font-black uppercase text-[10px] tracking-widest">Evento</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest text-right pr-8">Equipe</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={2} className="py-20 text-center"><Loader2 className="animate-spin h-10 w-10 mx-auto text-primary opacity-20" /></TableCell></TableRow>
                    ) : tenants.length === 0 ? (
                      <TableRow><TableCell colSpan={2} className="py-20 text-center text-muted-foreground font-black uppercase text-xs">Nenhum evento criado.</TableCell></TableRow>
                    ) : tenants.map(tenant => (
                      <TableRow key={tenant.id} className="border-primary/5 hover:bg-secondary/5 transition-colors group">
                        <TableCell className="py-6 pl-8">
                          <div className="flex flex-col">
                            <span className="font-black uppercase text-xs text-secondary">{tenant.name}</span>
                            <span className="text-[9px] font-bold text-muted-foreground">ID: {tenant.id.substring(0, 8)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-8">
                          <Badge variant="secondary" className="font-black text-[9px] uppercase px-3 py-1 bg-secondary/10 text-secondary border-none">
                            {Object.keys(tenant.members || {}).length} Membros
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
