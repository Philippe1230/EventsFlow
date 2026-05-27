import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const toSign = body.request;

    if (!toSign) {
      return NextResponse.json({ error: 'Nenhum dado fornecido para assinatura' }, { status: 400 });
    }

    let rawPrivateKey = process.env.PRIVATE_KEY;
    if (!rawPrivateKey) {
      console.error("QZ Tray Signing: Chave privada 'PRIVATE_KEY' não configurada no servidor.");
      return NextResponse.json({ error: 'Chave de assinatura não configurada no servidor' }, { status: 500 });
    }

    // Limpa as aspas circundantes que o dotenv ou o Next.js podem reter no parsing
    rawPrivateKey = rawPrivateKey.trim();
    if (rawPrivateKey.startsWith('"') && rawPrivateKey.endsWith('"')) {
      rawPrivateKey = rawPrivateKey.substring(1, rawPrivateKey.length - 1);
    } else if (rawPrivateKey.startsWith("'") && rawPrivateKey.endsWith("'")) {
      rawPrivateKey = rawPrivateKey.substring(1, rawPrivateKey.length - 1);
    }

    // Como gravamos a chave no .env escapando quebras de linha com "\\n",
    // nós convertemos de volta para o formato de quebras reais PEM do bloco RSA.
    const privateKey = rawPrivateKey.replace(/\\n/g, '\n');

    // Assina a string usando RSA-SHA512 com a chave privada
    const sign = crypto.createSign('RSA-SHA512');
    sign.update(toSign);
    const signature = sign.sign(privateKey, 'base64');

    // Retorna a assinatura Base64 resultante como texto puro (text/plain)
    return new NextResponse(signature, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
    });

  } catch (error: any) {
    console.error("QZ Tray Signing Route Error:", error);
    return NextResponse.json({ error: 'Erro interno durante a assinatura digital' }, { status: 500 });
  }
}
