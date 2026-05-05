"use client";

import React from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OrderTicketIcon } from '@/components/layout/AppShell';

export function SuccessModal({ isOpen, onClose, orderNumber }: SuccessModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md border-none bg-background p-0 overflow-hidden rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="bg-primary p-10 text-center text-white relative">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <OrderTicketIcon className="w-full h-full" />
          </div>
          
          <div className="bg-white/20 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl border border-white/10">
            <CheckCircle2 className="h-14 w-14 text-white animate-pulse" />
          </div>
          <DialogTitle className="text-4xl font-black uppercase tracking-tighter mb-2 italic text-white text-center">
            Pedido Feito!
          </DialogTitle>
          <p className="text-white/80 font-black uppercase text-xs tracking-[0.2em]">Retire sua ficha</p>
        </div>
        
        <div className="p-10 text-center bg-card">
          <div className="mb-8">
            <span className="text-muted-foreground font-black text-[10px] uppercase block mb-2 tracking-widest">Número da Ficha</span>
            <div className="inline-block px-8 py-4 bg-primary/5 rounded-[2rem] border-2 border-primary/10 shadow-inner">
              <span className="text-6xl font-black text-primary tracking-tighter">#{orderNumber}</span>
            </div>
          </div>
          
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-center gap-3 text-primary font-black animate-pulse text-[10px] uppercase mb-2 tracking-widest">
              <Printer className="h-4 w-4" /> Imprimindo Fichas...
            </div>
            <Button 
              onClick={onClose} 
              className="w-full h-16 rounded-2xl font-black uppercase text-xl shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all bg-primary hover:bg-primary/90"
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