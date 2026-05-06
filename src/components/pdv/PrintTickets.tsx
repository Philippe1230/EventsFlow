"use client";

import React from 'react';
import { format } from 'date-fns';

interface TicketProps {
  orderId: string;
  orderNumber: number;
  productName: string;
  timestamp: Date;
}

export function PrintTickets({ tickets }: { tickets: TicketProps[] }) {
  if (!tickets || tickets.length === 0) return null;

  return (
    <div id="print-area" className="hidden print:block font-sans text-black bg-white">
      {tickets.map((ticket, idx) => (
        <div 
          key={`${ticket.orderId}-${idx}`} 
          className="ticket flex flex-col items-center text-center"
        >
          {/* Cabeçalho */}
          <div className="w-full border-b-2 border-black pb-2 mb-2">
            <h1 className="text-[14px] font-black uppercase tracking-[0.2em] leading-none">Flow Events</h1>
          </div>
          
          {/* Corpo da Ficha - Nome do Produto em Destaque Absoluto */}
          <div className="flex flex-col items-center justify-center w-full py-2">
            <div className="text-[10px] font-bold uppercase tracking-widest mb-1 opacity-70">Ficha de Consumo</div>
            <h2 className="text-[26px] font-black uppercase leading-tight tracking-tighter mb-2 break-words w-full">
              {ticket.productName}
            </h2>
            <div className="bg-black text-white px-5 py-1 text-[24px] font-black tracking-tighter rounded-sm">
              #{ticket.orderNumber}
            </div>
          </div>
          
          {/* Rodapé de Segurança */}
          <div className="w-full mt-3 pt-2 border-t border-black/20 flex flex-col gap-1">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-bold uppercase">Hora: {format(ticket.timestamp, 'HH:mm:ss')}</span>
              <span className="text-[9px] font-bold uppercase">Data: {format(ticket.timestamp, 'dd/MM/yyyy')}</span>
            </div>
            <div className="text-[7px] font-medium opacity-50 uppercase tracking-widest truncate">
              ID: {ticket.orderId}
            </div>
            <div className="text-[8px] font-black uppercase tracking-[0.3em] mt-1 border-t border-black/10 pt-1">
              *** DOCUMENTO NÃO FISCAL ***
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}