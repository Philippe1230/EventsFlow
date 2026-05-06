"use client";

import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/use-auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Package, 
  Users, 
  ShoppingCart, 
  BarChart3, 
  CheckCircle2, 
  ArrowRight,
  Ticket,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function GuidePage() {
  const { organizationName, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && role === 'cashier') {
      router.replace('/pdv');
    }
  }, [role, loading, router]);

  // Enquanto carrega ou se for caixa, não mostra nada além de um carregamento limpo
  // Isso evita que o caixa veja a interface de "Guia" por um segundo antes de ir para o PDV
  if (loading || role === 'cashier') {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary opacity-20" />
          <span className="font-black uppercase text-[10px] tracking-[0.3em] text-primary/40 italic">Acessando sistema...</span>
        </div>
      </div>
    );
  }

  const steps = [
    {
      title: "1. Prepare o Cardápio",
      description: "Vá em 'Produtos' e cadastre tudo o que vai vender no seu evento.",
      icon: <Package className="h-6 w-6" />,
      link: "/products",
      color: "bg-orange-500"
    },
    {
      title: "2. Monte sua Equipe",
      description: "Em 'Equipe', crie os acessos para seus caixas. Você define o nome e a senha na hora.",
      icon: <Users className="h-6 w-6" />,
      link: "/team",
      color: "bg-red-500"
    },
    {
      title: "3. Hora de Vender!",
      description: "No 'PDV' (Fazer Pedidos), realize as vendas em segundos. Imprima as fichas na hora!",
      icon: <ShoppingCart className="h-6 w-6" />,
      link: "/pdv",
      color: "bg-yellow-500"
    },
    {
      title: "4. Acompanhe os Resultados",
      description: "No Dashboard, veja quanto cada caixa arrecadou e qual produto está bombando no seu evento.",
      icon: <BarChart3 className="h-6 w-6" />,
      link: "/dashboards",
      color: "bg-green-500"
    }
  ];

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full font-black text-xs uppercase tracking-widest mb-2">
            <Ticket className="h-4 w-4" /> Bem-vindo ao Flow Events
          </div>
          <h2 className="text-4xl font-black text-primary uppercase tracking-tighter">
            {organizationName || "Flow Events"}
          </h2>
          <p className="text-muted-foreground font-medium italic">
            Siga os passos abaixo para organizar sua operação e começar a faturar.
          </p>
        </div>

        <div className="grid gap-6">
          {steps.map((step, index) => (
            <Card key={index} className="border-2 border-primary/10 hover:border-primary/30 transition-all shadow-sm overflow-hidden group">
              <div className="flex flex-col md:flex-row items-center">
                <div className={`w-full md:w-20 h-20 flex items-center justify-center text-white ${step.color} shrink-0`}>
                  {step.icon}
                </div>
                <CardHeader className="flex-1 p-6">
                  <CardTitle className="text-lg font-black uppercase text-primary">{step.title}</CardTitle>
                  <CardDescription className="text-sm font-medium">{step.description}</CardDescription>
                </CardHeader>
                <div className="p-6">
                  <Button asChild variant="outline" className="font-black uppercase text-xs rounded-xl group-hover:bg-primary group-hover:text-white transition-colors">
                    <Link href={step.link}>
                      Configurar <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Card className="bg-primary text-white border-none shadow-xl rounded-3xl overflow-hidden">
          <CardContent className="p-8 flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
            <div className="bg-white/20 p-4 rounded-2xl">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-black uppercase">Tudo Pronto?</h3>
              <p className="font-medium text-white/80">O sistema já está sincronizado e pronto para receber pedidos de múltiplos aparelhos ao mesmo tempo!</p>
            </div>
            <Button variant="secondary" className="font-black uppercase h-12 px-8 rounded-xl" asChild>
              <Link href="/pdv">Ir para o PDV</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}