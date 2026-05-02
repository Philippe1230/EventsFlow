
"use client";

import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { CheckCircle2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderNumber: number;
}

const JuninaFlags = () => (
  <div className="flex justify-center gap-1 mb-4 overflow-hidden">
    {[1, 2, 3, 4, 5].map((i) => (
      <div 
        key={i} 
        className={`w-6 h-8 rounded-b-lg animate-bounce`} 
        style={{ 
          backgroundColor: ['#f97316', '#ef4444', '#eab308', '#22c55e', '#06b6d4'][i-1],
          animationDelay: `${i * 0.1}s` 
        }} 
      />
    ))}
  </div>
);

export function SuccessModal({ isOpen, onClose, orderNumber }: SuccessModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md border-none bg-background p-0 overflow-hidden rounded-3xl">
        <div className="bg-primary p-8 text-center text-white relative">
          <JuninaFlags />
          <div className="bg-white/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-12 w-12 text-white" />
          </div>
          <h2 className="text-3xl font-black uppercase tracking-tighter mb-2">Pedido Realizado!</h2>
          <p className="text-white/80 font-bold uppercase text-sm">Sucesso no seu Arraial</p>
        </div>
        
        <div className="p-8 text-center bg-card">
          <div className="mb-6">
            <span className="text-muted-foreground font-black text-xs uppercase block mb-1">Número do Pedido</span>
            <span className="text-5xl font-black text-primary tracking-tighter">#{orderNumber}</span>
          </div>
          
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-center gap-2 text-primary font-bold animate-pulse text-sm uppercase mb-2">
              <Printer className="h-4 w-4" /> Imprimindo Fichas...
            </div>
            <Button 
              onClick={onClose} 
              className="w-full h-14 rounded-2xl font-black uppercase text-lg shadow-xl shadow-primary/20"
            >
              Próximo Pedido
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
