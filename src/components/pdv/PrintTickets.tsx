
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
  return (
    <div id="print-area" className="hidden print:block font-sans text-black">
      {tickets.map((ticket, idx) => (
        <div key={`${ticket.orderId}-${idx}`} className="ticket p-4 border-b border-dashed border-gray-400 break-after-page text-center" style={{ width: '80mm', minHeight: '80mm', margin: '0 auto' }}>
          <div className="text-sm uppercase font-bold border-b pb-2 mb-4">Flow Events - Ficha de Consumo</div>
          
          <div className="text-3xl font-black uppercase my-8 leading-tight">
            {ticket.productName}
          </div>
          
          <div className="mt-8 pt-4 border-t flex justify-between text-[10px]">
            <span>Pedido #{ticket.orderNumber}</span>
            <span>{format(ticket.timestamp, 'HH:mm:ss')}</span>
          </div>
          <div className="text-[10px] mt-1">{format(ticket.timestamp, 'dd/MM/yyyy')}</div>
        </div>
      ))}
    </div>
  );
}
