# Arquitetura Técnica — GreenMint Marketplace

## 1. Estrutura de Pastas
* `src/api/client.ts`: Cliente Axios centralizado com interceptors de `Authorization: Bearer <token>` e tratamento global de sessão expirada (`401`).
* `src/lib/eth.ts`: Operações aritméticas decimais exatas em Wei (`bigint`) para evitar erros de ponto flutuante (`0.1 + 0.2`) em valores de ETH.
* `src/mocks/`: Banco de dados simulado persistido em `localStorage` (`db.ts`), handlers REST e Socket.IO (`handlers.ts`) e inicialização do Service Worker (`browser.ts`).
* `src/stores/appStore.tsx`: Contexto global de autenticação, carrinho persistido (com mesclagem visitante -> autenticado) e cliente `socket.io-client` com deduplicação por `eventId` e controle de monotonicidade por `version`.
* `src/routes/router.tsx`: Roteamento tipado via TanStack Router com validação de search params na URL, guarda de rotas privadas (`RequireAuth`) e página 404.
* `src/pages/`: Telas de Catálogo, Detalhe do NFT, Carrinho, Checkout Idempotente, Autenticação e Conta (Perfil, Carteiras, Favoritos e Pedidos).

## 2. Contratos REST (MSW)
* `POST /api/auth/login` | `POST /api/auth/register` | `GET /api/auth/me` | `POST /api/auth/logout`
* `GET /api/nfts` (suporta `search`, `category`, `sort`, `page`, `limit`) e `GET /api/nfts/:id`
* `GET /api/favorites` e `POST /api/favorites/:nftId` (atualização otimista com rollback)
* `POST /api/cart/quote` e `GET /api/cart`
* `POST /api/orders` (exige header `Idempotency-Key` para impedir duplicidade de cobrança), `GET /api/orders` e `GET /api/orders/:id`
* `PATCH /api/profile`, `POST /api/wallets` e `PATCH /api/wallets/:id/primary`

## 3. Eventos Tempo Real (Socket.IO)
* `nft.updated`: `{ eventId, nftId, editionId, priceEth, stock, version }` — invalida queries `['nfts']`, `['nft', nftId]` e `['cart-quote']`, bloqueando o checkout caso haja divergência até o usuário aceitar a nova cotação.
* `order.updated`: `{ eventId, orderId, userId, status, txHash, explorerUrl, rejectionReason, version }` — filtra por `userId` autenticado, ignora eventos duplicados ou com `version <= lastVersion` e transiciona o pedido de `pending` para `confirmed` ou `rejected`.

## 4. Auditoria de Qualidade & Performance (Lighthouse)
* Build de produção validado via `vite build` e `tsc -b` sem erros.
* Acessibilidade garantida com HTML semântico, skip link, navegação por teclado, `aria-label`, `aria-pressed` e contraste elevado (`#f5efe8` sobre `#120e0b` e `#120e0b` sobre `#f59e0b`).
* Testes automatizados E2E executados via Playwright nos viewports Desktop (`1440×900`) e Mobile (`390×844`).
