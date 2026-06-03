"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useAuth as useFirebaseAuth } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle, WifiOff, Smartphone, Download, Share2, PlusSquare, MoreVertical, ChevronRight, Laptop } from 'lucide-react';
import Link from 'next/link';
import { OrderTicketIcon } from '@/components/layout/AppShell';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showGuideDialog, setShowGuideDialog] = useState(false);

  const auth = useFirebaseAuth();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isPWA = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
      setIsStandalone(!!isPWA);
    }

    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isOnline) {
      toast({
        title: "Sem conexão",
        description: "Você precisa de internet para fazer o primeiro acesso. Se já logou antes, tente recarregar a página.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: "Bem-vindo de volta!", description: "Entrando no Flow Events..." });

      if (email.toLowerCase() === 'flowevents@gmail.com') {
        router.push('/super-admin');
      } else {
        router.push('/');
      }
    } catch (error: any) {
      console.error("Erro no login:", error.code);
      let message = "E-mail ou senha incorretos.";

      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        message = "Usuário ou senha inválidos.";
      } else if (error.code === 'auth/wrong-password') {
        message = "Senha incorreta.";
      } else if (error.code === 'auth/network-request-failed') {
        message = "Erro de conexão. Verifique sua internet.";
      }

      toast({
        title: "Erro no acesso",
        description: message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen items-center justify-center p-4 bg-background py-8">
      <Card className="w-full max-w-md shadow-2xl border-primary/10 rounded-[2.5rem] overflow-hidden">
        <CardHeader className="text-center pt-12 pb-8">
          <div className="flex justify-center mb-6">
            <div className="bg-primary p-5 rounded-[1.5rem] text-white shadow-xl rotate-3 scale-110">
              <OrderTicketIcon className="h-10 w-10" />
            </div>
          </div>
          <CardTitle className="text-3xl font-black uppercase text-primary tracking-tighter">Flow Events</CardTitle>
          <CardDescription className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground mt-2">Acesse sua conta</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-6 px-6 sm:px-10">
            {!isOnline && (
              <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-2xl text-destructive">
                <WifiOff className="h-5 w-5 shrink-0" />
                <p className="text-[10px] font-black uppercase leading-tight tracking-widest">
                  Você está offline. Conecte-se para validar seu acesso.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="font-black uppercase text-[10px] ml-1 tracking-wider text-muted-foreground">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-14 rounded-2xl border-primary/10 focus:border-primary bg-muted/30 font-bold px-6"
                disabled={!isOnline}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="font-black uppercase text-[10px] ml-1 tracking-wider text-muted-foreground">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-14 rounded-2xl border-primary/10 focus:border-primary bg-muted/30 font-bold px-6"
                disabled={!isOnline}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-6 p-6 sm:p-10">
            <Button type="submit" className="w-full h-16 font-black uppercase text-lg rounded-2xl shadow-2xl shadow-primary/30 transition-all hover:scale-[1.02] active:scale-95" disabled={loading || !isOnline}>
              {loading ? <Loader2 className="animate-spin mr-2 h-6 w-6" /> : "Entrar no Flow Events"}
            </Button>
            <p className="text-sm text-center text-muted-foreground font-medium">
              Não tem uma conta?{" "}
              <Link href="/register" className="text-primary font-black hover:underline uppercase text-xs tracking-tighter">
                Crie seu Evento
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>

      {!isStandalone && (
        <div className="w-full max-w-md mt-6 animate-in slide-in-from-bottom-2 duration-300">
          <Card className="rounded-[2.5rem] border-primary/10 bg-card/60 backdrop-blur-sm shadow-xl overflow-hidden border">
            <CardContent className="p-8 flex flex-col items-center text-center gap-4">
              <div className="inline-flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-wider bg-primary/10 px-3 py-1.5 rounded-full">
                <Smartphone className="h-4 w-4" /> Instale o Aplicativo (PWA)
              </div>
              <p className="text-xs font-bold text-muted-foreground leading-snug">
                Tenha vendas em tela cheia, latência zero, acesso rápido offline e sem barras de navegação instalando o app no seu dispositivo.
              </p>
              <div className="flex flex-col gap-3 w-full mt-2">
                <div className="flex gap-3 w-full">
                  {deferredPrompt ? (
                    <Button onClick={handleInstallClick} className="flex-1 h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg bg-primary hover:bg-primary/90 text-white">
                      <Download className="mr-2 h-4 w-4" /> Instalar App
                    </Button>
                  ) : (
                    <Button onClick={() => setShowGuideDialog(true)} className="flex-1 h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg bg-primary hover:bg-primary/90 text-white">
                      <Download className="mr-2 h-4 w-4" /> Celular (PWA)
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setShowGuideDialog(true)} className="h-14 px-6 rounded-2xl font-black uppercase text-[10px] border-primary/20 text-primary hover:bg-primary/5">
                    Como Instalar
                  </Button>
                </div>
                <div className="w-full border-t border-primary/5 my-1" />
                <Button asChild variant="secondary" className="w-full h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-md border border-primary/10">
                  <a href="https://github.com/Philippe1230/EventsFlow/releases/download/v1.0.0/Flow.Events.PDV.Setup.1.0.0.exe" download="flow-events-setup.exe" className="flex items-center justify-center gap-2">
                    <Laptop className="h-4 w-4 text-primary" /> Baixar para Windows (.EXE)
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={showGuideDialog} onOpenChange={setShowGuideDialog}>
        <DialogContent className="rounded-[2.5rem] border-none p-0 overflow-hidden sm:max-w-md w-[92vw] !top-[50%] !translate-y-[-50%] shadow-4xl bg-card">
          <DialogHeader className="bg-primary p-8 text-white text-center">
            <Smartphone className="h-12 w-12 mx-auto mb-3 opacity-60 animate-pulse" />
            <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter">Como Instalar o App</DialogTitle>
            <DialogDescription className="text-white/70 font-black text-[9px] uppercase tracking-[0.2em] mt-1">Siga o passo a passo para o seu aparelho</DialogDescription>
          </DialogHeader>
          <div className="p-6">
            <Tabs defaultValue="ios" className="w-full">
              <TabsList className="grid grid-cols-2 rounded-xl bg-muted p-1 mb-6">
                <TabsTrigger value="ios" className="rounded-lg font-black uppercase text-[9px] tracking-widest"> Apple (iOS)</TabsTrigger>
                <TabsTrigger value="android" className="rounded-lg font-black uppercase text-[9px] tracking-widest">🤖 Android / Chrome</TabsTrigger>
              </TabsList>
              <TabsContent value="ios" className="space-y-4 animate-in fade-in duration-200">
                <div className="space-y-3">
                  <div className="flex gap-4 items-start bg-primary/5 p-4 rounded-2xl border border-primary/5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white text-xs font-black shrink-0">1</span>
                    <p className="text-xs font-bold leading-normal text-foreground">
                      Abra o site no navegador oficial da Apple, o <strong className="text-primary font-black uppercase text-[10px]">Safari</strong> (essencial para o iOS).
                    </p>
                  </div>
                  <div className="flex gap-4 items-start bg-primary/5 p-4 rounded-2xl border border-primary/5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white text-xs font-black shrink-0">2</span>
                    <div className="space-y-1">
                      <p className="text-xs font-bold leading-normal text-foreground">
                        Toque no botão de Compartilhar na barra de ferramentas inferior do Safari:
                      </p>
                      <div className="flex items-center justify-center p-2 bg-background border border-primary/15 rounded-xl w-fit mt-1.5">
                        <Share2 className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4 items-start bg-primary/5 p-4 rounded-2xl border border-primary/5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white text-xs font-black shrink-0">3</span>
                    <div className="space-y-1">
                      <p className="text-xs font-bold leading-normal text-foreground">
                        Role a lista para baixo e selecione a opção <strong className="text-primary font-black uppercase text-[10px]">Adicionar à Tela de Início</strong>:
                      </p>
                      <div className="flex items-center gap-2 p-2 px-3 bg-background border border-primary/15 rounded-xl w-fit mt-1.5 font-black uppercase text-[8px] tracking-wider text-primary">
                        <PlusSquare className="h-4 w-4" /> Adicionar à Tela de Início
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4 items-start bg-primary/5 p-4 rounded-2xl border border-primary/5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white text-xs font-black shrink-0">4</span>
                    <p className="text-xs font-bold leading-normal text-foreground">
                      Toque em <strong className="text-primary font-black uppercase text-[10px]">Adicionar</strong> no canto superior direito. Pronto! O app aparecerá na tela do seu iPhone.
                    </p>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="android" className="space-y-4 animate-in fade-in duration-200">
                <div className="space-y-3">
                  <div className="flex gap-4 items-start bg-primary/5 p-4 rounded-2xl border border-primary/5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white text-xs font-black shrink-0">1</span>
                    <p className="text-xs font-bold leading-normal text-foreground">
                      Abra o site no seu navegador <strong className="text-primary font-black uppercase text-[10px]">Google Chrome</strong>.
                    </p>
                  </div>
                  <div className="flex gap-4 items-start bg-primary/5 p-4 rounded-2xl border border-primary/5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white text-xs font-black shrink-0">2</span>
                    <div className="space-y-1">
                      <p className="text-xs font-bold leading-normal text-foreground">
                        Toque no menu de três pontos no canto superior direito:
                      </p>
                      <div className="flex items-center justify-center p-2 bg-background border border-primary/15 rounded-xl w-fit mt-1.5">
                        <MoreVertical className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4 items-start bg-primary/5 p-4 rounded-2xl border border-primary/5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white text-xs font-black shrink-0">3</span>
                    <div className="space-y-1">
                      <p className="text-xs font-bold leading-normal text-foreground">
                        Toque em <strong className="text-primary font-black uppercase text-[10px]">Instalar aplicativo</strong> ou <strong className="text-primary font-black uppercase text-[10px]">Adicionar à tela inicial</strong>:
                      </p>
                      <div className="flex items-center gap-2 p-2 px-3 bg-background border border-primary/15 rounded-xl w-fit mt-1.5 font-black uppercase text-[8px] tracking-wider text-primary">
                        <Download className="h-4 w-4" /> Instalar Aplicativo
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4 items-start bg-primary/5 p-4 rounded-2xl border border-primary/5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white text-xs font-black shrink-0">4</span>
                    <p className="text-xs font-bold leading-normal text-foreground">
                      Confirme a instalação e aguarde o ícone ser adicionado à sua gaveta de aplicativos do celular!
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
          <DialogFooter className="p-6 pt-0">
            <Button onClick={() => setShowGuideDialog(false)} className="w-full h-12 font-black uppercase text-xs rounded-xl tracking-wider shadow-md bg-muted hover:bg-muted/80 text-foreground">
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
