
# Flow Events 🎟️🚀

**Flow Events** é uma plataforma ultra rápida de gestão de vendas e emissão de fichas para eventos, festivais, bares e festas populares. Desenvolvido para oferecer máxima performance mesmo em ambientes de alta demanda.

## 🚀 Funcionalidades Principais

- **PDV Ultra Rápido**: Interface otimizada para vendas em poucos toques.
- **Impressão Térmica**: Suporte nativo para impressão de fichas em formato 80mm.
- **Multi-Caixa**: Sincronização em tempo real entre múltiplos dispositivos.
- **Dashboards em Tempo Real**: Acompanhe faturamento e ranking de produtos instantaneamente.
- **Gestão de Equipe**: Controle de acessos para proprietários e operadores de caixa.
- **Controle Global (Super Admin)**: Visão mestre de todos os eventos e suporte a usuários.
- **PWA Ready**: Instale em seu smartphone ou tablet como um aplicativo nativo.

## 🛠️ Tecnologias Utilizadas

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS.
- **UI Components**: Shadcn/UI, Lucide Icons, Recharts.
- **Backend**: Firebase (Authentication, Firestore).
- **Segurança**: Firestore Security Rules para isolamento total de dados entre clientes (Multi-tenancy).

## 🔐 Configuração de Segurança

Para rodar o projeto, você deve configurar as variáveis de ambiente no arquivo `.env`:

```env
NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu_id
NEXT_PUBLIC_FIREBASE_APP_ID=seu_app_id
NEXT_PUBLIC_FIREBASE_API_KEY=sua_chave
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seu_dominio
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=seu_id_sender
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=seu_bucket
```

## 📈 Benefícios do Produto

1. **Agilidade**: Redução drástica nas filas de espera.
2. **Segurança**: Dados criptografados e isolados por organização.
3. **Controle**: Relatórios detalhados para prestação de contas.
4. **Mobilidade**: Funciona perfeitamente em 4G/5G através da tecnologia PWA.

---
*Desenvolvido com foco na experiência do operador e na lucratividade do organizador.*
