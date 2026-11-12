import { test, expect } from '@playwright/test';

test.describe('GreenMint Marketplace — Fluxos Principais', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
  });

  test('1. Catálogo: filtros combinados e navegação para detalhe', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Descubra, colecione');

    await page.getByRole('button', { name: 'Gaming' }).click();
    await expect(page).toHaveURL(/category=Gaming/);
    await expect(page.getByText('Obsidian Relic Pass')).toBeVisible();

    await page.getByText('Obsidian Relic Pass').click();
    await expect(page).toHaveURL(/\/nft\/nft-2/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Obsidian Relic Pass');
  });

  test('2. Detalhe: tratamento de NFT inexistente (404)', async ({ page }) => {
    await page.goto('/nft/id-inexistente-999');
    await expect(page.getByRole('heading', { name: /NFT não encontrado/i })).toBeVisible();
  });

  test('3. Fluxo completo: visitante adiciona ao carrinho, faz login, aplica cupom e compra', async ({
    page,
  }) => {
    await page.goto('/nft/nft-1');
    await page.getByRole('button', { name: /Adicionar ao Carrinho/i }).click();

    await page.goto('/cart');
    await expect(page.getByText('Cybernetic Jungle Ape #042')).toBeVisible();

    await page.getByLabel(/Cupom de desconto/i).fill('JUNGLE10');
    await page.getByRole('button', { name: 'Aplicar' }).click();
    await expect(page.getByText('Cupom ativo: JUNGLE10')).toBeVisible();

    await page.getByRole('button', { name: /Continuar para Pagamento/i }).click();
    await expect(page).toHaveURL(/\/login/);

    await page.getByRole('button', { name: /Alex \(Usuário 1\)/i }).click();
    await page.locator('#main-content').getByRole('button', { name: 'Entrar' }).click();

    await expect(page).toHaveURL(/\/checkout/);
    await page.getByRole('button', { name: /Confirmar e Pagar/i }).click();

    await expect(page.getByText(/Recibo Oficial #ORD-/i)).toBeVisible({ timeout: 10000 });
  });

  test('4. Tempo Real (Socket.IO): alteração de preço bloqueia checkout até aceitar nova cotação', async ({
    page,
  }) => {
    await page.goto('/nft/nft-1');
    await page.getByRole('button', { name: /Adicionar ao Carrinho/i }).click();
    await page.goto('/cart');

    await page.getByRole('button', { name: /Abrir painel de simulação/i }).click();
    await page.getByRole('button', { name: /Alterar Preço #1/i }).click();

    await expect(page.getByText(/Alteração detectada em tempo real/i)).toBeVisible({ timeout: 8000 });
    await page.getByRole('button', { name: /Aceitar Nova Cotação/i }).click();
    await expect(page.getByText(/Alteração detectada em tempo real/i)).toBeHidden();
  });
});
