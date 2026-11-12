import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  ArrowLeft,
  Heart,
  ShoppingCart,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Minus,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/api/client';
import { NFT } from '@/types';
import { formatEth } from '@/lib/eth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/stores/appStore';
import { queryClient } from '@/main';

export function NftDetailPage() {
  const { nftId } = useParams({ from: '/nft/$nftId' });
  const navigate = useNavigate();
  const { user, cartItems, addToCart } = useAppStore();

  const [selectedEditionId, setSelectedEditionId] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);

  const { data: nft, isLoading, isError, error } = useQuery({
    queryKey: ['nft', nftId],
    queryFn: async () => {
      const res = await api.get<NFT>('/nfts/' + nftId);
      return res.data;
    },
  });

  useEffect(() => {
    if (nft) {
      setSelectedImage(nft.image);
      const firstAvailable = nft.editions.find((e) => e.stock > 0) || nft.editions[0];
      if (firstAvailable && !selectedEditionId) {
        setSelectedEditionId(firstAvailable.id);
      }
    }
  }, [nft, selectedEditionId]);

  const { data: favoritesData } = useQuery({
    queryKey: ['favorites', user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const res = await api.get<{ favorites: string[] }>('/favorites');
      return res.data.favorites;
    },
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<{ favorites: string[] }>('/favorites/' + nftId);
      return res.data.favorites;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['favorites', user?.id] });
      const prev = queryClient.getQueryData<string[]>(['favorites', user?.id]) || [];
      const next = prev.includes(nftId) ? prev.filter((id) => id !== nftId) : [...prev, nftId];
      queryClient.setQueryData(['favorites', user?.id], next);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['favorites', user?.id], ctx.prev);
      toast.error('Erro ao salvar favorito.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites', user?.id] });
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Skeleton className="aspect-square w-full rounded-2xl bg-zinc-800" />
        <div className="space-y-4">
          <Skeleton className="h-6 w-32 bg-zinc-800" />
          <Skeleton className="h-10 w-3/4 bg-zinc-800" />
          <Skeleton className="h-24 w-full bg-zinc-800" />
          <Skeleton className="h-32 w-full bg-zinc-800" />
        </div>
      </div>
    );
  }

  const isNotFound = (error as { response?: { status?: number } })?.response?.status === 404;

  if (isError || !nft) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/50 p-12 text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-amber-400" />
        <h1 className="text-2xl font-bold text-white">
          {isNotFound ? 'NFT não encontrado' : 'Erro ao carregar detalhes'}
        </h1>
        <p className="text-sm text-zinc-400 max-w-md">
          {isNotFound
            ? 'O identificador acessado não existe ou foi removido do catálogo.'
            : 'Ocorreu uma falha na comunicação com a API.'}
        </p>
        <Link to="/">
          <Button className="bg-emerald-500 text-zinc-950 font-semibold hover:bg-emerald-400">
            Voltar ao Catálogo
          </Button>
        </Link>
      </div>
    );
  }

 const selectedEdition =
  nft.editions.find((e) => e.id === selectedEditionId) || nft.editions[0];


  const inCartQty =
    cartItems.find((i) => i.nftId === nft.id && i.editionId === selectedEdition?.id)
      ?.quantity || 0;

  const remainingAvailable = Math.max(0, (selectedEdition?.stock || 0) - inCartQty);
  const isFav = (favoritesData || []).includes(nft.id);

  const handleAdd = (goToCheckout = false) => {
    if (!selectedEdition || remainingAvailable <= 0) {
      toast.error('Quantidade indisponível em estoque para esta edição.');
      return;
    }

    const safeQty = Math.min(quantity, remainingAvailable);
    addToCart({
      nftId: nft.id,
      editionId: selectedEdition.id,
      quantity: safeQty,
      unitPriceEthSnapshot: selectedEdition.priceEth,
    });

    toast.success(nft.title + ' (' + selectedEdition.name + ') adicionado ao carrinho!');
    setQuantity(1);

    if (goToCheckout) {
      navigate({ to: '/cart' });
    }
  };

    return (
    <div className="space-y-6">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para o catálogo
      </Link>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
            <img
              src={selectedImage || nft.image}
              alt={nft.title}
              className="aspect-square w-full object-cover"
            />
          </div>

          {nft.gallery.length > 1 && (
            <div className="flex gap-3">
              {nft.gallery.map((imgUrl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedImage(imgUrl)}
                  aria-label={'Ver imagem ' + (idx + 1) + ' de ' + nft.title}
                  className={
                    selectedImage === imgUrl
                      ? 'h-20 w-20 overflow-hidden rounded-lg border-2 border-emerald-500 scale-105 transition-all'
                      : 'h-20 w-20 overflow-hidden rounded-lg border-2 border-zinc-800 opacity-70 hover:opacity-100 transition-all'
                  }
                >
                  <img src={imgUrl} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                  {nft.category}
                </Badge>
                <span className="text-sm text-zinc-400">{nft.collection}</span>
              </div>
              <h1 className="text-2xl font-bold text-white sm:text-3xl">{nft.title}</h1>
            </div>

            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
              aria-pressed={isFav}
              onClick={() => {
                if (!user) {
                  toast.info('Faça login para favoritar este NFT.');
                  navigate({ to: '/login', search: { redirect: '/nft/' + nft.id } });
                  return;
                }
                toggleFavoriteMutation.mutate();
              }}
              className="border-zinc-800 bg-zinc-900 hover:bg-zinc-800"
            >
              <Heart
                className={isFav ? 'h-5 w-5 fill-rose-500 text-rose-500' : 'h-5 w-5 text-zinc-300'}
              />
            </Button>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-3">
            <img
              src={nft.creatorAvatar}
              alt={nft.creator}
              className="h-10 w-10 rounded-full object-cover border border-zinc-700"
            />
            <div>
              <p className="text-xs text-zinc-400">Criador Verificado</p>
              <p className="text-sm font-medium text-white flex items-center gap-1">
                {nft.creator}
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
              </p>
            </div>
          </div>

          <p className="text-sm leading-relaxed text-zinc-300">{nft.description}</p>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-zinc-200">
              Selecione a Edição
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {nft.editions.map((ed) => {
                const isSelected = ed.id === selectedEdition?.id;
                const soldOut = ed.stock === 0;
                const btnClass = soldOut
                  ? 'flex flex-col items-start rounded-xl border p-3.5 text-left transition-all cursor-not-allowed border-zinc-800/50 bg-zinc-900/20 opacity-50'
                  : isSelected
                  ? 'flex flex-col items-start rounded-xl border p-3.5 text-left transition-all border-emerald-500 bg-emerald-500/10'
                  : 'flex flex-col items-start rounded-xl border p-3.5 text-left transition-all border-zinc-800 bg-zinc-900/60 hover:border-zinc-700';

                return (
                  <button
                    key={ed.id}
                    type="button"
                    disabled={soldOut}
                    onClick={() => {
                      setSelectedEditionId(ed.id);
                      setQuantity(1);
                    }}
                    className={btnClass}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="text-sm font-semibold text-white">{ed.name}</span>
                      {soldOut ? (
                        <Badge variant="destructive" className="text-[10px]">
                          Esgotado
                        </Badge>
                      ) : (
                        <span className="text-xs text-zinc-400">{ed.stock} disp.</span>
                      )}
                    </div>
                    <span className="mt-1 text-base font-bold text-emerald-400">
                      {formatEth(ed.priceEth)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedEdition && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-zinc-400">Preço unitário</p>
                  <p className="text-2xl font-bold text-white">
                    {formatEth(selectedEdition.priceEth)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={quantity <= 1 || remainingAvailable === 0}
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    aria-label="Diminuir quantidade"
                    className="h-9 w-9 border-zinc-700 bg-zinc-950"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center font-semibold text-white">{quantity}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={quantity >= remainingAvailable || remainingAvailable === 0}
                    onClick={() => setQuantity((q) => Math.min(remainingAvailable, q + 1))}
                    aria-label="Aumentar quantidade"
                    className="h-9 w-9 border-zinc-700 bg-zinc-950"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {inCartQty > 0 && (
                <p className="text-xs text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Você já possui {inCartQty} unidade(s) desta edição no carrinho.
                </p>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  disabled={remainingAvailable === 0}
                  onClick={() => handleAdd(false)}
                  className="border-zinc-700 bg-zinc-950 text-white hover:bg-zinc-800"
                >
                  <ShoppingCart className="mr-2 h-4 w-4 text-emerald-400" />
                  Adicionar ao Carrinho
                </Button>
                <Button
                  type="button"
                  disabled={remainingAvailable === 0}
                  onClick={() => handleAdd(true)}
                  className="bg-emerald-500 text-zinc-950 font-semibold hover:bg-emerald-400"
                >
                  Comprar Agora
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
