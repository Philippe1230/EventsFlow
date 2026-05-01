
"use client";

import { useAuth } from '@/hooks/use-auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Flame } from 'lucide-react';

export default function LoginPage() {
  const { signInWithGoogle, loading, user } = useAuth();

  if (loading) return null;
  if (user) {
    window.location.href = '/';
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md border-none shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white">
            <Flame className="h-10 w-10" />
          </div>
          <CardTitle className="text-3xl font-bold font-headline text-primary">Arraial PDV</CardTitle>
          <CardDescription className="text-lg">
            Acesse o sistema para gerenciar suas vendas juninas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            className="w-full h-12 text-lg font-semibold" 
            onClick={signInWithGoogle}
            size="lg"
          >
            Entrar com Google
          </Button>
          <div className="text-center text-sm text-muted-foreground mt-4">
            Gerencie seu Arraial com agilidade e simplicidade.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
