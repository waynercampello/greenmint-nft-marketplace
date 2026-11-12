import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Search,
  Heart,
  SlidersHorizontal,
  Sparkles,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/api/client';
import { NFT } from '@/types';
import { formatEth } from '@/lib/eth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { NftArtwork } from '@/components/NftArtwork';
import { useAppStore } from '@/stores/appStore';
import { queryClient } from '@/main';

const CATEGORIES = ['ALL', 'Art', 'Gaming', '3D', 'Collectibles', 'Music'] as const;

interface NftsResponse {
  items: NFT[];
  total: number;
  page: number;
  totalPages: number;
}

export function CatalogPage() {
  const searchParams = useSearch({ from: '/' });
  const navigate = useNavigate({ from: '/' });
  const { user } = useAppStore();

  const [searchInput, setSearchInput] = useState(searchParams.search || '');

  useEffect(() => {
    setSearchInput(searchParams.search || '');
  }, [searchParams.search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if ((searchParams.search || '') !== searchInput) {
        navigate({
          search: (prev) => ({
            ...prev,
            search: searchInput || undefined,
            page: 1,
          }),
        });
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput, searchParams.search, navigate]);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: [
      'nfts',
      searchParams.search || '',
      searchParams.category || 'ALL',
      searchParams.sort || 'featured',
      searchParams.page || 1,
    ],
    queryFn: async ({ signal }) => {
      const res = await api.get<NftsResponse>('/nfts', {
        signal,
        params: {
          search: searchParams.search || '',
          category: searchParams.category || 'ALL',
          sort: searchParams.sort || 'featured',
          page: searchParams.page || 1,
          limit: 6,
        },
      });
      return res.data;
    },
  });

  const { data: favoritesData } = useQuery({
    queryKey: ['favorites', user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const res = await api.get<{ favorites: string[] }>('/favorites');
      return res.data.favorites;
    },
  });

  const favorites = favoritesData || [];

  const toggleFavoriteMutation = useMutation({
    mutationFn: async (nftId: string) => {
      const res = await api.post<{ favorites: string[] }>('/favorites/' + nftId);
      return res.data.favorites;
    },
    onMutate: async (nftId: string) => {
      await queryClient.cancelQueries({ queryKey: ['favorites', user?.id] });
      const previousFavorites = queryClient.getQueryData<string[]>(['favorites', user?.id]) || [];

      const optimisticNext = previousFavorites.includes(nftId)
        ? previousFavorites.filter((id) => id !== nftId)
        : [...previousFavorites, nftId];

      queryClient.setQueryData(['favorites', user?.id], optimisticNext);
      return { previousFavorites };
    },
    onError: (_err, _nftId, context) => {
      if (context?.previousFavorites) {
        queryClient.setQueryData(['favorites', user?.id], context.previousFavorites);
      }
      toast.error('Não foi possível atualizar favorito. Alteração desfeita.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites', user?.id] });
    },
  });

  const handleToggleFavorite = (e: React.MouseEvent, nftId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.info('Faça login para salvar NFTs nos seus favoritos.');
      navigate({ to: '/login', search: { redirect: '/' } });
      return;
    }
    toggleFavoriteMutation.mutate(nftId);
  };

    return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-2xl border border-[#2e241d] bg-gradient-to-br from-[#1c1612] via-[#120e0b] to-amber-950/25 p-6 sm:p-10">
        <div className="max-w-2xl space-y-4">
          <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/20">
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            Marketplace Oficial GreenMint
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Descubra, colecione e negocie <span className="text-amber-400">NFTs raros</span>.
          </h1>
          <p className="text-sm sm:text-base text-stone-400">
            Explore edições verificadas com cotação em tempo real via Socket.IO e checkout protegido por idempotência.
          </p>
        </div>
      </section>

      <section aria-label="Filtros do catálogo" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <Input
              type="search"
              placeholder="Buscar por nome, criador ou coleção..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Buscar NFTs"
              className="pl-9 border-[#2e241d] bg-[#1c1612] text-stone-100 placeholder:text-stone-500 focus-visible:ring-amber-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-amber-400" />
            <label htmlFor="sort-select" className="sr-only">
              Ordenar por
            </label>
            <select
              id="sort-select"
              value={searchParams.sort || 'featured'}
              onChange={(e) =>
                navigate({
                  search: (prev) => ({
                    ...prev,
                    sort: e.target.value as 'featured' | 'price_asc' | 'price_desc' | 'newest',
                    page: 1,
                  }),
                })
              }
              className="rounded-md border border-[#2e241d] bg-[#1c1612] px-3 py-2 text-sm text-stone-100 focus:border-amber-500 focus:outline-none"
            >
              <option value="featured">Destaques</option>
              <option value="newest">Mais recentes</option>
              <option value="price_asc">Menor preço (ETH)</option>
              <option value="price_desc">Maior preço (ETH)</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por categoria">
          {CATEGORIES.map((cat) => {
            const active = (searchParams.category || 'ALL') === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() =>
                  navigate({
                    search: (prev) => ({
                      ...prev,
                      category: cat === 'ALL' ? undefined : cat,
                      page: 1,
                    }),
                  })
                }
                className={
                  active
                    ? 'rounded-full px-4 py-1.5 text-xs bg-amber-500 text-[#120e0b] font-semibold transition-colors'
                    : 'rounded-full px-4 py-1.5 text-xs font-medium border border-[#2e241d] bg-[#1c1612] text-stone-300 hover:bg-[#28201a] hover:text-white transition-colors'
                }
              >
                {cat === 'ALL' ? 'Todas as Categorias' : cat}
              </button>
            );
          })}
        </div>
      </section>

      <section aria-label="Lista de NFTs">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="overflow-hidden rounded-xl border border-[#2e241d] bg-[#1c1612] p-4 space-y-4"
              >
                <Skeleton className="aspect-square w-full rounded-lg bg-[#28201a]" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-1/3 bg-[#28201a]" />
                  <Skeleton className="h-5 w-3/4 bg-[#28201a]" />
                </div>
                <div className="flex justify-between pt-2">
                  <Skeleton className="h-6 w-24 bg-[#28201a]" />
                  <Skeleton className="h-8 w-20 bg-[#28201a]" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div
            role="alert"
            className="flex flex-col items-center justify-center rounded-xl border border-red-900/50 bg-red-950/20 p-10 text-center space-y-3"
          >
            <AlertCircle className="h-10 w-10 text-red-400" />
            <h2 className="text-lg font-semibold text-white">Erro ao carregar o catálogo</h2>
            <p className="text-sm text-stone-400 max-w-md">
              Não foi possível obter os NFTs no momento. Verifique o cenário de rede ou tente novamente.
            </p>
            <Button
              onClick={() => refetch()}
              variant="outline"
              className="border-[#3a2d24] bg-[#1c1612] text-white hover:bg-[#28201a]"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Tentar Novamente
            </Button>
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-[#2e241d] bg-[#1c1612]/60 p-12 text-center space-y-3">
            <h2 className="text-lg font-semibold text-white">Nenhum NFT encontrado</h2>
            <p className="text-sm text-stone-400">
              Tente limpar os filtros ou buscar por outro termo.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchInput('');
                navigate({ search: {} });
              }}
              className="border-[#3a2d24] text-stone-200"
            >
              Limpar Filtros
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between text-xs text-stone-400">
              <span>
                Mostrando {data.items.length} de {data.total} resultados
              </span>
              {isFetching && <span className="text-emerald-400">Sincronizando...</span>}
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {data.items.map((nft) => {
                const defaultEdition = nft.editions [0];
                const totalStock = nft.editions.reduce((sum, ed) => sum + ed.stock, 0);
                const isFav = favorites.includes(nft.id);

                return (
                  <article
                    key={nft.id}
                    className="group relative flex flex-col overflow-hidden rounded-xl border border-[#2e241d] bg-[#1c1612] transition-all hover:border-amber-500/60 hover:shadow-lg hover:shadow-amber-500/10"
                  >
                    <Link
                      to="/nft/$nftId"
                      params={{ nftId: nft.id }}
                      className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                    >
                      <div className="relative aspect-square overflow-hidden bg-[#120e0b]">
                        <NftArtwork
                          nftId={nft.id}
                          title={nft.title}
                          className="h-full w-full transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute top-3 left-3 flex gap-1.5">
                          <Badge className="bg-[#120e0b]/85 text-stone-200 backdrop-blur border-[#3a2d24]">
                            {nft.category}
                          </Badge>
                          {totalStock === 0 && (
                            <Badge variant="destructive">Esgotado</Badge>
                          )}
                        </div>
                      </div>

                      <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between text-xs text-stone-400">
                          <span className="truncate">{nft.collection}</span>
                          <span>{totalStock} un. disponíveis</span>
                        </div>

                        <h2 className="text-base font-semibold text-white group-hover:text-amber-400 transition-colors truncate">
                          {nft.title}
                        </h2>

                        <div className="flex items-center justify-between border-t border-[#2e241d] pt-3">
                          <div>
                            <p className="text-[11px] uppercase tracking-wider text-stone-500">
                              A partir de
                            </p>
                            <p className="text-sm font-bold text-amber-400">
                              {formatEth(defaultEdition?.priceEth || '0')}
                            </p>
                          </div>

                          <span className="rounded-lg bg-[#28201a] px-3 py-1.5 text-xs font-medium text-stone-200 group-hover:bg-amber-500 group-hover:text-[#120e0b] group-hover:font-semibold transition-colors">
                            Ver Detalhes
                          </span>
                        </div>
                      </div>
                    </Link>

                    <button
                      type="button"
                      onClick={(e) => handleToggleFavorite(e, nft.id)}
                      aria-label={
                        isFav
                          ? 'Remover ' + nft.title + ' dos favoritos'
                          : 'Adicionar ' + nft.title + ' aos favoritos'
                      }
                      aria-pressed={isFav}
                      className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full border border-[#3a2d24] bg-[#120e0b]/85 text-stone-200 backdrop-blur transition-colors hover:bg-[#1c1612] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                    >
                      <Heart
                        className={isFav ? 'h-4 w-4 fill-rose-500 text-rose-500' : 'h-4 w-4 text-stone-300'}
                      />
                    </button>
                  </article>
                );
              })}
            </div>

            {data.totalPages > 1 && (
              <nav
                aria-label="Paginação do catálogo"
                className="mt-8 flex items-center justify-center gap-3"
              >
                <Button
                  variant="outline"
                  size="sm"
                  disabled={data.page === 1}
                  onClick={() =>
                    navigate({
                      search: (prev) => ({ ...prev, page: Math.max(1, data.page - 1) }),
                    })
                  }
                  className="border-[#2e241d] bg-[#1c1612] text-stone-200"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Anterior
                </Button>
                <span className="text-sm text-stone-400">
                  Página <strong className="text-white">{data.page}</strong> de{' '}
                  <strong className="text-white">{data.totalPages}</strong>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={data.page === data.totalPages}
                  onClick={() =>
                    navigate({
                      search: (prev) => ({
                        ...prev,
                        page: Math.min(data.totalPages, data.page + 1),
                      }),
                    })
                  }
                  className="border-[#2e241d] bg-[#1c1612] text-stone-200"
                >
                  Próxima
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </nav>
            )}
          </>
        )}
      </section>
    </div>
  );
}
