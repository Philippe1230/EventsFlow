"use client";

import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { QZ_CERTIFICATE } from '@/config/qz-certificate';

interface ThermalTicket {
  orderId: string;
  orderNumber: number;
  productName: string;
  timestamp: Date;
  itemIndex?: number;
  itemTotal?: number;
  eventName?: string;
}

export function useThermalPrint() {
  const [printing, setPrinting] = useState(false);
  const { toast } = useToast();

  const printTickets = useCallback(async (tickets: ThermalTicket[]): Promise<boolean> => {
    if (!tickets || tickets.length === 0) return false;
    if (typeof window === 'undefined') return false;

    setPrinting(true);

    // Detecta Electron por electronAPI (preload) OU por process.versions (contextIsolation desabilitado)
    const isElectron =
      (typeof window !== 'undefined' && !!(window as any).electronAPI?.isElectron) ||
      (typeof process !== 'undefined' && process.versions?.electron != null);

    if (isElectron) {
      try {
        window.print();
        return true;
      } finally {
        setPrinting(false);
      }
    }

    // Fluxo QZ Tray (browser normal)
    let qz: any = null;

    try {
      qz = require('qz-tray');

      qz.security.setSignatureAlgorithm("SHA512");
      qz.security.setCertificatePromise((resolve: any) => {
        resolve(QZ_CERTIFICATE);
      });
      qz.security.setSignaturePromise((toSign: string) => {
        return (resolve: any, reject: any) => {
          fetch('/api/sign-print', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ request: toSign })
          })
            .then(async (res) => {
              if (!res.ok) throw new Error(`Erro ${res.status}`);
              return res.text();
            })
            .then((sig) => resolve(sig))
            .catch((err) => reject(err));
        };
      });

      if (!qz.websocket.isActive()) {
        await qz.websocket.connect();
      }

      let printerName = "Print iD";
      try {
        await qz.printers.find(printerName);
      } catch (err) {
        try {
          const printersList = await qz.printers.find();
          if (Array.isArray(printersList)) {
            const compatible = printersList.find((p: string) =>
              p.toLowerCase().includes("print id") ||
              p.toLowerCase().includes("control id") ||
              p.toLowerCase().includes("thermal") ||
              p.toLowerCase().includes("receipt") ||
              p.toLowerCase().includes("gprinter") ||
              p.toLowerCase().includes("bematech")
            );
            if (compatible) printerName = compatible;
          }
        } catch (listErr) {
          console.error("QZ Tray: Erro ao listar impressoras:", listErr);
        }
      }

      const config = qz.configs.create(printerName);
      const printData: string[] = [];

      tickets.forEach((ticket, idx) => {
        const isLast = idx === tickets.length - 1;
        let dateObj = ticket.timestamp;
        if (!(dateObj instanceof Date)) dateObj = new Date(ticket.timestamp);

        printData.push('\x1B\x40');
        printData.push('\x1B\x61\x01');
        printData.push('* * * * * * * * * * * * * * * * * * * * * * * *\n');
        printData.push('\x1D\x21\x11');
        printData.push('\x1B\x45\x01');
        printData.push('FLOW EVENTS\n');
        printData.push('\x1D\x21\x00');
        printData.push('\x1B\x45\x00');

        if (ticket.eventName) {
          printData.push('\x1B\x45\x01');
          printData.push(`[ ${ticket.eventName.toUpperCase()} ]\n`);
          printData.push('\x1B\x45\x00');
        }

        printData.push('------------------------------------------------\n');
        printData.push('FICHA DE CONSUMO\n\n');
        printData.push('+----------------------------------------------+\n');
        printData.push('\x1D\x21\x11');
        printData.push('\x1B\x45\x01');
        printData.push(`${ticket.productName.toUpperCase()}\n`);
        printData.push('\x1D\x21\x00');
        printData.push('\x1B\x45\x00');
        printData.push('+----------------------------------------------+\n');

        if (ticket.itemTotal && ticket.itemTotal > 1) {
          printData.push('\n');
          printData.push('\x1B\x45\x01');
          printData.push(`VIA ${ticket.itemIndex} DE ${ticket.itemTotal}\n`);
          printData.push('\x1B\x45\x00');
        }

        printData.push('\n');
        printData.push('\x1B\x61\x00');
        const leftText = `HORA: ${format(dateObj, 'HH:mm:ss')}`;
        const rightText = `DATA: ${format(dateObj, 'dd/MM/yyyy')}`;
        const spacesCount = Math.max(1, 48 - leftText.length - rightText.length);
        printData.push(leftText + ' '.repeat(spacesCount) + rightText + '\n');
        printData.push('\x1B\x61\x01');

        if (ticket.orderId) {
          printData.push('\n');
          printData.push('\x1D\x68\x28');
          printData.push('\x1D\x77\x02');
          printData.push('\x1D\x48\x00');
          const barcodeData = ticket.orderId;
          printData.push('\x1D\x6B\x49' + String.fromCharCode(barcodeData.length + 2) + '{B' + barcodeData);
          printData.push('\n');
          printData.push(`ID: ${barcodeData.toUpperCase()}\n`);
        }

        printData.push('\n');
        printData.push('✦ DOCUMENTO NAO FISCAL ✦\n');
        printData.push('* * * * * * * * * * * * * * * * * * * * * * * *\n');
        printData.push('\n\n\n\n');

        if (isLast) {
          printData.push('\x1D\x56\x41\x00');
        } else {
          printData.push('\x1D\x56\x42\x00');
        }
      });

      await qz.print(config, printData);
      await qz.websocket.disconnect();
      return true;

    } catch (err: any) {
      console.error("QZ Tray: Erro durante a impressão:", err);
      if (qz && qz.websocket && qz.websocket.isActive()) {
        try { await qz.websocket.disconnect(); } catch (_) { }
      }
      toast({
        title: "Imprimindo via Navegador",
        description: "QZ Tray não encontrado. Usando fallback nativo...",
        variant: "default"
      });
      return false;
    } finally {
      setPrinting(false);
    }
  }, [toast]);

  return { printTickets, printing };
}