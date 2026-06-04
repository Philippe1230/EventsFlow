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

const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDYkBCf5C7N6be2
MFxkZTKWvjHyX1DjOQzIhVHc9pnIEXjFyp7HlMVZeweNBdZ93lU1/PWSzhl3SM8g
0oM+zHjaUYe6/hGsXaiTRzuqEpraDF6L68grZkBZiGFXPWkJ2X0lsEGJaG/RU+GR
zEQ5clX8lB5y0X0rS2rSdzeDbKILVOS/KqP4JnZH33CSsWMoZF8XdPyky31Sr07E
ipb1mmOijez7K9UoU+1E1YqlFrUbAEPXxxIwfUDP0Mws3FkexMwLrTrLnEwuoRZV
GEvlIVJ7dNgTLWYdUvdc6AozEZ3hwLFCifKcM6wQN6/T6m0oYhIyWAoTqKXwhBvg
NG95Q6sZAgMBAAECggEADbFzSabgEj9LUVLmvqba72bkidieyNVGQoYShmwVzm2T
Yz9D8abtoRIrSK6UMMZ+gRDG9tK/D7ir9x10dMOxRw2lbUyMEcfkxTY5drAhODUU
w9hjYmIfYsHhtMZSZk/pDrlhtXZj7pqVDlbZ//9jojo74CLwnQySWy80VIQpjVmB
pcEgIfgb3jhrZ9b6rjwDEaVnxZ0LUV4xvJo6L7LdRY4tzT0EFIj44YWIKIkZR8CQ
zFTvbt55T5eUgjFrWukP2MF9upGBm32Km+nYiG6OG2z79ciE49KzjsS/UijHG0Qi
AC4ZJDESeEw5pkmLGBNPdDfKr7aI34mMUo9oUTakoQKBgQD1NANhV1Yon5Ss9uKt
5d+EBrNkoFSMmjsHITAGrd8Hq24yCS4zXT0R2JD1V8T32M+Kk8RVgCgyCgP/pUCC
iZTv3Kp9hbwXEUdJec2h98MVIipJr0fYt5wXZszm4HwTIXJSzMrGKxCtQfLuULp9
9Ja5GlWITX19FTQ1yD0yV4ACoQKBgQDiGTXU1dHVrgUGRDSr10ikYdlcNxpc1GCJ
CudMjZGVcG+IcmpHmiR6A9R53lO8O6THM/MPXBiYzbrQuqwy283jON3X6zHINz/s
sMKlxVyJ0MuEV65vi5Aps/A+PYjyMBoGzwJ/2O7/zV5T1yWf8winL+MhMRW1qNok
rvPHcfhNeQKBgQDXFK66Xa93prL1HQIs42wyFOaap4BCbK7GTDgiQ7VUtuzL+v2J
lImS89IDQt/FP2qc9YzMKsQXUG29eqihWClKVNc/j2UzHrbXHn5fSkLWcMeDJrrw
v+2tIUEua06qQTZUpspfFTtlnmmG3U0YWskyyISqML6YT1cirefwFox0wQKBgFOb
9P8mrrjw6CTAFiYxr0gycvmZ2uLXGnezE4OImnyDnor7nHer9a81OV5zq81g1Pdh
K5HTgbkH4vyK+2C3TbSn88mDzN34KGhzmRdKG4VPM+NVtUjEeGQjiUTK5piA1y8L
YCY852yq2iXw2pYCfoGswLYme5u4vCpyk+1+JM8pAoGBAKTUpfrsXkcjDYs7+WJB
fmZowSNDoFw0a89HUwsHs94aRcnVU31X81RyzWl8WvC+T1IPglLfJVPcWo5gGm10
2+bdZ1sIib2fo/rFtU/TqXZf+DLoohM8yfPxaMUlveijix/OuasGw+bhSGMaAWUJ
id3WzkYfEpTlWqRDa3NXf55c
-----END PRIVATE KEY-----`;

async function signLocally(toSign: string): Promise<string> {
  const pemContents = PRIVATE_KEY
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');

  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  const cryptoKey = await window.crypto.subtle.importKey(
    'pkcs8',
    binaryDer.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-512' },
    false,
    ['sign']
  );

  const encoder = new TextEncoder();
  const data = encoder.encode(toSign);

  const signature = await window.crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    data
  );

  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

export function useThermalPrint() {
  const [printing, setPrinting] = useState(false);
  const { toast } = useToast();

  const printTickets = useCallback(async (tickets: ThermalTicket[]): Promise<boolean> => {
    if (!tickets || tickets.length === 0) return false;
    if (typeof window === 'undefined') return false;

    setPrinting(true);

    const isElectron = !!(window as any).__IS_ELECTRON__;

    if (isElectron) {
      try {
        window.print();
        return true;
      } finally {
        setPrinting(false);
      }
    }

    let qz: any = null;

    try {
      qz = require('qz-tray');

      qz.security.setSignatureAlgorithm("SHA512");
      qz.security.setCertificatePromise((resolve: any) => {
        resolve(QZ_CERTIFICATE);
      });
      qz.security.setSignaturePromise((toSign: string) => {
        return (resolve: any, reject: any) => {
          signLocally(toSign)
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
        if (!(dateObj instanceof Date)) {
          dateObj = new Date(ticket.timestamp);
        }

        // Reset
        printData.push('\x1B\x40');

        // Centralizar
        printData.push('\x1B\x61\x01');

        // Cabeçalho compacto
        printData.push('\x1B\x45\x01');
        printData.push('FLOW EVENTS\n');
        printData.push('\x1B\x45\x00');

        if (ticket.eventName) {
          printData.push(`[${ticket.eventName.toUpperCase()}]\n`);
        }

        printData.push('FICHA DE CONSUMO\n');
        printData.push('----------------\n');

        // PRODUTO EM DESTAQUE
        printData.push('\x1D\x21\x20');
        printData.push('\x1B\x45\x01');
        printData.push(`${ticket.productName.toUpperCase()}\n`);
        printData.push('\x1D\x21\x00');
        printData.push('\x1B\x45\x00');

        printData.push('----------------\n');

        if (ticket.itemTotal && ticket.itemTotal > 1) {
          printData.push(`VIA ${ticket.itemIndex}/${ticket.itemTotal}\n`);
        }

        // Data e hora
        printData.push('\x1B\x61\x00');
        printData.push(
          `${format(dateObj, 'dd/MM/yyyy')} ${format(dateObj, 'HH:mm:ss')}\n`
        );

        // ID reduzido
        printData.push(
          `ID: ${ticket.orderId.slice(0, 16).toUpperCase()}\n`
        );

        // Rodapé
        printData.push('\x1B\x61\x01');
        printData.push('NAO FISCAL\n');

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