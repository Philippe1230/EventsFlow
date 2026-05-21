
"use client";

import React from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OrderTicketIcon } from '@/components/layout/AppShell';

export function SuccessModal({ isOpen, onClose, orderNumber, onPrint }: SuccessModalProps) {
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
          
          <div className="flex flex-col gap-3 md:gap-4">
            {onPrint && (
              <Button 
                onClick={onPrint} 
                variant="outline"
                className="w-full h-14 md:h-16 rounded-2xl font-black uppercase text-sm md:text-base border-primary/20 text-primary hover:bg-primary/5 flex items-center justify-center gap-2 active:scale-95 transition-all tracking-tighter italic"
              >
                <Printer className="h-5 w-5" /> Imprimir Fichas (Manual)
              </Button>
            )}
            
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
  onPrint?: () => void;
}
