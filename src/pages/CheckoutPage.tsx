import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import {
  Wallet as WalletIcon,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/api/client';
import { CartQuote, NetworkType, Order } from '@/types';
import { formatEth } from '@/lib/eth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/stores/appStore';

const NETWORKS: NetworkType[] = ['Ethereum', 'Polygon', 'Arbitrum', 'Base'];

export function CheckoutPage() {
  const {
    user,
    cartItems,
    couponCode,
    clearPurchasedItems,
    addToCart,
    removeFromCart,
    updateCartQuantity,
  } = useAppStore();
  const navigate = useNavigate();

  const primaryWallet = user?.wallets.find((w) => w.isPrimary) || user?.wallets[0];
  const [selectedWalletId, setSelectedWalletId] = useState<string>(primaryWallet?.id || '');
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkType>(
    primaryWallet?.network || 'Ethereum'
  );
  const [walletStatus, setWalletStatus] = useState<'connected' | 'disconnected' | 'rejected'>(
    'connected'
  );
  const [activeOrderId, setActiveOrderId] = useState<string | null>(() => {
    return sessionStorage.getItem('jungle_active_order_id') || null;
  });

  const idempotencyKeyRef = useRef<string>(uuidv4());

  useEffect(() => {
    if (primaryWallet && !selectedWalletId) {
      setSelectedWalletId(primaryWallet.id);
      setSelectedNetwork(primaryWallet.network);
    }
  }, [primaryWallet, selectedWalletId]);

  const { data: quote, isLoading: isQuoteLoading, refetch: refetchQuote } = useQuery({
    queryKey: ['cart-quote', cartItems, couponCode],
    enabled: cartItems.length > 0 && !activeOrderId,
    queryFn: async () => {
      const res = await api.post<CartQuote>('/cart/quote', {
        items: cartItems,
        couponCode,
      });
      return res.data;
    },
  });

  const { data: activeOrder } = useQuery({
    queryKey: ['order', activeOrderId],
    enabled: Boolean(activeOrderId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'pending' ? 1500 : false;
    },
    queryFn: async () => {
      const res = await api.get<Order>('/orders/' + activeOrderId);
      return res.data;
    },
  });

  useEffect(() => {
    if (activeOrder?.status === 'confirmed') {
      clearPurchasedItems(
        activeOrder.items.map((i) => ({
          nftId: i.nftId,
          editionId: i.editionId,
          quantity: i.quantity,
        }))
      );
      sessionStorage.removeItem('jungle_active_order_id');
    } else if (activeOrder?.status === 'rejected') {
      sessionStorage.removeItem('jungle_active_order_id');
    }
  }, [activeOrder, clearPurchasedItems]);

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      if (!quote) throw new Error('Cotação indisponível');
      const res = await api.post<Order>(
        '/orders',
        {
          items: cartItems,
          couponCode,
          walletId: selectedWalletId,
          network: selectedNetwork,
          expectedTotalEth: quote.totalEth,
        },
        {
          headers: {
            'Idempotency-Key': idempotencyKeyRef.current,
          },
        }
      );
      return res.data;
    },
    onSuccess: (order) => {
      setActiveOrderId(order.id);
      sessionStorage.setItem('jungle_active_order_id', order.id);
      toast.info('Pedido ' + order.id + ' enviado. Aguardando confirmação da rede...');
    },
    onError: (err: unknown) => {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Falha ao processar o pedido.';

      if (status === 409) {
        refetchQuote();
      }
      toast.error(msg);
    },
  });

  const handleAcceptUpdatedQuote = () => {
    if (!quote) return;
    for (const item of quote.items) {
      if (item.priceChanged) {
        addToCart({
          nftId: item.nftId,
          editionId: item.editionId,
          quantity: 0,
          unitPriceEthSnapshot: item.currentPriceEth,
        });
      }
      if (item.availableStock === 0) {
        removeFromCart(item.nftId, item.editionId);
      } else if (item.quantity > item.availableStock) {
        updateCartQuantity(item.nftId, item.editionId, item.availableStock);
      }
    }
    idempotencyKeyRef.current = uuidv4();
    refetchQuote();
    toast.success('Cotação atualizada! Revise e confirme novamente.');
  };

    if (activeOrder) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 sm:p-8 space-y-6">
          {activeOrder.status === 'pending' && (
            <div className="flex flex-col items-center text-center space-y-3 py-4">
              <Loader2 className="h-12 w-12 animate-spin text-emerald-400" />
              <h1 className="text-2xl font-bold text-white">Processando Transação...</h1>
              <p className="text-sm text-zinc-400 max-w-md">
                Seu pedido <strong>{activeOrder.id}</strong> está aguardando confirmação na rede{' '}
                <strong>{activeOrder.network}</strong>.
              </p>
            </div>
          )}

          {activeOrder.status === 'confirmed' && (
            <div className="space-y-6">
              <div className="flex flex-col items-center text-center space-y-2 border-b border-zinc-800 pb-6">
                <CheckCircle2 className="h-12 w-12 text-emerald-400" />
                <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                  Compra Confirmada
                </Badge>
                <h1 className="text-2xl font-bold text-white">Recibo Oficial #{activeOrder.id}</h1>
                <p className="text-xs text-zinc-400">
                  Snapshot registrado em {new Date(activeOrder.createdAt).toLocaleString('pt-BR')}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 text-xs sm:grid-cols-2">
                <div>
                  <span className="text-zinc-500 block">Rede Utilizada</span>
                  <span className="font-medium text-white">{activeOrder.network}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Carteira Pagadora</span>
                  <span className="font-mono text-zinc-200 truncate block">
                    {activeOrder.walletAddress}
                  </span>
                </div>
                {activeOrder.txHash && (
                  <div className="sm:col-span-2 pt-1">
                    <span className="text-zinc-500 block">Hash da Transação (Simulada)</span>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <span className="font-mono text-emerald-400 truncate">
                        {activeOrder.txHash}
                      </span>
                      {activeOrder.explorerUrl && (
                        <a
                          href={activeOrder.explorerUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-zinc-300 hover:text-white shrink-0"
                        >
                          Explorer <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-zinc-300">Itens Adquiridos</h2>
                {activeOrder.items.map((item) => (
                  <div
                    key={item.nftId + '-' + item.editionId}
                    className="flex items-center justify-between rounded-lg border border-zinc-800/80 bg-zinc-950/50 p-3 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="h-12 w-12 rounded object-cover"
                      />
                      <div>
                        <p className="font-medium text-white">{item.title}</p>
                        <p className="text-xs text-zinc-400">
                          {item.editionName} × {item.quantity}
                        </p>
                      </div>
                    </div>
                    <span className="font-semibold text-emerald-400">
                      {formatEth(item.lineTotalEth)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="space-y-2 border-t border-zinc-800 pt-4 text-sm">
                <div className="flex justify-between text-zinc-400">
                  <span>Subtotal</span>
                  <span>{formatEth(activeOrder.subtotalEth)}</span>
                </div>
                {Number(activeOrder.discountEth) > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Desconto ({activeOrder.couponCode})</span>
                    <span>- {formatEth(activeOrder.discountEth)}</span>
                  </div>
                )}
                <div className="flex justify-between text-zinc-400">
                  <span>Taxa de Rede</span>
                  <span>{formatEth(activeOrder.networkFeeEth)}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-zinc-800">
                  <span>Total Pago</span>
                  <span className="text-emerald-400">{formatEth(activeOrder.totalEth)}</span>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row pt-2">
                <Link to="/orders" className="flex-1">
                  <Button variant="outline" className="w-full border-zinc-700 text-white">
                    Ver Todos os Pedidos
                  </Button>
                </Link>
                <Link to="/" className="flex-1">
                  <Button className="w-full bg-emerald-500 text-zinc-950 font-semibold hover:bg-emerald-400">
                    Continuar Explorando
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {activeOrder.status === 'rejected' && (
            <div className="flex flex-col items-center text-center space-y-4 py-4">
              <XCircle className="h-12 w-12 text-red-400" />
              <h1 className="text-2xl font-bold text-white">Pagamento Recusado</h1>
              <p className="text-sm text-zinc-400 max-w-md">
                {activeOrder.rejectionReason ||
                  'A transação não pôde ser concluída. Seus itens continuam salvos no carrinho.'}
              </p>
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setActiveOrderId(null);
                    idempotencyKeyRef.current = uuidv4();
                  }}
                  className="border-zinc-700 text-white"
                >
                  Tentar Novamente
                </Button>
                <Link to="/cart">
                  <Button className="bg-emerald-500 text-zinc-950 font-semibold">
                    Voltar ao Carrinho
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    navigate({ to: '/cart' });
    return null;
  }

    return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white sm:text-3xl">Finalizar Compra</h1>

      {quote?.hasBlockingIssues && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-xl border border-amber-500/40 bg-amber-950/30 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-amber-300">Cotação desatualizada</p>
              <p className="text-amber-200/80">
                Houve alteração em tempo real nos itens. Confirme os novos valores antes de pagar.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleAcceptUpdatedQuote}
            className="bg-amber-500 text-zinc-950 font-semibold hover:bg-amber-400"
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Atualizar e Confirmar
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">1. Dados do Colecionador</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
                <span className="text-xs text-zinc-500 block">Nome</span>
                <span className="font-medium text-white">{user?.name}</span>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
                <span className="text-xs text-zinc-500 block">E-mail de Recibo</span>
                <span className="font-medium text-white">{user?.email}</span>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">2. Carteira e Rede</h2>
              <Link to="/wallets" className="text-xs text-emerald-400 hover:underline">
                Gerenciar carteiras
              </Link>
            </div>

            <div className="space-y-2">
              <label htmlFor="wallet-select" className="block text-xs font-medium text-zinc-400">
                Selecione uma carteira cadastrada
              </label>
              <select
                id="wallet-select"
                value={selectedWalletId}
                onChange={(e) => {
                  setSelectedWalletId(e.target.value);
                  const w = user?.wallets.find((item) => item.id === e.target.value);
                  if (w) setSelectedNetwork(w.network);
                }}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
              >
                {user?.wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.label} ({w.address.slice(0, 8)}...{w.address.slice(-6)}) — {w.network}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <span className="block text-xs font-medium text-zinc-400">Rede de Liquidação</span>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {NETWORKS.map((net) => (
                  <button
                    key={net}
                    type="button"
                    onClick={() => setSelectedNetwork(net)}
                    className={
                      selectedNetwork === net
                        ? 'rounded-lg border px-3 py-2 text-xs font-medium transition-colors border-emerald-500 bg-emerald-500/15 text-emerald-400'
                        : 'rounded-lg border px-3 py-2 text-xs font-medium transition-colors border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-700'
                    }
                  >
                    {net}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <WalletIcon className="h-4 w-4 text-emerald-400" />
                  <span className="font-medium text-white">Status da Conexão:</span>
                  {walletStatus === 'connected' && (
                    <Badge className="bg-emerald-500/15 text-emerald-400">Conectada</Badge>
                  )}
                  {walletStatus === 'disconnected' && (
                    <Badge variant="secondary">Desconectada</Badge>
                  )}
                  {walletStatus === 'rejected' && (
                    <Badge variant="destructive">Assinatura Recusada</Badge>
                  )}
                </div>

                <div className="flex gap-2">
                  {walletStatus !== 'connected' ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setWalletStatus('connected')}
                      className="h-7 text-xs border-zinc-700"
                    >
                      Reconectar
                    </Button>
                  ) : (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setWalletStatus('rejected')}
                        className="h-7 text-xs text-amber-400 hover:bg-zinc-900"
                      >
                        Simular Recusa
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setWalletStatus('disconnected')}
                        className="h-7 text-xs text-zinc-400 hover:bg-zinc-900"
                      >
                        Desconectar
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>

        <aside className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 space-y-5 h-fit">
          <h2 className="text-lg font-semibold text-white">Revisão Final</h2>

          {quote && (
            <div className="space-y-3 text-sm">
              {quote.items.map((item) => (
                <div key={item.nftId + '-' + item.editionId} className="flex justify-between">
                  <span className="text-zinc-300 truncate pr-2">
                    {item.title} ({item.quantity}x)
                  </span>
                  <span className="text-white font-medium shrink-0">
                    {formatEth(item.lineTotalEth)}
                  </span>
                </div>
              ))}

              <div className="border-t border-zinc-800 pt-3 space-y-2">
                <div className="flex justify-between text-zinc-400">
                  <span>Subtotal</span>
                  <span>{formatEth(quote.subtotalEth)}</span>
                </div>
                {Number(quote.discountEth) > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Desconto</span>
                    <span>- {formatEth(quote.discountEth)}</span>
                  </div>
                )}
                <div className="flex justify-between text-zinc-400">
                  <span>Taxa de Rede</span>
                  <span>{formatEth(quote.networkFeeEth)}</span>
                </div>
                <div className="flex justify-between border-t border-zinc-800 pt-3 text-base font-bold text-white">
                  <span>Total a Pagar</span>
                  <span className="text-emerald-400">{formatEth(quote.totalEth)}</span>
                </div>
              </div>
            </div>
          )}

          <Button
            type="button"
            disabled={
              isQuoteLoading ||
              createOrderMutation.isPending ||
              walletStatus !== 'connected' ||
              Boolean(quote?.hasBlockingIssues)
            }
            onClick={() => createOrderMutation.mutate()}
            className="w-full bg-emerald-500 text-zinc-950 font-semibold hover:bg-emerald-400"
          >
            {createOrderMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando Transação...
              </>
            ) : (
              <>
                <ShieldCheck className="mr-2 h-4 w-4" />
                Confirmar e Pagar
              </>
            )}
          </Button>

          <p className="text-[11px] text-center text-zinc-500">
            Protegido contra cliques duplicados via chave de idempotência.
          </p>
        </aside>
      </div>
    </div>
  );
}
