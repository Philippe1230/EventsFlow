'use client';

import { useState, useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';

/**
 * An invisible component that listens for globally emitted 'permission-error' events.
 * It throws read/list errors to be caught by Next.js's global-error.tsx,
 * but handles write errors gracefully with Toast alerts to prevent application crashes.
 */
export function FirebaseErrorListener() {
  // Use the specific error type for the state for type safety.
  const [error, setError] = useState<FirestorePermissionError | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // The callback now expects a strongly-typed error, matching the event payload.
    const handleError = (err: FirestorePermissionError) => {
      const method = err.request?.method;
      const isWriteOp = ['create', 'update', 'delete', 'write'].includes(method);

      if (isWriteOp) {
        // Se for erro em operação de gravação (não impede renderização),
        // exibe apenas um Toast informativo em vez de quebrar a aplicação.
        console.warn("Flow Events: Sincronizando gravação local em segundo plano.");
        toast({
          title: "Aviso de Sincronização",
          description: "Ocorreu um erro ao gravar dados em segundo plano. As operações locais continuam funcionando normalmente.",
          variant: "destructive",
        });
      } else {
        // Se for erro em leitura (essencial para renderizar a página),
        // joga o erro na tela para ser capturado pelo Error Boundary.
        setError(err);
      }
    };

    // The typed emitter will enforce that the callback for 'permission-error'
    // matches the expected payload type (FirestorePermissionError).
    errorEmitter.on('permission-error', handleError);

    // Unsubscribe on unmount to prevent memory leaks.
    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, [toast]);

  // On re-render, if an error exists in state, throw it.
  if (error) {
    throw error;
  }

  // This component renders nothing.
  return null;
}
