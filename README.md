# GreenMint — Marketplace de NFTs (Simulado)

Aplicação web completa de marketplace de NFTs construída em **React 19 + TypeScript**, seguindo a identidade visual da **GreenMint** no Figma, com camada de dados simulada localmente via **MSW (Mock Service Worker)** e eventos em tempo real via **Socket.IO (`socket.io-client` + `@mswjs/socket.io-binding`)**.

---

## Como Executar Localmente

1. **Instalar dependências:**
   ```bash
   npm install
   ```
2. **Iniciar servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```
   Acesse `http://localhost:5173`.
3. **Gerar build de produção:**
   ```bash
   npm run build
   ```
4. **Executar testes E2E (Playwright — Desktop e Mobile):**
   ```bash
   npx playwright install chromium
   npx playwright test
   ```

---

## Credenciais Fictícias & Cupons de Teste

### Usuários Pré-cadastrados (Persistidos em `localStorage`)
* **Usuário 1 (Alex Rivera):** `alex@collector.io` / Senha: `Senha@123`
* **Usuário 2 (Marina Costa):** `marina@studio.io` / Senha: `Senha@123`
*(A tela de Login possui botões de preenchimento rápido para ambas as contas).*

### Cupons Promocionais
* `JUNGLE10` — 10% de desconto sobre o subtotal em ETH.
* `VIP20` — 20% de desconto sobre o subtotal em ETH.
* `EXPIRED10` — Simula cupom expirado (HTTP 400).

---

## Painel de Simulação (QA / Simulador)

No canto inferior direito da interface há o botão **QA / Simulador**, que permite testar imediatamente:
* **Cenários de Rede/API:** Padrão (Sucesso), Rede Lenta (2.2s), Falha HTTP 500, Sessão Expirada (401), Pagamento Recusado e Timeout no Checkout (com recuperação via chave de idempotência).
* **Eventos Tempo Real (Socket.IO):** Alterar preço da Edição #1 ou esgotar estoque do NFT #1 em tempo real enquanto o usuário está no carrinho/checkout.
* **Resetar Dados:** Restaura o banco simulado (`localStorage`) para o estado inicial.

---

## Arquitetura & Decisões Técnicas

Consulte o arquivo [ARCHITECTURE.md](./ARCHITECTURE.md) para detalhes dos contratos REST, payloads de eventos Socket.IO, estratégia de cache do TanStack Query, deduplicação de eventos, precisão decimal em ETH e resultados de auditoria Lighthouse.
