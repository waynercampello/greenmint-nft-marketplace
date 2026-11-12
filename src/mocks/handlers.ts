import { http, HttpResponse, delay, ws } from 'msw';
import { toSocketIo } from '@mswjs/socket.io-binding';
import { v4 as uuidv4 } from 'uuid';
import { getMockDb, saveMockDb, hashPassword, StoredUser } from './db';
import {
  ApiErrorResponse,
  CartItem,
  CartQuote,
  NftUpdatedEvent,
  Order,
  OrderUpdatedEvent,
  Wallet,
} from '@/types';
import { addEth, mulEth, pctEth, subEth, isSameEth } from '@/lib/eth';

const socketLink = ws.link('ws://*/socket.io/*');
let activeIoClient: ReturnType<typeof toSocketIo>['client'] | null = null;

export function emitSocketNftUpdate(payload: NftUpdatedEvent) {
  if (activeIoClient) {
    activeIoClient.emit('nft.updated', payload);
  }
}

export function emitSocketOrderUpdate(payload: OrderUpdatedEvent) {
  if (activeIoClient) {
    activeIoClient.emit('order.updated', payload);
  }
}

function errorResponse(
  status: number,
  code: ApiErrorResponse['code'],
  message: string,
  fieldErrors?: Record<string, string>
) {
  return HttpResponse.json<ApiErrorResponse>(
    { code, message, fieldErrors },
    { status }
  );
}

function getAuthenticatedUser(request: Request): StoredUser | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.replace('Bearer ', '').trim();
  const db = getMockDb();
  const userId = db.activeTokens[token];
  if (!userId) return null;
  return db.users.find((u) => u.id === userId) || null;
}

function sanitizeUser(user: StoredUser) {
  const { passwordHash, favorites, ...publicUser } = user;
  void passwordHash;
  void favorites;
  return publicUser;
}

function buildCartQuote(
  items: CartItem[],
  couponCode: string | null
): CartQuote {
  const db = getMockDb();
  let subtotal = '0.0000';
  let hasBlockingIssues = false;

  const detailedItems = items.map((item) => {
    const nft = db.nfts.find((n) => n.id === item.nftId);
    const edition = nft?.editions.find((e) => e.id === item.editionId);

    const currentPrice = edition?.priceEth || item.unitPriceEthSnapshot;
    const availableStock = edition?.stock ?? 0;
    const priceChanged = !isSameEth(currentPrice, item.unitPriceEthSnapshot);
    const stockInsufficient = availableStock < item.quantity || availableStock === 0;

    if (priceChanged || stockInsufficient) {
      hasBlockingIssues = true;
    }

    const lineTotal = mulEth(currentPrice, item.quantity);
    subtotal = addEth(subtotal, lineTotal);

    return {
      nftId: item.nftId,
      editionId: item.editionId,
      title: nft?.title || 'NFT Indisponível',
      editionName: edition?.name || 'Edição Removida',
      image: nft?.image || '',
      quantity: item.quantity,
      availableStock,
      currentPriceEth: currentPrice,
      snapshotPriceEth: item.unitPriceEthSnapshot,
      priceChanged,
      stockInsufficient,
      lineTotalEth: lineTotal,
    };
  });

  let discount = '0.0000';
  if (couponCode === 'JUNGLE10') {
    discount = pctEth(subtotal, 10);
  } else if (couponCode === 'VIP20') {
    discount = pctEth(subtotal, 20);
  }

  const afterDiscount = subEth(subtotal, discount);
  const networkFee = detailedItems.length > 0 ? '0.0150' : '0.0000';
  const total = addEth(afterDiscount, networkFee);

  return {
    items: detailedItems,
    couponCode,
    subtotalEth: subtotal,
    discountEth: discount,
    networkFeeEth: networkFee,
    totalEth: total,
    hasBlockingIssues,
    quoteTimestamp: Date.now(),
  };
}

