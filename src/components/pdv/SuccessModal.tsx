
"use client";

import React from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

const JuninaFlags = () => (
  <div className="flex justify-center gap-2 mb-6 overflow-hidden">
    {[1, 2, 3, 4, 5, 6].map((i) => (
      <div 
        key={i} 
        className={`w-7 h-10 rounded-b-xl animate-bounce shadow-lg`} 
        style={{ 
          backgroundColor: ['#f97316', '#ef4444', '#eab308', '#22c55e', '#06b6d4', '#ec4899'][i-1],
          animationDelay: `${i * 0.1}s` 
        }} 
      />
    ))}
  </div>
);

export function SuccessModal({ isOpen, onClose, orderNumber }: SuccessModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md border-none bg-background p-0 overflow-hidden rounded-[2.5rem] shadow-2xl">
        <div className="bg-primary p-10 text-center text-white relative">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <svg className="w-full h-full" viewBox="0 0 100 100">
              <pattern id="pattern" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M0 0h10v10H0z" fill="none"/>
                <path d="M5 0v10M0 5h10" stroke="currentColor" strokeWidth="0.5"/>
              </pattern>
              <rect width="100" height="100" fill="url(#pattern)"/>
            </svg>
          </div>
          <JuninaFlags />
          <div className="bg-white/20 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <CheckCircle2 className="h-14 w-14 text-white" />
          </div>
          <DialogTitle className="text-4xl font-black uppercase tracking-tighter mb-2 italic text-white text-center">
            Pedido Feito!
          </DialogTitle>
          <p className="text-white/80 font-black uppercase text-xs tracking-[0.2em]">Sucesso no seu Arraial</p>
        </div>
        
        <div className="p-10 text-center bg-card">
          <div className="mb-8">
            <span className="text-muted-foreground font-black text-[10px] uppercase block mb-2 tracking-widest">Número da Ficha</span>
            <div className="inline-block px-6 py-2 bg-primary/5 rounded-2xl border-2 border-primary/10">
              <span className="text-6xl font-black text-primary tracking-tighter">#{orderNumber}</span>
            </div>
          </div>
          
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-center gap-3 text-primary font-black animate-pulse text-xs uppercase mb-2">
              <Printer className="h-5 w-5" /> Imprimindo Fichas...
            </div>
            <Button 
              onClick={onClose} 
              className="w-full h-16 rounded-2xl font-black uppercase text-xl shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
            >
              Próximo Pedido
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderNumber: number;
}
