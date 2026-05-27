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
  eventName?: string;
}

interface PrintTicketsProps {
  tickets: TicketProps[];
  printTrigger?: number;
  onComplete?: () => void;
  autoPrint?: boolean;
}

export function PrintTickets({ tickets, printTrigger, onComplete, autoPrint }: PrintTicketsProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Efeito para disparar window.print() para todos os tickets do lote de uma só vez
  useEffect(() => {
    if (!mounted || !tickets || tickets.length === 0) return;

    // Só dispara se autoPrint for true OU se printTrigger for maior que 0 (clique manual)
    const shouldPrint = autoPrint || (printTrigger && printTrigger > 0);
    if (!shouldPrint) return;

    // Aguarda o React renderizar o DOM de todos os tickets no portal antes de abrir a caixa de diálogo
    const timer = setTimeout(() => {
      window.print();
    }, 400);

    return () => clearTimeout(timer);
  }, [tickets, mounted, printTrigger, autoPrint]);

  // Efeito para ouvir o evento afterprint do navegador e disparar a limpeza do lote
  useEffect(() => {
    if (!mounted || !tickets || tickets.length === 0) return;

    const handleAfterPrint = () => {
      if (onComplete) {
        onComplete();
      }
    };

    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [tickets, mounted, onComplete]);

  if (!tickets || tickets.length === 0 || !mounted) return null;

  return createPortal(
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,700;0,800;1,400;1,700;1,800&family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap');

        @media print {
          body > *:not(#print-area) {
            display: none !important;
          }

          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            width: 80mm !important;
            background: white !important;
          }

          #print-area {
            display: block !important;
            width: 72mm !important;
          }

          @page {
            margin: 0;
            size: portrait;
          }

          .ticket {
            width: 72mm;
            height: 60mm;
            padding: 3.5mm 4mm 3.5mm 4mm !important;
            box-sizing: border-box;

            page-break-after: always;
            break-after: page;

            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;

            overflow: hidden;
            border: 2.2px solid #000 !important;
            border-radius: 6px !important;
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .ticket:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
        }

        #print-area {
          display: none;
        }
      `}</style>

      <div
        id="print-area"
        style={{
          fontFamily: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          width: '72mm',
          color: '#000',
          background: '#fff',
        }}
      >
        {tickets.map((ticket, index) => {
          let ticketDate = ticket.timestamp;
          if (!(ticketDate instanceof Date)) {
            ticketDate = new Date(ticket.timestamp);
          }

          return (
            <div
              key={`${ticket.orderId}-${index}`}
              className="ticket flex flex-col justify-between items-center relative"
              style={{
                minHeight: '40mm',
                padding: '3.5mm 4mm 3.5mm 4mm',
                boxSizing: 'border-box',
                border: '2.2px solid #000',
                borderRadius: '6px',
                backgroundColor: '#fff',
                marginBottom: '4mm', // Pequeno respiro visual na tela de visualização
              }}
            >
              {/* Fita Decorativa Superior */}
              <div className="w-full flex items-center justify-between text-[6px] tracking-[0.18em] font-extrabold opacity-30 select-none leading-none mb-1 text-black font-mono">
                <span>◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆</span>
              </div>

              {/* Cabeçalho Premium */}
              <div className="w-full flex flex-col items-center gap-0.5 border-b-[1.5px] border-black pb-1.5 mb-1">
                <div className="flex items-center gap-1">
                  <span className="text-[7px] font-bold text-black select-none">✦</span>
                  <h1 className="text-[12px] font-black uppercase tracking-[0.22em] leading-none italic text-black">
                    FLOW EVENTS
                  </h1>
                  <span className="text-[7px] font-bold text-black select-none">✦</span>
                </div>

                {ticket.eventName && (
                  <span className="bg-black text-white text-[7.5px] font-extrabold uppercase tracking-[0.16em] px-2.5 py-0.5 mt-0.5 leading-none rounded-full">
                    {ticket.eventName}
                  </span>
                )}
              </div>

              {/* Corpo com Destaque Central */}
              <div className="flex-1 flex flex-col items-center justify-center w-full py-1 relative">
                <div className="text-[7.5px] font-bold uppercase tracking-[0.25em] text-black/60 mb-1 flex items-center gap-1.5">
                  <span className="inline-block w-1 h-1 bg-black rounded-full"></span>
                  FICHA DE CONSUMO
                  <span className="inline-block w-1 h-1 bg-black rounded-full"></span>
                </div>

                <div className="border-[1.8px] border-black w-full py-2 px-1.5 my-0.5 rounded-[4px] bg-black/[0.01] flex items-center justify-center min-h-[38px] relative overflow-hidden">
                  {/* Cantoneiras decorativas para visual de bilhete clássico/VIP */}
                  <div className="absolute top-0.5 left-0.5 w-1 h-1 border-t-[1px] border-l-[1px] border-black/40"></div>
                  <div className="absolute top-0.5 right-0.5 w-1 h-1 border-t-[1px] border-r-[1px] border-black/40"></div>
                  <div className="absolute bottom-0.5 left-0.5 w-1 h-1 border-b-[1px] border-l-[1px] border-black/40"></div>
                  <div className="absolute bottom-0.5 right-0.5 w-1 h-1 border-b-[1px] border-r-[1px] border-black/40"></div>

                  <h2 className="text-[21px] font-extrabold uppercase leading-tight tracking-tight break-words w-full text-center px-1 text-black">
                    {ticket.productName}
                  </h2>
                </div>

                {/* Via Fracionada */}
                {ticket.itemTotal && ticket.itemTotal > 1 && (
                  <div className="text-[8.5px] font-extrabold uppercase tracking-[0.2em] bg-black text-white px-2.5 py-0.5 mt-1 leading-none rounded-[3px]">
                    VIA {ticket.itemIndex} DE {ticket.itemTotal}
                  </div>
                )}
              </div>

              {/* Serrilha Física com Notches Circulares */}
              <div className="w-[calc(100%+8mm)] ml-[-4mm] mr-[-4mm] relative my-1.5 flex items-center">
                <div className="w-full border-t-[1.5px] border-dashed border-black/45"></div>
                {/* Notch Esquerdo */}
                <div className="absolute left-[-5.5px] w-3 h-3 bg-white border-[1.8px] border-black rounded-full z-10"></div>
                {/* Notch Direito */}
                <div className="absolute right-[-5.5px] w-3 h-3 bg-white border-[1.8px] border-black rounded-full z-10"></div>
              </div>

              {/* Rodapé e Auditoria */}
              <div className="w-full flex flex-col gap-1 pt-0.5 mt-auto">
                {/* Informações Cronológicas */}
                <div className="flex justify-between items-center text-[8px] font-bold tracking-wider px-0.5 font-mono text-black/85">
                  <span className="flex items-center gap-1">
                    <span>HORA:</span>
                    <span className="font-extrabold">{format(ticketDate, 'HH:mm:ss')}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span>DATA:</span>
                    <span className="font-extrabold">{format(ticketDate, 'dd/MM/yyyy')}</span>
                  </span>
                </div>

                {/* Código de Segurança e Barcode Falso */}
                <div className="flex flex-col items-center gap-1 my-0.5">
                  {/* Faux Barcode */}
                  <div className="flex items-center justify-center gap-[1.2px] h-3.5 w-3/4 opacity-90 select-none">
                    <div className="w-[1.5px] h-full bg-black"></div>
                    <div className="w-[1px] h-full bg-black"></div>
                    <div className="w-[3px] h-full bg-black"></div>
                    <div className="w-[1px] h-full bg-black"></div>
                    <div className="w-[2.2px] h-full bg-black"></div>
                    <div className="w-[0.5px] h-full bg-black"></div>
                    <div className="w-[3.5px] h-full bg-black"></div>
                    <div className="w-[1px] h-full bg-black"></div>
                    <div className="w-[2.2px] h-full bg-black"></div>
                    <div className="w-[1.5px] h-full bg-black"></div>
                    <div className="w-[3px] h-full bg-black"></div>
                    <div className="w-[1px] h-full bg-black"></div>
                    <div className="w-[4px] h-full bg-black"></div>
                    <div className="w-[1px] h-full bg-black"></div>
                    <div className="w-[2.5px] h-full bg-black"></div>
                    <div className="w-[1px] h-full bg-black"></div>
                    <div className="w-[2px] h-full bg-black"></div>
                    <div className="w-[0.5px] h-full bg-black"></div>
                    <div className="w-[3px] h-full bg-black"></div>
                  </div>

                  <div className="text-[7px] font-bold text-black/75 uppercase tracking-[0.14em] font-mono break-all text-center px-1 leading-normal w-full">
                    ID: {ticket.orderId.toUpperCase()}
                  </div>
                </div>

                {/* Selo Não Fiscal */}
                <div className="text-[7.5px] font-black uppercase tracking-[0.2em] text-center border-t border-black/10 pt-1 text-black/70">
                  ✦ DOCUMENTO NÃO FISCAL ✦
                </div>

                {/* Fita Decorativa Inferior */}
                <div className="w-full flex items-center justify-between text-[6px] tracking-[0.18em] font-extrabold opacity-30 select-none leading-none mt-0.5 text-black font-mono">
                  <span>◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>,
    document.body
  );
}