async function applyScenarioMiddleware(request: Request) {
  const db = getMockDb();

  if (db.scenario === 'slow_network') {
    await delay(2200);
  } else {
    await delay(db.latencyMs || 200);
  }

  if (request.url.includes('/api/mock/')) return null;

  if (db.scenario === 'server_error_500') {
    return errorResponse(500, 'TRANSIENT_ERROR', 'Falha temporária no servidor simulado.');
  }

  return null;
}
export const handlers = [
  socketLink.addEventListener('connection', (connection) => {
    const io = toSocketIo(connection);
    activeIoClient = io.client;

    io.client.on('disconnect', () => {
      if (activeIoClient === io.client) {
        activeIoClient = null;
      }
    });
  }),

  http.post('/api/auth/login', async ({ request }) => {
    const err = await applyScenarioMiddleware(request);
    if (err) return err;

    const body = (await request.json()) as {
      email?: string;
      password?: string;
      guestCart?: CartItem[];
    };

    const db = getMockDb();
    const user = db.users.find(
      (u) => u.email.toLowerCase() === (body.email || '').toLowerCase()
    );

    if (!user || user.passwordHash !== hashPassword(body.password || '')) {
      return errorResponse(401, 'UNAUTHORIZED', 'E-mail ou senha inválidos.');
    }

    const token = 'tok_' + uuidv4();
    db.activeTokens[token] = user.id;

    if (!db.userCarts[user.id]) {
      db.userCarts[user.id] = { items: [], couponCode: null };
    }
    if (body.guestCart && body.guestCart.length > 0) {
      for (const gItem of body.guestCart) {
        const existing = db.userCarts[user.id].items.find(
          (i) => i.nftId === gItem.nftId && i.editionId === gItem.editionId
        );
        if (existing) {
          existing.quantity += gItem.quantity;
        } else {
          db.userCarts[user.id].items.push(gItem);
        }
      }
    }

    saveMockDb(db);
    return HttpResponse.json({ token, user: sanitizeUser(user) });
  }),

  http.post('/api/auth/register', async ({ request }) => {
    const err = await applyScenarioMiddleware(request);
    if (err) return err;

    const body = (await request.json()) as {
      name?: string;
      email?: string;
      password?: string;
    };

    if (!body.name || body.name.trim().length < 3) {
      return errorResponse(400, 'VALIDATION_ERROR', 'Dados inválidos.', {
        name: 'O nome deve ter pelo menos 3 caracteres.',
      });
    }
    if (!body.email || !body.email.includes('@')) {
      return errorResponse(400, 'VALIDATION_ERROR', 'Dados inválidos.', {
        email: 'Informe um e-mail válido.',
      });
    }
    if (!body.password || body.password.length < 6) {
      return errorResponse(400, 'VALIDATION_ERROR', 'Dados inválidos.', {
        password: 'A senha deve ter no mínimo 6 caracteres.',
      });
    }

    const db = getMockDb();
    const exists = db.users.some(
      (u) => u.email.toLowerCase() === body.email!.toLowerCase()
    );
    if (exists) {
      return errorResponse(409, 'CONFLICT', 'Este e-mail já está cadastrado.');
    }

    const newUser: StoredUser = {
      id: 'user-' + uuidv4().slice(0, 6),
      name: body.name.trim(),
      email: body.email.trim(),
      passwordHash: hashPassword(body.password),
      avatar:
        'https://unsplash.com',
      bio: 'Novo colecionador no marketplace.',
      favorites: [],
      wallets: [
        {
          id: 'w-' + uuidv4().slice(0, 6),
          label: 'Carteira Principal',
          address: '0x' + uuidv4().replace(/-/g, '').slice(0, 40),
          network: 'Ethereum',
          isPrimary: true,
        },
      ],
    };

    db.users.push(newUser);
    const token = 'tok_' + uuidv4();
    db.activeTokens[token] = newUser.id;
    db.userCarts[newUser.id] = { items: [], couponCode: null };
    saveMockDb(db);

    return HttpResponse.json({ token, user: sanitizeUser(newUser) }, { status: 201 });
  }),

  http.get('/api/auth/me', async ({ request }) => {
    const err = await applyScenarioMiddleware(request);
    if (err) return err;

    const db = getMockDb();
    if (db.scenario === 'session_expired') {
      return errorResponse(401, 'UNAUTHORIZED', 'Sua sessão expirou. Faça login novamente.');
    }

    const user = getAuthenticatedUser(request);
    if (!user) {
      return errorResponse(401, 'UNAUTHORIZED', 'Sessão inválida ou expirada.');
    }

    return HttpResponse.json({ user: sanitizeUser(user) });
  }),

  http.post('/api/auth/logout', async ({ request }) => {
    await delay(100);
    const authHeader = request.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '').trim();
      const db = getMockDb();
      delete db.activeTokens[token];
      saveMockDb(db);
    }
    return HttpResponse.json({ ok: true });
  }),

  http.get('/api/nfts', async ({ request }) => {
    const err = await applyScenarioMiddleware(request);
    if (err) return err;

    const url = new URL(request.url);
    const search = (url.searchParams.get('search') || '').toLowerCase();
    const category = url.searchParams.get('category') || 'ALL';
    const sort = url.searchParams.get('sort') || 'featured';
    const page = Math.max(1, Number(url.searchParams.get('page') || '1'));
    const limit = Math.max(1, Number(url.searchParams.get('limit') || '6'));

    const db = getMockDb();
    let list = [...db.nfts];

    if (search) {
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(search) ||
          n.creator.toLowerCase().includes(search) ||
          n.collection.toLowerCase().includes(search)
      );
    }

    if (category && category !== 'ALL') {
      list = list.filter((n) => n.category === category);
    }

        if (sort === 'price_asc') {
      list.sort(
        (a, b) =>
          parseFloat(a.editions[0]?.priceEth || '0') -
          parseFloat(b.editions[0]?.priceEth || '0')
      );
    } else if (sort === 'price_desc') {
      list.sort(
        (a, b) =>
          parseFloat(b.editions[0]?.priceEth || '0') -
          parseFloat(a.editions[0]?.priceEth || '0')
      );

    } else if (sort === 'newest') {
      list.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } else {
      list.sort((a, b) => Number(b.featured) - Number(a.featured));
    }

    const total = list.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * limit;
    const items = list.slice(start, start + limit);

    return HttpResponse.json({
      items,
      total,
      page: safePage,
      totalPages,
    });
  }),

  http.get('/api/nfts/:id', async ({ request, params }) => {
    const err = await applyScenarioMiddleware(request);
    if (err) return err;

    const db = getMockDb();
    const nft = db.nfts.find((n) => n.id === params.id);
    if (!nft) {
      return errorResponse(404, 'NOT_FOUND', 'NFT não encontrado.');
    }

    return HttpResponse.json(nft);
  }),
  http.get('/api/favorites', async ({ request }) => {
    const err = await applyScenarioMiddleware(request);
    if (err) return err;

    const user = getAuthenticatedUser(request);
    if (!user) return errorResponse(401, 'UNAUTHORIZED', 'Faça login para ver favoritos.');

    return HttpResponse.json({ favorites: user.favorites });
  }),

  http.post('/api/favorites/:nftId', async ({ request, params }) => {
    const err = await applyScenarioMiddleware(request);
    if (err) return err;

    const db = getMockDb();
    const authHeader = request.headers.get('Authorization')?.replace('Bearer ', '').trim();
    const userId = authHeader ? db.activeTokens[authHeader] : null;
    const user = db.users.find((u) => u.id === userId);
    if (!user) return errorResponse(401, 'UNAUTHORIZED', 'Sessão necessária.');

    const nftId = String(params.nftId);
    if (user.favorites.includes(nftId)) {
      user.favorites = user.favorites.filter((id) => id !== nftId);
    } else {
      user.favorites.push(nftId);
    }

    saveMockDb(db);
    return HttpResponse.json({ favorites: user.favorites });
  }),

  http.post('/api/cart/quote', async ({ request }) => {
    const err = await applyScenarioMiddleware(request);
    if (err) return err;

    const body = (await request.json()) as {
      items: CartItem[];
      couponCode: string | null;
    };

    const user = getAuthenticatedUser(request);
    const db = getMockDb();

    if (user) {
      db.userCarts[user.id] = {
        items: body.items || [],
        couponCode: body.couponCode || null,
      };
      saveMockDb(db);
    }

    if (body.couponCode) {
      const code = body.couponCode.toUpperCase().trim();
      if (code === 'EXPIRED10') {
        return errorResponse(400, 'VALIDATION_ERROR', 'Este cupom já expirou.');
      }
      if (code !== 'JUNGLE10' && code !== 'VIP20') {
        return errorResponse(400, 'VALIDATION_ERROR', 'Código de cupom inválido.');
      }
    }

    const quote = buildCartQuote(
      body.items || [],
      body.couponCode ? body.couponCode.toUpperCase().trim() : null
    );
    return HttpResponse.json(quote);
  }),

  http.get('/api/cart', async ({ request }) => {
    const err = await applyScenarioMiddleware(request);
    if (err) return err;

    const user = getAuthenticatedUser(request);
    if (!user) return errorResponse(401, 'UNAUTHORIZED', 'Não autenticado.');

    const db = getMockDb();
    const saved = db.userCarts[user.id] || { items: [], couponCode: null };
    return HttpResponse.json(saved);
  }),

  http.post('/api/orders', async ({ request }) => {
    const err = await applyScenarioMiddleware(request);
    if (err) return err;

    const db = getMockDb();
    if (db.scenario === 'session_expired') {
      return errorResponse(401, 'UNAUTHORIZED', 'Sessão expirada durante o checkout.');
    }

    const user = getAuthenticatedUser(request);
    if (!user) {
      return errorResponse(401, 'UNAUTHORIZED', 'Autenticação obrigatória para finalizar.');
    }

    const idempotencyKey = request.headers.get('Idempotency-Key');
    if (!idempotencyKey) {
      return errorResponse(400, 'VALIDATION_ERROR', 'Chave de idempotência ausente.');
    }

    const body = (await request.json()) as {
      items: CartItem[];
      couponCode: string | null;
      walletId: string;
      network: Order['network'];
      expectedTotalEth: string;
    };

    const existingOrder = db.orders.find(
      (o) => o.idempotencyKey === idempotencyKey && o.userId === user.id
    );
    if (existingOrder) {
      return HttpResponse.json(existingOrder, { status: 200 });
    }

    const quote = buildCartQuote(body.items, body.couponCode);
    if (quote.items.length === 0) {
      return errorResponse(400, 'VALIDATION_ERROR', 'O carrinho está vazio.');
    }
    if (quote.hasBlockingIssues || !isSameEth(quote.totalEth, body.expectedTotalEth)) {
      return errorResponse(
        409,
        'QUOTE_OUTDATED',
        'O preço ou disponibilidade de um item mudou. Revise sua cotação antes de confirmar.'
      );
    }

    const wallet = user.wallets.find((w) => w.id === body.walletId) || user.wallets[0];

    if (!wallet) {
      return errorResponse(400, 'VALIDATION_ERROR', 'Selecione uma carteira válida.');
    }

    const newOrder: Order = {
      id: 'ORD-' + Date.now().toString().slice(-6),
      idempotencyKey,
      userId: user.id,
      status: 'pending',
      txHash: null,
      explorerUrl: null,
      walletAddress: wallet.address,
      network: body.network || wallet.network,
      items: quote.items.map((i) => ({
        nftId: i.nftId,
        editionId: i.editionId,
        title: i.title,
        editionName: i.editionName,
        image: i.image,
        quantity: i.quantity,
        unitPriceEth: i.currentPriceEth,
        lineTotalEth: i.lineTotalEth,
      })),
      couponCode: quote.couponCode,
      subtotalEth: quote.subtotalEth,
      discountEth: quote.discountEth,
      networkFeeEth: quote.networkFeeEth,
      totalEth: quote.totalEth,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
    };

    db.orders.unshift(newOrder);
    saveMockDb(db);

    setTimeout(() => {
      const currentDb = getMockDb();
      const target = currentDb.orders.find((o) => o.id === newOrder.id);
      if (!target || target.status !== 'pending') return;

      if (currentDb.scenario === 'payment_rejected') {
        target.status = 'rejected';
        target.rejectionReason =
          'Transação recusada pela rede simulada (saldo insuficiente ou assinatura rejeitada).';
        target.updatedAt = new Date().toISOString();
        target.version += 1;
        saveMockDb(currentDb);

        emitSocketOrderUpdate({
          eventId: uuidv4(),
          orderId: target.id,
          userId: target.userId,
          status: 'rejected',
          txHash: null,
          explorerUrl: null,
          rejectionReason: target.rejectionReason,
          version: target.version,
        });
        return;
      }

      for (const purchased of target.items) {
        const nft = currentDb.nfts.find((n) => n.id === purchased.nftId);
        const ed = nft?.editions.find((e) => e.id === purchased.editionId);
        if (nft && ed) {
          ed.stock = Math.max(0, ed.stock - purchased.quantity);
          ed.version += 1;
          nft.version += 1;
        }
      }

      if (currentDb.userCarts[target.userId]) {
        currentDb.userCarts[target.userId].items = [];
        currentDb.userCarts[target.userId].couponCode = null;
      }

      const txHash = '0x' + uuidv4().replace(/-/g, '') + uuidv4().replace(/-/g, '').slice(0, 32);
      target.status = 'confirmed';
      target.txHash = txHash;
      target.explorerUrl = 'https://etherscan.io' + txHash;
      target.updatedAt = new Date().toISOString();
      target.version += 1;
      saveMockDb(currentDb);

      emitSocketOrderUpdate({
        eventId: uuidv4(),
        orderId: target.id,
        userId: target.userId,
        status: 'confirmed',
        txHash: target.txHash,
        explorerUrl: target.explorerUrl,
        version: target.version,
      });
    }, 1800);

    if (db.scenario === 'checkout_timeout_idempotent') {
      await delay(3500);
      return errorResponse(
        504,
        'TRANSIENT_ERROR',
        'Timeout na resposta do gateway. Tente reenviar para recuperar o pedido.'
      );
    }

    return HttpResponse.json(newOrder, { status: 201 });
  }),

  http.get('/api/orders', async ({ request }) => {
    const err = await applyScenarioMiddleware(request);
    if (err) return err;

    const user = getAuthenticatedUser(request);
    if (!user) return errorResponse(401, 'UNAUTHORIZED', 'Não autenticado.');

    const db = getMockDb();
    const userOrders = db.orders.filter((o) => o.userId === user.id);
    return HttpResponse.json({ orders: userOrders });
  }),

  http.get('/api/orders/:id', async ({ request, params }) => {
    const err = await applyScenarioMiddleware(request);
    if (err) return err;

    const user = getAuthenticatedUser(request);
    if (!user) return errorResponse(401, 'UNAUTHORIZED', 'Não autenticado.');

    const db = getMockDb();
    const order = db.orders.find((o) => o.id === params.id && o.userId === user.id);
    if (!order) return errorResponse(404, 'NOT_FOUND', 'Pedido não encontrado.');

    return HttpResponse.json(order);
  }),

  http.patch('/api/profile', async ({ request }) => {
    const err = await applyScenarioMiddleware(request);
    if (err) return err;

    const db = getMockDb();
    const authHeader = request.headers.get('Authorization')?.replace('Bearer ', '').trim();
    const userId = authHeader ? db.activeTokens[authHeader] : null;
    const user = db.users.find((u) => u.id === userId);
    if (!user) return errorResponse(401, 'UNAUTHORIZED', 'Não autenticado.');

    const body = (await request.json()) as {
      name?: string;
      bio?: string;
      avatar?: string;
      currentPassword?: string;
      newPassword?: string;
    };

    if (body.name !== undefined) {
      if (body.name.trim().length < 3) {
        return errorResponse(400, 'VALIDATION_ERROR', 'Nome muito curto.', {
          name: 'O nome deve ter no mínimo 3 caracteres.',
        });
      }
      user.name = body.name.trim();
    }

    if (body.bio !== undefined) user.bio = body.bio;
    if (body.avatar !== undefined) user.avatar = body.avatar;

    if (body.newPassword) {
      if (!body.currentPassword || user.passwordHash !== hashPassword(body.currentPassword)) {
        return errorResponse(400, 'VALIDATION_ERROR', 'Senha atual incorreta.', {
          currentPassword: 'A senha atual não confere.',
        });
      }
      if (body.newPassword.length < 6) {
        return errorResponse(400, 'VALIDATION_ERROR', 'Nova senha fraca.', {
          newPassword: 'A nova senha deve ter pelo menos 6 caracteres.',
        });
      }
user.passwordHash = hashPassword(body.newPassword);
}
saveMockDb(db);
return HttpResponse.json({ user: sanitizeUser(user) });
}),
http.post('/api/wallets', async ({ request }) => {
const err = await applyScenarioMiddleware(request);
if (err) return err;
const db = getMockDb();
const authHeader = request.headers.get('Authorization')?.replace('Bearer ', '').trim();
const userId = authHeader ? db.activeTokens[authHeader] : null;
const user = db.users.find((u) => u.id === userId);
if (!user) return errorResponse(401, 'UNAUTHORIZED', 'Não autenticado.');
const body = (await request.json()) as Omit<Wallet, 'id'>;
if (!body.address || !/^0x[a-fA-F0-9]{40}$/.test(body.address)) {
return errorResponse(400, 'VALIDATION_ERROR', 'Endereço de carteira inválido.', {
address: 'O endereço deve começar com 0x seguido de 40 caracteres hexadecimais.',
});
}
if (body.isPrimary) {
user.wallets.forEach((w) => (w.isPrimary = false));
}
const newWallet: Wallet = {
id: 'w-' + uuidv4().slice(0, 6),
label: body.label || 'Nova Carteira',
address: body.address,
network: body.network || 'Ethereum',
isPrimary: user.wallets.length === 0 ? true : Boolean(body.isPrimary),
};
user.wallets.push(newWallet);
saveMockDb(db);
return HttpResponse.json({ wallets: user.wallets }, { status: 201 });
}),
http.patch('/api/wallets/:id/primary', async ({ request, params }) => {
const err = await applyScenarioMiddleware(request);
if (err) return err;
const db = getMockDb();
const authHeader = request.headers.get('Authorization')?.replace('Bearer ', '').trim();
const userId = authHeader ? db.activeTokens[authHeader] : null;
const user = db.users.find((u) => u.id === userId);
if (!user) return errorResponse(401, 'UNAUTHORIZED', 'Não autenticado.');
user.wallets.forEach((w) => {
w.isPrimary = w.id === params.id;
});
saveMockDb(db);
return HttpResponse.json({ wallets: user.wallets });
}),
];