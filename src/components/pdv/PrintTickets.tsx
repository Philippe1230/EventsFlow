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
          className="ticket flex flex-col items-center justify-center text-center break-after-page border-b border-dashed border-gray-300" 
          style={{ 
            width: '80mm', 
            minHeight: '80mm', 
            padding: '10mm 5mm',
            boxSizing: 'border-box'
          }}
        >
          {/* Cabeçalho da Ficha */}
          <div className="w-full border-b-2 border-black pb-2 mb-4">
            <h1 className="text-[12px] font-black uppercase tracking-widest">Flow Events</h1>
            <p className="text-[9px] font-bold uppercase opacity-70">Comprovante de Consumo</p>
          </div>
          
          {/* Nome do Produto - O Principal */}
          <div className="flex-1 flex items-center justify-center my-6">
            <h2 className="text-3xl font-black uppercase leading-[1.1] tracking-tighter">
              {ticket.productName}
            </h2>
          </div>
          
          {/* Rodapé com Infos do Pedido */}
          <div className="w-full mt-auto pt-4 border-t border-black/20 flex flex-col gap-1">
            <div className="flex justify-between items-end">
              <span className="text-[14px] font-black">#{ticket.orderNumber}</span>
              <span className="text-[10px] font-bold">{format(ticket.timestamp, 'HH:mm:ss')}</span>
            </div>
            <div className="flex justify-between items-center opacity-60">
              <span className="text-[8px] font-bold uppercase">Cod: {ticket.orderId.substring(0, 8)}</span>
              <span className="text-[9px] font-bold">{format(ticket.timestamp, 'dd/MM/yyyy')}</span>
            </div>
          </div>
          
          {/* Espaçador de Segurança para o Corte */}
          <div className="h-4 w-full" />
        </div>
      ))}
    </div>
  );
}