# **App Name**: Arraial PDV

## Core Features:

- Autenticação Segura: Sistema de login com email/senha e Google, garantindo que apenas usuários autenticados acessem o PDV.
- Multi-Tenant & Isolamento de Dados: Permite que cada usuário crie e gerencie sua própria organização (tenant), com todos os dados (produtos, pedidos, etc.) isolados por tenantId no Firestore.
- Gestão de Produtos: Funcionalidades CRUD completas para adicionar, visualizar, editar e excluir produtos (nome, preço, categoria, status ativo/inativo) associados a cada tenant.
- PDV Ultra Rápido: Interface simplificada com botões grandes para seleção rápida de produtos, visualização do total em tempo real e escolha ágil da forma de pagamento (dinheiro, Pix, cartão).
- Impressão Automática de Fichas: Ao finalizar um pedido, gera e imprime automaticamente fichas individuais para cada unidade de produto vendida, otimizadas para impressoras térmicas 58mm/80mm com CSS @media print.
- Dashboard de Vendas do Dia: Exibe em tempo real o faturamento total do dia, número de pedidos, produtos mais vendidos e vendas por horário para monitoramento rápido da performance.
- Exportação de Dados: Permite exportar dados detalhados de pedidos (data, produto, quantidade, valor, forma de pagamento) para CSV ou Excel, com filtro por período.

## Style Guidelines:

- Esquema de cores claro e convidativo, inspirando a alegria e calor de uma festa junina. Cor primária: Um tom vibrante de laranja-avermelhado (#CC4C12) para os principais elementos, simbolizando a fogueira e a energia do evento. Cor de fundo: Um creme sutilmente aquecido (#FAF0ED), com a mesma base de matiz da cor primária, oferecendo um contraste suave e facilitando a leitura em operações rápidas. Cor de destaque: Um rosa cereja suave (#E04C6B) para elementos interativos e avisos importantes.
- Fonte única e limpa para todas as informações, otimizada para legibilidade e eficiência. Recomendamos 'Inter', uma fonte sans-serif moderna e neutra, que se adapta bem tanto a títulos de botões grandes quanto a pequenos textos de detalhes de pedidos.
- Ícones simples e universais para ações comuns como 'adicionar ao carrinho', 'finalizar pedido' e 'configurações'. Para os produtos, ícones claros que representem visualmente o item (ex: uma espiga de milho para 'milho'). Ícones grandes e facilmente tocáveis para telas sensíveis ao toque.
- Layout tipo PDV, com botões de produtos proeminentes e espaçamento generoso para uso em tablets e celulares. Uma área clara para o total do pedido e métodos de pagamento. As informações essenciais devem ser visíveis 'acima da dobra' para reduzir a necessidade de rolagem, garantindo agilidade na operação.
- Animações mínimas e diretas, como feedback visual sutil ao tocar em um botão ou adicionar um produto, reforçando a ação do usuário sem atrasar o fluxo de trabalho.