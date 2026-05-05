
"use client";

import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/use-auth-context';
import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Building2, Calendar, ShieldCheck, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRouter } from 'next/navigation';

export default function SuperAdminPage() {
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const db = useFirestore();
  const router = useRouter();
  
  const [users, setUsers] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (authLoading || !isSuperAdmin) return null;

  return (
    <AppShell>
      <div className="flex flex-col gap-10 max-w-7xl mx-auto mb-20">
        <div>
          <h2 className="text-4xl font-black text-primary uppercase tracking-tighter italic">Painel do Fundador</h2>
          <p className="text-muted-foreground font-medium italic">Visão global de todos os eventos e usuários do Flow Events.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-card">
            <CardHeader className="bg-primary p-8 text-white">
              <CardTitle className="flex items-center gap-3 text-xl font-black uppercase tracking-widest">
                <Users className="h-6 w-6" /> Usuários Cadastrados
              </CardTitle>
              <CardDescription className="text-white/70 font-bold uppercase text-[10px] tracking-[0.2em]">Todos os donos e operadores</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow className="border-primary/5 hover:bg-transparent">
                      <TableHead className="py-6 pl-8 font-black uppercase text-[10px] tracking-widest">Usuário</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest">E-mail</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest text-right pr-8">Criado em</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={3} className="py-20 text-center"><Loader2 className="animate-spin h-10 w-10 mx-auto text-primary opacity-20" /></TableCell></TableRow>
                    ) : users.map(user => (
                      <TableRow key={user.id} className="border-primary/5 hover:bg-primary/5 transition-colors group">
                        <TableCell className="py-6 pl-8 font-black uppercase text-xs text-primary group-hover:translate-x-1 transition-transform">{user.displayName}</TableCell>
                        <TableCell className="font-bold text-muted-foreground text-xs italic">{user.email}</TableCell>
                        <TableCell className="text-right pr-8 font-bold text-muted-foreground text-[10px]">
                          {user.createdAt?.toDate ? format(user.createdAt.toDate(), 'dd MMM yy', { locale: ptBR }) : '---'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-card">
            <CardHeader className="bg-secondary p-8 text-white">
              <CardTitle className="flex items-center gap-3 text-xl font-black uppercase tracking-widest">
                <Building2 className="h-6 w-6" /> Eventos Ativos
              </CardTitle>
              <CardDescription className="text-white/70 font-bold uppercase text-[10px] tracking-[0.2em]">Organizações e Faturamento Central</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow className="border-primary/5 hover:bg-transparent">
                      <TableHead className="py-6 pl-8 font-black uppercase text-[10px] tracking-widest">Nome do Evento</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest">Membros</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest text-right pr-8">ID do Evento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={3} className="py-20 text-center"><Loader2 className="animate-spin h-10 w-10 mx-auto text-primary opacity-20" /></TableCell></TableRow>
                    ) : tenants.map(tenant => (
                      <TableRow key={tenant.id} className="border-primary/5 hover:bg-secondary/5 transition-colors group">
                        <TableCell className="py-6 pl-8 font-black uppercase text-xs text-secondary group-hover:translate-x-1 transition-transform">{tenant.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-black text-[9px] uppercase px-2 py-0.5">
                            {Object.keys(tenant.members || {}).length} Integrantes
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-8 font-mono text-[9px] text-muted-foreground opacity-50">{tenant.id}</TableCell>
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
