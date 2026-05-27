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
    let qz: any = null;

    try {
      // Importa dinamicamente a biblioteca qz-tray para compatibilidade SSR (Next.js)
      qz = require('qz-tray');

      // Configuração de segurança e assinatura digital para eliminar popups de licença do QZ Tray
      qz.security.setSignatureAlgorithm("SHA512");
      qz.security.setCertificatePromise((resolve: any) => {
        console.log("QZ Tray: Fornecendo certificado público...");
        resolve(QZ_CERTIFICATE);
      });
      qz.security.setSignaturePromise((toSign: string) => {
        return (resolve: any, reject: any) => {
          console.log("QZ Tray: Solicitando assinatura digital...");
          fetch('/api/sign-print', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ request: toSign })
          })
          .then(async (res) => {
            if (!res.ok) {
              const errText = await res.text();
              console.error("QZ Tray: Erro na rota de assinatura:", res.status, errText);
              throw new Error(`Erro ${res.status}: ${errText}`);
            }
            return res.text();
          })
          .then((sig) => {
            console.log("QZ Tray: Assinatura digital recebida com sucesso.");
            resolve(sig);
          })
          .catch((err) => {
            console.error("QZ Tray: Falha catastrófica ao obter assinatura:", err);
            reject(err);
          });
        };
      });

      // 1. Conecta ao WebSocket do QZ Tray se não estiver ativo
      if (!qz.websocket.isActive()) {
        console.log("QZ Tray: Estabelecendo conexão...");
        await qz.websocket.connect();
      }

      // 2. Busca e define a impressora térmica física
      let printerName = "Print iD";
      try {
        await qz.printers.find(printerName);
        console.log(`QZ Tray: Impressora primária "${printerName}" selecionada com sucesso.`);
      } catch (err) {
        console.warn(`QZ Tray: Impressora "${printerName}" não encontrada, buscando alternativas...`);
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

            if (compatible) {
              printerName = compatible;
              console.log(`QZ Tray: Impressora compatível encontrada e selecionada: ${printerName}`);
            } else {
              console.warn("QZ Tray: Nenhuma impressora compatível listada. Utilizando padrão do sistema.");
            }
          }
        } catch (listErr) {
          console.error("QZ Tray: Erro ao listar impressoras alternadas:", listErr);
        }
      }

      // Cria a configuração de impressão para a impressora resolvida
      const config = qz.configs.create(printerName);

      // 3. Compilação do buffer em comandos ESC/POS brutos
      const printData: string[] = [];

      tickets.forEach((ticket, idx) => {
        const isLast = idx === tickets.length - 1;
        
        // Assegura que o timestamp seja um objeto Date válido
        let dateObj = ticket.timestamp;
        if (!(dateObj instanceof Date)) {
          dateObj = new Date(ticket.timestamp);
        }

        // ---- [ INÍCIO DO TICKET ] ----
        
        // 1. Inicializar Impressora
        printData.push('\x1B\x40'); // ESC @ (Reseta todas as configurações temporárias)
        
        // 2. Alinhamento Centralizado
        printData.push('\x1B\x61\x01'); // ESC a 1

        // Fita Decorativa Superior
        printData.push('* * * * * * * * * * * * * * * * * * * * * * * *\n');

        // Cabeçalho Principal (Giga Font - Altura e Largura Duplas)
        printData.push('\x1D\x21\x11'); // GS ! 17 (Double width + height)
        printData.push('\x1B\x45\x01'); // ESC E 1 (Bold ON)
        printData.push('FLOW EVENTS\n');
        printData.push('\x1D\x21\x00'); // GS ! 0 (Reset font size)
        printData.push('\x1B\x45\x00'); // ESC E 0 (Bold OFF)

        // Nome do Evento Cadastrado
        if (ticket.eventName) {
          printData.push('\x1B\x45\x01'); // Bold ON
          printData.push(`[ ${ticket.eventName.toUpperCase()} ]\n`);
          printData.push('\x1B\x45\x00'); // Bold OFF
        }

        // Subtítulo do Tipo de Ticket
        printData.push('------------------------------------------------\n');
        printData.push('FICHA DE CONSUMO\n');
        printData.push('\n');

        // Moldura clássica para destacar o produto comprado
        printData.push('+----------------------------------------------+\n');
        
        // Nome do Produto (Giga Font, Centralizado, Negrito Extremo)
        printData.push('\x1D\x21\x11'); // GS ! 17 (Double size)
        printData.push('\x1B\x45\x01'); // ESC E 1 (Bold ON)
        printData.push(`${ticket.productName.toUpperCase()}\n`);
        printData.push('\x1D\x21\x00'); // GS ! 0 (Reset)
        printData.push('\x1B\x45\x00'); // Bold OFF
        
        printData.push('+----------------------------------------------+\n');

        // Via Fracionada (Para itens múltiplos do mesmo produto)
        if (ticket.itemTotal && ticket.itemTotal > 1) {
          printData.push('\n');
          printData.push('\x1B\x45\x01'); // Bold ON
          printData.push(`VIA ${ticket.itemIndex} DE ${ticket.itemTotal}\n`);
          printData.push('\x1B\x45\x00'); // Bold OFF
        }

        printData.push('\n');

        // 3. Rodapé Cronológico (Alinhamento em duas colunas: Hora à Esquerda, Data à Direita)
        // Largura útil padrão de 48 colunas em impressoras térmicas comuns
        printData.push('\x1B\x61\x00'); // ESC a 0 (Alinhamento à Esquerda)
        const leftText = `HORA: ${format(dateObj, 'HH:mm:ss')}`;
        const rightText = `DATA: ${format(dateObj, 'dd/MM/yyyy')}`;
        const spacesCount = Math.max(1, 48 - leftText.length - rightText.length);
        const datetimeLine = leftText + ' '.repeat(spacesCount) + rightText + '\n';
        printData.push(datetimeLine);

        // Retorna para centralizado para os códigos e assinaturas
        printData.push('\x1B\x61\x01'); // ESC a 1

        // Código de Segurança / Barcode Físico Real (CODE128)
        if (ticket.orderId) {
          printData.push('\n');
          printData.push('\x1D\x68\x28'); // GS h 40 (Barcode height: 40 dots)
          printData.push('\x1D\x77\x02'); // GS w 2 (Barcode width level 2)
          printData.push('\x1D\x48\x00'); // GS H 0 (Do not print barcode characters underneath)
          
          // GS k 73 (CODE128 Format B) -> '\x1D\x6B\x49' + Length + '{B' + Data
          const barcodeData = ticket.orderId;
          const barcodeCmd = '\x1D\x6B\x49' + String.fromCharCode(barcodeData.length + 2) + '{B' + barcodeData;
          printData.push(barcodeCmd);
          printData.push('\n');
          
          // ID textual de auditoria
          printData.push(`ID: ${barcodeData.toUpperCase()}\n`);
        }

        printData.push('\n');
        printData.push('✦ DOCUMENTO NAO FISCAL ✦\n');
        printData.push('* * * * * * * * * * * * * * * * * * * * * * * *\n');

        // 4. Alimentação de papel necessária para o espaçamento da guilhotina física
        printData.push('\n\n\n\n');

        // 5. Corte do papel físico
        if (isLast) {
          // Corte Total (Guilhotina Completa) no final do lote: GS V A 0 -> \x1D\x56\x41\x00
          printData.push('\x1D\x56\x41\x00');
        } else {
          // Semi Corte (Guilhotina Parcial) entre as fichas do mesmo lote: GS V B 0 -> \x1D\x56\x42\x00
          printData.push('\x1D\x56\x42\x00');
        }
      });

      // 4. Dispara a impressão via WebSocket
      await qz.print(config, printData);
      console.log("QZ Tray: Lote de tickets enviado com sucesso.");

      // 5. Desconecta o WebSocket após a conclusão da tarefa
      await qz.websocket.disconnect();
      return true;

    } catch (err: any) {
      console.error("QZ Tray: Erro durante a impressão física:", err);
      
      // Tentativa de desligamento limpo em caso de falha pós-conexão
      if (qz && qz.websocket && qz.websocket.isActive()) {
        try {
          await qz.websocket.disconnect();
        } catch (_) {}
      }

      toast({
        title: "Imprimindo via Navegador",
        description: "O QZ Tray não está aberto ou a impressora não foi encontrada. Usando o fallback nativo...",
        variant: "default"
      });
      
      return false; // Retorna falso para sinalizar o acionamento do fallback clássico
    } finally {
      setPrinting(false);
    }
  }, [toast]);

  return { printTickets, printing };
}
