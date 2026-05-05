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
          className="ticket flex flex-col items-center justify-between text-center break-after-page border-b border-dashed border-gray-300" 
          style={{ 
            width: '80mm', 
            height: '40mm', 
            padding: '3mm 5mm',
            boxSizing: 'border-box',
            overflow: 'hidden'
          }}
        >
          {/* Cabeçalho Reduzido */}
          <div className="w-full border-b border-black/20 pb-1">
            <h1 className="text-[10px] font-black uppercase tracking-widest leading-none">Flow Events</h1>
          </div>
          
          {/* Nome do Produto - Máximo Destaque */}
          <div className="flex-1 flex items-center justify-center w-full px-1">
            <h2 className="text-xl font-black uppercase leading-none tracking-tighter line-clamp-2">
              {ticket.productName}
            </h2>
          </div>
          
          {/* Rodapé Compacto */}
          <div className="w-full pt-1 border-t border-black/10 flex flex-col gap-0.5">
            <div className="flex justify-between items-end leading-none">
              <span className="text-[12px] font-black">#{ticket.orderNumber}</span>
              <span className="text-[8px] font-bold">{format(ticket.timestamp, 'HH:mm:ss')}</span>
            </div>
            <div className="flex justify-between items-center opacity-60 leading-none">
              <span className="text-[7px] font-bold uppercase">ID: {ticket.orderId.substring(0, 6)}</span>
              <span className="text-[7px] font-bold">{format(ticket.timestamp, 'dd/MM/yy')}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
