
# Flow Events 🎟️🚀

**Flow Events** é uma plataforma ultra rápida de gestão de vendas e emissão de fichas para eventos, festivais, bares e festas populares. O sistema foi projetado para oferecer latência zero e máxima confiabilidade, mesmo em ambientes de alta demanda e conexões instáveis.

## 🚀 Funcionalidades Principais

- **PDV "Instant App"**: Interface de vendas otimizada para operação com uma mão, com transições aceleradas por hardware (GPU).
- **Fluxo de Pagamento Inteligente**: Modal centralizado com calculadora de troco automática para vendas em dinheiro.
- **Impressão Térmica 80mm**: Geração de fichas de consumo prontas para impressão profissional.
- **Inteligência de Acesso**: Redirecionamento automático baseado em cargo (Caixas vão direto para o PDV; Donos para o Dashboard).
- **Multi-tenant Real**: Isolamento total de dados entre diferentes eventos e organizações.
- **Modo Offline**: Persistência de dados local (Firebase Persistence) para garantir que a venda não pare se a internet cair.
- **Dashboards de Performance**: Gráficos em tempo real de faturamento, ranking de produtos e vendas por operador.
- **Gestão de Equipe**: Donos podem criar acessos para caixas em segundos, definindo login e senha instantaneamente.
- **Controle Global (Super Admin)**: Painel exclusivo para os fundadores gerenciarem todos os tenants e prestarem suporte técnico.

## 🛠️ Tecnologias e Otimizações

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS.
- **UI & UX**: Shadcn/UI com modificações de alto contraste e animações de 150ms (snappy).
- **Backend**: Firebase (Auth & Firestore) com regras de segurança granulares.
- **Mobile Prep**: Bloqueio de gestos `overscroll` (back-swipe) para simular comportamento de app nativo.
- **PWA Ready**: Manifest e Viewport configurados para instalação como aplicativo no Android e iOS.

## 🔐 Segurança

O projeto utiliza **Firestore Security Rules** para garantir que cada organização (Tenant) acesse apenas seus próprios dados. Usuários com papel `cashier` possuem acesso restrito apenas às funções de venda e consulta de seu próprio histórico, enquanto `owner` possui visão gerencial completa.

## 📈 Diferenciais de Mercado

1. **Velocidade**: O PDV mais rápido do mercado, focado em reduzir filas.
2. **Simplicidade**: Interface limpa com filtros de alto contraste (Laranja Flow) para fácil leitura em ambientes escuros ou sob sol forte.
3. **Resiliência**: Arquitetura que prioriza o funcionamento offline e sincronização em background.

---
*Flow Events: Tecnologia que acelera o seu evento e garante o seu lucro.*
