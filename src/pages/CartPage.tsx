import { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import {
  Trash2,
  Plus,
  Minus,
  Tag,
  AlertTriangle,
  ArrowRight,
  ShoppingBag,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/api/client';
import { CartQuote } from '@/types';
import { formatEth } from '@/lib/eth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/stores/appStore';

export function CartPage() {
  const {
    user,
    cartItems,
    couponCode,
    updateCartQuantity,
    removeFromCart,
    setCouponCode,
    addToCart,
  } = useAppStore();
  const navigate = useNavigate();

  const [couponInput, setCouponInput] = useState(couponCode || '');
  const [couponError, setCouponError] = useState<string | null>(null);

  const { data: quote, isLoading, refetch } = useQuery({
    queryKey: ['cart-quote', cartItems, couponCode],
    enabled: cartItems.length > 0,
    queryFn: async () => {
      const res = await api.post<CartQuote>('/cart/quote', {
        items: cartItems,
        couponCode,
      });
      return res.data;
    },
  });

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError(null);
    const trimmed = couponInput.trim().toUpperCase();
    if (!trimmed) return;

    try {
      await api.post<CartQuote>('/cart/quote', {
        items: cartItems,
        couponCode: trimmed,
      });
      setCouponCode(trimmed);
      toast.success('Cupom ' + trimmed + ' aplicado!');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Cupom inválido.';
      setCouponError(msg);
      toast.error(msg);
    }
  };

  const handleAcceptUpdatedPrices = () => {
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
    refetch();
    toast.success('Cotação atualizada com os novos valores.');
  };

  const handleProceedToCheckout = () => {
    if (!user) {
      toast.info('Faça login para finalizar a compra.');
      navigate({ to: '/login', search: { redirect: '/checkout' } });
      return;
    }
    navigate({ to: '/checkout' });
  };

  if (cartItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/40 p-12 text-center space-y-4">
        <ShoppingBag className="h-12 w-12 text-zinc-500" />
        <h1 className="text-2xl font-bold text-white">Seu carrinho está vazio</h1>
        <p className="text-sm text-zinc-400 max-w-md">
          Explore nosso catálogo e adicione NFTs exclusivos para iniciar sua coleção.
        </p>
        <Link to="/">
          <Button className="bg-emerald-500 text-zinc-950 font-semibold hover:bg-emerald-400">
            Explorar NFTs
          </Button>
        </Link>
      </div>
    );
  }

    return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white sm:text-3xl">Carrinho de Compras</h1>

      {quote?.hasBlockingIssues && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-xl border border-amber-500/40 bg-amber-950/30 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-amber-300">
                Alteração detectada em tempo real no carrinho
              </p>
              <p className="text-amber-200/80">
                O preço ou estoque de um ou mais itens mudou. Aceite a nova cotação para prosseguir.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleAcceptUpdatedPrices}
            className="bg-amber-500 text-zinc-950 font-semibold hover:bg-amber-400 shrink-0"
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Aceitar Nova Cotação
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {isLoading || !quote
            ? Array.from({ length: cartItems.length }).map((_, idx) => (
                <div
                  key={idx}
                  className="flex gap-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4"
                >
                  <Skeleton className="h-20 w-20 rounded-lg bg-zinc-800" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-1/2 bg-zinc-800" />
                    <Skeleton className="h-4 w-1/3 bg-zinc-800" />
                  </div>
                </div>
              ))
            : quote.items.map((item) => (
                <div
                  key={item.nftId + '-' + item.editionId}
                  className="flex flex-col gap-4 rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="h-20 w-20 rounded-lg object-cover border border-zinc-800"
                    />
                    <div className="space-y-1">
                      <Link
                        to="/nft/$nftId"
                        params={{ nftId: item.nftId }}
                        className="font-semibold text-white hover:text-emerald-400"
                      >
                        {item.title}
                      </Link>
                      <p className="text-xs text-zinc-400">Edição: {item.editionName}</p>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-semibold text-emerald-400">
                          {formatEth(item.currentPriceEth)}
                        </span>
                        {item.priceChanged && (
                          <span className="line-through text-zinc-500">
                            {formatEth(item.snapshotPriceEth)}
                          </span>
                        )}
                      </div>
                      {item.stockInsufficient && (
                        <p className="text-xs text-red-400">
                          Estoque disponível: {item.availableStock} un.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={item.quantity <= 1}
                        onClick={() =>
                          updateCartQuantity(item.nftId, item.editionId, item.quantity - 1)
                        }
                        aria-label={'Diminuir quantidade de ' + item.title}
                        className="h-8 w-8 border-zinc-700 bg-zinc-950"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <span className="w-6 text-center text-sm font-medium text-white">
                        {item.quantity}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={item.quantity >= item.availableStock}
                        onClick={() =>
                          updateCartQuantity(item.nftId, item.editionId, item.quantity + 1)
                        }
                        aria-label={'Aumentar quantidade de ' + item.title}
                        className="h-8 w-8 border-zinc-700 bg-zinc-950"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFromCart(item.nftId, item.editionId)}
                      aria-label={'Remover ' + item.title + ' do carrinho'}
                      className="text-zinc-400 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
        </div>

        <aside className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 space-y-5 h-fit">
          <h2 className="text-lg font-semibold text-white">Resumo do Pedido</h2>

          <div className="space-y-2">
            <label htmlFor="coupon-input" className="text-xs font-medium text-zinc-400">
              Cupom de desconto (teste: JUNGLE10 ou VIP20)
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
                <Input
                  id="coupon-input"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  placeholder="Ex: JUNGLE10"
                  className="pl-8 border-zinc-700 bg-zinc-950 text-sm uppercase"
                />
              </div>
              <Button
                type="button"
                onClick={handleApplyCoupon}
                variant="secondary"
                className="bg-zinc-800 text-white hover:bg-zinc-700"
              >
                Aplicar
              </Button>
            </div>
            {couponError && <p className="text-xs text-red-400">{couponError}</p>}
            {couponCode && (
              <div className="flex items-center justify-between rounded-md bg-emerald-500/10 px-2.5 py-1.5 text-xs text-emerald-400">
                <span>Cupom ativo: {couponCode}</span>
                <button
                  type="button"
                  onClick={() => {
                    setCouponCode(null);
                    setCouponInput('');
                  }}
                  className="underline hover:text-emerald-300"
                >
                  Remover
                </button>
              </div>
            )}
          </div>

          {isLoading || !quote ? (
            <div className="space-y-3 border-t border-zinc-800 pt-4">
              <Skeleton className="h-4 w-full bg-zinc-800" />
              <Skeleton className="h-4 w-full bg-zinc-800" />
              <Skeleton className="h-6 w-full bg-zinc-800" />
            </div>
          ) : (
            <div className="space-y-2.5 border-t border-zinc-800 pt-4 text-sm">
              <div className="flex justify-between text-zinc-400">
                <span>Subtotal</span>
                <span className="text-zinc-200">{formatEth(quote.subtotalEth)}</span>
              </div>
              {Number(quote.discountEth) > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Desconto ({quote.couponCode})</span>
                  <span>- {formatEth(quote.discountEth)}</span>
                </div>
              )}
              <div className="flex justify-between text-zinc-400">
                <span>Taxa de Rede Estimada</span>
                <span className="text-zinc-200">{formatEth(quote.networkFeeEth)}</span>
              </div>
              <div className="flex justify-between border-t border-zinc-800 pt-3 text-base font-bold text-white">
                <span>Total</span>
                <span className="text-emerald-400">{formatEth(quote.totalEth)}</span>
              </div>
            </div>
          )}

          <Button
            type="button"
            disabled={isLoading || Boolean(quote?.hasBlockingIssues)}
            onClick={handleProceedToCheckout}
            className="w-full bg-emerald-500 text-zinc-950 font-semibold hover:bg-emerald-400"
          >
            Continuar para Pagamento
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </aside>
      </div>
    </div>
  );
}
