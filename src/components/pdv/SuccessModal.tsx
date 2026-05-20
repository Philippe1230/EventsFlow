
"use client";

import React from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OrderTicketIcon } from '@/components/layout/AppShell';

export function SuccessModal({ isOpen, onClose, orderNumber }: SuccessModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md border-none bg-background p-0 overflow-hidden rounded-[2.5rem] shadow-3xl animate-in zoom-in-95 duration-300 !top-[50%] !translate-y-[-50%] max-h-[92vh] overflow-y-auto flex flex-col scrollbar-thin scrollbar-thumb-muted">
        <div className="bg-primary p-6 md:p-10 text-center text-white relative overflow-hidden shrink-0">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
          
          <div className="bg-white/20 w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-2xl border border-white/20">
            <CheckCircle2 className="h-8 w-8 md:h-10 md:w-10 text-white" />
          </div>
          <DialogTitle className="text-2xl md:text-3xl font-black uppercase tracking-tighter mb-1 italic text-white text-center">
            Venda Feita!
          </DialogTitle>
          <p className="text-white/80 font-black uppercase text-[9px] md:text-[10px] tracking-[0.3em]">Retire sua ficha na impressora</p>
        </div>
        
        <div className="p-6 md:p-8 text-center bg-card flex-1 flex flex-col justify-between">
          <div className="mb-6 md:mb-8">
            <span className="text-muted-foreground font-black text-[9px] md:text-[10px] uppercase block mb-2 md:mb-3 tracking-widest">Controle de Ficha</span>
            <div className="inline-block px-8 py-4 md:px-10 md:py-6 bg-primary/5 rounded-[2rem] md:rounded-[2.5rem] border-2 border-primary/10 shadow-inner group transition-all">
              <span className="text-5xl md:text-7xl font-black text-primary tracking-tighter italic">#{orderNumber}</span>
            </div>
          </div>
          
          <div className="flex flex-col gap-4 md:gap-6">
            <div className="flex items-center justify-center gap-3 text-primary font-black animate-pulse text-[10px] md:text-[11px] uppercase tracking-widest bg-primary/5 py-2.5 md:py-3 rounded-xl">
              <Printer className="h-4 w-4" /> Imprimindo Cupons...
            </div>
            <Button 
              onClick={onClose} 
              className="w-full h-14 md:h-16 rounded-2xl font-black uppercase text-xl md:text-2xl shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all bg-primary hover:bg-primary/90 tracking-tighter italic"
            >
              Próximo Cliente
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
