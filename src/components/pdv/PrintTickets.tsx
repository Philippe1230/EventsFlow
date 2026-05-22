"use client";

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';

interface TicketProps {
  orderId: string;
  orderNumber: number;
  productName: string;
  timestamp: Date;
  itemIndex?: number;
  itemTotal?: number;
}

export function PrintTickets({ tickets }: { tickets: TicketProps[] }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!tickets || tickets.length === 0) return null;
  if (!mounted) return null;

  return createPortal(
    <>
      <style>{`
        @media print {
          body > *:not(#print-area) {
            display: none !important;
          }
          #print-area {
            display: block !important;
          }
          @page {
            margin: 0;
            size: 80mm auto;
          }
        }
        #print-area {
          display: none;
        }
      `}</style>
      <div id="print-area" style={{
        fontFamily: 'monospace',
        width: '72mm',
        padding: '0px',
        color: '#000',
        background: '#fff',
      }}>
        {tickets.map((ticket, idx) => (
          <div
            key={`${ticket.orderId}-${idx}`}
            className="ticket flex flex-col items-center text-center"
          >
            {/* Cabeçalho */}
            <div className="w-full border-b border-black pb-1 mb-1">
              <h1 className="text-[11px] font-black uppercase tracking-[0.2em] leading-none">Flow Events</h1>
            </div>

            {/* Corpo da Ficha - Nome do Produto em Destaque Absoluto */}
            <div className="flex flex-col items-center justify-center w-full py-1">
              <div className="text-[8px] font-bold uppercase tracking-widest mb-0.5 opacity-70">Ficha de Consumo</div>
              <h2 className="text-[26px] font-black uppercase leading-none tracking-tighter mb-2 break-words w-full">
                {ticket.productName}
              </h2>
            </div>

            {/* Rodapé de Segurança */}
            <div className="w-full mt-1.5 pt-1 border-t border-black/20 flex flex-col gap-0.5">
              <div className="flex justify-between items-center px-1">
                <span className="text-[7.5px] font-bold uppercase">Hora: {format(ticket.timestamp, 'HH:mm:ss')}</span>
                <span className="text-[7.5px] font-bold uppercase">Data: {format(ticket.timestamp, 'dd/MM/yyyy')}</span>
              </div>
              <div className="text-[6.5px] font-medium opacity-50 uppercase tracking-widest truncate">
                ID: {ticket.orderId}
              </div>
              <div className="text-[7px] font-black uppercase tracking-[0.25em] mt-0.5 border-t border-black/10 pt-0.5">
                *** DOCUMENTO NÃO FISCAL ***
              </div>
            </div>
          </div>
        ))}</div>
    </>,
    document.body
  );
}