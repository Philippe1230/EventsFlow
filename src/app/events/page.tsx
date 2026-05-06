
"use client";

import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/use-auth-context';
import { useState, useEffect } from 'react';
import { collection, query, orderBy, addDoc, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, MapPin, Plus, Loader2, Edit3, ArrowRight, CheckCircle2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface Event {
  id: string;
  name: string;
  date: string;
  location: string;
  status: 'rascunho' | 'ativo' | 'finalizado';
  createdAt: any;
}

export default function EventsPage() {
  const { tenantId, role, loading: authLoading } = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<Partial<Event>>({
    name: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    location: '',
    status: 'rascunho'
  });

  const eventsQuery = useMemoFirebase(() => {
    if (!tenantId) return null;
    return query(collection(db, 'tenants', tenantId, 'events'), orderBy('createdAt', 'desc'));
  }, [tenantId, db]);

  const { data: events = [], isLoading } = useCollection<Event>(eventsQuery);

  const handleSave = async () => {
    if (!currentEvent.name || !tenantId) return;
    setSubmitting(true);
    try {
      if (isEditing && currentEvent.id) {
        const eventRef = doc(db, 'tenants', tenantId, 'events', currentEvent.id);
        await updateDoc(eventRef, { ...currentEvent });
      } else {
        await addDoc(collection(db, 'tenants', tenantId, 'events'), {
          ...currentEvent,
          tenantId,
          createdAt: Timestamp.now(),
          members: {} // Inicialmente vazio
        });
      }
      setIsDialogOpen(false);
      toast({ title: 'Sucesso!', description: 'Evento salvo com sucesso.' });
    } catch (e) {
      toast({ title: 'Erro', description: 'Erro ao salvar evento.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const openDialog = (event?: Event) => {
    if (event) {
      setCurrentEvent(event);
      setIsEditing(true);
    } else {
      setCurrentEvent({ name: '', date: format(new Date(), 'yyyy-MM-dd'), location: '', status: 'rascunho' });
      setIsEditing(false);
    }
    setIsDialogOpen(true);
  };

  if (role !== 'owner') return null;

  return (
    <AppShell>
      <div className="flex flex-col gap-10 max-w-7xl mx-auto mb-20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-1">
            <h2 className="text-4xl font-black text-primary uppercase tracking-tighter italic leading-none">Gestão de Eventos</h2>
            <p className="text-muted-foreground font-medium italic">Configure múltiplos eventos e suas respectivas equipes.</p>
          </div>
          <Button onClick={() => openDialog()} className="h-16 px-10 rounded-2xl font-black uppercase text-lg shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
            <Plus className="mr-2 h-6 w-6" /> Criar Novo Evento
          </Button>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-4 opacity-20">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <span className="font-black uppercase text-[10px] tracking-widest">Sincronizando Eventos...</span>
          </div>
        ) : events.length === 0 ? (
          <div className="bg-card border-2 border-dashed border-primary/10 rounded-[3rem] p-20 text-center">
            <CalendarIcon className="h-20 w-20 text-primary/10 mx-auto mb-6" />
            <h3 className="text-xl font-black uppercase text-muted-foreground">Nenhum evento cadastrado</h3>
            <p className="text-sm text-muted-foreground/60 mt-2">Clique no botão acima para começar.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {events.map((event) => (
              <Card key={event.id} className="border-none shadow-xl rounded-[2.5rem] overflow-hidden group hover:shadow-primary/20 transition-all duration-500">
                <CardHeader className="p-8 pb-4">
                  <div className="flex justify-between items-start mb-4">
                    <Badge className={cn(
                      "font-black uppercase text-[9px] tracking-widest px-3 py-1 rounded-lg border-none shadow-sm",
                      event.status === 'ativo' ? "bg-green-500 text-white" : 
                      event.status === 'rascunho' ? "bg-yellow-500 text-white" : "bg-muted text-muted-foreground"
                    )}>
                      {event.status}
                    </Badge>
                    <Button variant="ghost" size="icon" onClick={() => openDialog(event)} className="h-10 w-10 rounded-xl text-primary/40 hover:text-primary hover:bg-primary/5">
                      <Edit3 className="h-5 w-5" />
                    </Button>
                  </div>
                  <CardTitle className="text-2xl font-black uppercase tracking-tighter text-primary group-hover:translate-x-1 transition-transform">{event.name}</CardTitle>
                </CardHeader>
                <CardContent className="p-8 pt-0 space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <CalendarIcon className="h-4 w-4 text-primary" />
                      <span className="text-xs font-bold uppercase">{format(new Date(event.date + 'T00:00:00'), "dd 'de' MMMM", { locale: ptBR })}</span>
                    </div>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span className="text-xs font-bold uppercase truncate">{event.location || 'Local não definido'}</span>
                    </div>
                  </div>
                  <div className="pt-4 grid grid-cols-2 gap-3">
                    <Button asChild variant="secondary" className="font-black uppercase text-[10px] h-12 rounded-xl">
                      <Link href={`/events/${event.id}/config`}>Configurar</Link>
                    </Button>
                    <Button asChild className="font-black uppercase text-[10px] h-12 rounded-xl shadow-lg shadow-primary/10">
                      <Link href={`/pdv?eventId=${event.id}`}>Ir para o PDV <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="rounded-[2.5rem] border-none shadow-3xl p-0 overflow-hidden sm:max-w-md w-[95vw]">
          <DialogHeader className="bg-primary p-8 text-white">
            <DialogTitle className="text-3xl font-black uppercase tracking-tighter italic">
              {isEditing ? 'Editar Evento' : 'Novo Evento'}
            </DialogTitle>
            <DialogDescription className="text-white/70 font-bold uppercase text-[10px] tracking-widest">
              Defina as informações básicas do evento
            </DialogDescription>
          </DialogHeader>
          <div className="p-8 space-y-6">
            <div className="space-y-2">
              <Label className="font-black uppercase text-[10px] ml-1 tracking-widest text-muted-foreground">Nome do Evento</Label>
              <Input 
                placeholder="Ex: Arraial do Flow 2024"
                className="h-14 rounded-2xl border-primary/10 font-bold bg-muted/20 px-6"
                value={currentEvent.name} 
                onChange={(e) => setCurrentEvent({ ...currentEvent, name: e.target.value })} 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-black uppercase text-[10px] ml-1 tracking-widest text-muted-foreground">Data</Label>
                <Input 
                  type="date"
                  className="h-14 rounded-2xl border-primary/10 font-bold bg-muted/20 px-6"
                  value={currentEvent.date} 
                  onChange={(e) => setCurrentEvent({ ...currentEvent, date: e.target.value })} 
                />
              </div>
              <div className="space-y-2">
                <Label className="font-black uppercase text-[10px] ml-1 tracking-widest text-muted-foreground">Status</Label>
                <Select value={currentEvent.status} onValueChange={(v: any) => setCurrentEvent({ ...currentEvent, status: v })}>
                  <SelectTrigger className="h-14 rounded-2xl border-primary/10 font-bold bg-muted/20 px-6">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="rascunho" className="font-black uppercase text-xs">Rascunho</SelectItem>
                    <SelectItem value="ativo" className="font-black uppercase text-xs">Ativo</SelectItem>
                    <SelectItem value="finalizado" className="font-black uppercase text-xs">Finalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="font-black uppercase text-[10px] ml-1 tracking-widest text-muted-foreground">Local</Label>
              <Input 
                placeholder="Ex: Praça Central"
                className="h-14 rounded-2xl border-primary/10 font-bold bg-muted/20 px-6"
                value={currentEvent.location} 
                onChange={(e) => setCurrentEvent({ ...currentEvent, location: e.target.value })} 
              />
            </div>
          </div>
          <DialogFooter className="bg-muted/30 p-8 pt-4">
            <Button onClick={handleSave} className="w-full h-16 font-black uppercase text-xl rounded-2xl shadow-xl shadow-primary/20" disabled={submitting}>
              {submitting ? <Loader2 className="animate-spin h-6 w-6" /> : 'Confirmar Evento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
