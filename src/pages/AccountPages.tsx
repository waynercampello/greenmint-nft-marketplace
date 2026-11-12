import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  User as UserIcon,
  Wallet as WalletIcon,
  Heart,
  Package,
  Plus,
  CheckCircle2,
  ExternalLink,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/api/client';
import { NFT, NetworkType, Order, User, Wallet } from '@/types';
import { formatEth } from '@/lib/eth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/stores/appStore';
import { queryClient } from '@/main';

export function ProfilePage() {
  const { user, setUser } = useAppStore();
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const updateProfileMutation = useMutation({
    mutationFn: async (payload: Record<string, string>) => {
      const res = await api.patch<{ user: User }>('/profile', payload);
      return res.data.user;
    },
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      setCurrentPassword('');
      setNewPassword('');
      toast.success('Perfil atualizado com sucesso!');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Erro ao atualizar perfil.';
      toast.error(msg);
    },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="flex items-center gap-3">
        <UserIcon className="h-6 w-6 text-emerald-400" />
        <h1 className="text-2xl font-bold text-white">Perfil do Colecionador</h1>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          updateProfileMutation.mutate({ name, bio, avatar });
        }}
        className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 space-y-4"
      >
        <h2 className="text-base font-semibold text-white">Dados Públicos</h2>
        <div className="flex items-center gap-4">
          <img
            src={avatar || user?.avatar}
            alt={name}
            className="h-16 w-16 rounded-full object-cover border border-zinc-700"
          />
          <div className="flex-1 space-y-1">
            <Label htmlFor="prof-avatar">URL do Avatar</Label>
            <Input
              id="prof-avatar"
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              className="border-zinc-800 bg-zinc-950 text-xs"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="prof-name">Nome de Exibição</Label>
          <Input
            id="prof-name"
            required
            minLength={3}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border-zinc-800 bg-zinc-950"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="prof-email">E-mail (não alterável)</Label>
          <Input
            id="prof-email"
            disabled
            value={user?.email || ''}
            className="border-zinc-800 bg-zinc-950/50 text-zinc-500"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="prof-bio">Biografia</Label>
          <Input
            id="prof-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="border-zinc-800 bg-zinc-950"
          />
        </div>
        <Button
          type="submit"
          disabled={updateProfileMutation.isPending}
          className="bg-emerald-500 text-zinc-950 font-semibold hover:bg-emerald-400"
        >
          Salvar Alterações
        </Button>
      </form>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          updateProfileMutation.mutate({ currentPassword, newPassword });
        }}
        className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 space-y-4"
      >
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-emerald-400" />
          <h2 className="text-base font-semibold text-white">Alterar Senha</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="curr-pass">Senha Atual</Label>
            <Input
              id="curr-pass"
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="border-zinc-800 bg-zinc-950"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-pass">Nova Senha (mín. 6 caracteres)</Label>
            <Input
              id="new-pass"
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="border-zinc-800 bg-zinc-950"
            />
          </div>
        </div>
        <Button
          type="submit"
          variant="outline"
          disabled={updateProfileMutation.isPending}
          className="border-zinc-700 text-white hover:bg-zinc-800"
        >
          Atualizar Senha
        </Button>
      </form>
    </div>
  );
}
export function WalletsPage() {
  const { user, setUser } = useAppStore();
  const [label, setLabel] = useState('');
  const [address, setAddress] = useState('');
  const [network, setNetwork] = useState<NetworkType>('Ethereum');
  const [isPrimary, setIsPrimary] = useState(false);

  const addWalletMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<{ wallets: Wallet[] }>('/wallets', {
        label,
        address,
        network,
        isPrimary,
      });
      return res.data.wallets;
    },
    onSuccess: (wallets) => {
      if (user) setUser({ ...user, wallets });
      setLabel('');
      setAddress('');
      setIsPrimary(false);
      toast.success('Carteira cadastrada com sucesso!');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Endereço de carteira inválido.';
      toast.error(msg);
    },
  });

  const setPrimaryMutation = useMutation({
    mutationFn: async (walletId: string) => {
      const res = await api.patch<{ wallets: Wallet[] }>('/wallets/' + walletId + '/primary');
      return res.data.wallets;
    },
    onSuccess: (wallets) => {
      if (user) setUser({ ...user, wallets });
      toast.success('Carteira principal atualizada.');
    },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex items-center gap-3">
        <WalletIcon className="h-6 w-6 text-emerald-400" />
        <h1 className="text-2xl font-bold text-white">Minhas Carteiras</h1>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {user?.wallets.map((w) => (
          <div
            key={w.id}
            className={
              w.isPrimary
                ? 'rounded-xl border border-emerald-500/60 bg-emerald-950/10 p-4 space-y-3'
                : 'rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-3'
            }
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white">{w.label}</span>
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="border-zinc-700 text-xs">
                  {w.network}
                </Badge>
                {w.isPrimary && (
                  <Badge className="bg-emerald-500 text-zinc-950 text-[10px]">Principal</Badge>
                )}
              </div>
            </div>
            <p className="font-mono text-xs text-zinc-400 break-all">{w.address}</p>
            {!w.isPrimary && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setPrimaryMutation.mutate(w.id)}
                className="h-7 px-2 text-xs text-emerald-400 hover:bg-zinc-800"
              >
                Definir como Principal
              </Button>
            )}
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          addWalletMutation.mutate();
        }}
        className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 space-y-4"
      >
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <Plus className="h-4 w-4 text-emerald-400" />
          Adicionar Nova Carteira
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="w-label">Apelido da Carteira</Label>
            <Input
              id="w-label"
              required
              placeholder="Ex: Ledger Vault"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="border-zinc-800 bg-zinc-950"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="w-net">Rede Padrão</Label>
            <select
              id="w-net"
              value={network}
              onChange={(e) => setNetwork(e.target.value as NetworkType)}
              className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white"
            >
              <option value="Ethereum">Ethereum</option>
              <option value="Polygon">Polygon</option>
              <option value="Arbitrum">Arbitrum</option>
              <option value="Base">Base</option>
            </select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="w-addr">Endereço Público (0x...)</Label>
          <Input
            id="w-addr"
            required
            placeholder="0x71C7656EC7ab88b098defB751B7401B5f6d8976F"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="border-zinc-800 bg-zinc-950 font-mono text-xs"
          />
        </div>
        <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
          <input
            type="checkbox"
            checked={isPrimary}
            onChange={(e) => setIsPrimary(e.target.checked)}
            className="rounded border-zinc-700"
          />
          Definir como carteira principal
        </label>
        <Button
          type="submit"
          disabled={addWalletMutation.isPending}
          className="bg-emerald-500 text-zinc-950 font-semibold hover:bg-emerald-400"
        >
          Cadastrar Carteira
        </Button>
      </form>
    </div>
  );
}

export function FavoritesPage() {
  const { user } = useAppStore();

  const { data: favIds, isLoading: favLoading } = useQuery({
    queryKey: ['favorites', user?.id],
    queryFn: async () => {
      const res = await api.get<{ favorites: string[] }>('/favorites');
      return res.data.favorites;
    },
  });

  const { data: nftsData, isLoading: nftsLoading } = useQuery({
    queryKey: ['nfts', '', 'ALL', 'featured', 1],
    queryFn: async () => {
      const res = await api.get<{ items: NFT[] }>('/nfts', { params: { limit: 50 } });
      return res.data.items;
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (nftId: string) => {
      await api.post('/favorites/' + nftId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites', user?.id] });
      toast.success('Removido dos favoritos.');
    },
  });

  const favoriteNfts = (nftsData || []).filter((n) => (favIds || []).includes(n.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Heart className="h-6 w-6 text-rose-500" />
        <h1 className="text-2xl font-bold text-white">Meus Favoritos</h1>
      </div>

      {favLoading || nftsLoading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <Skeleton className="h-64 rounded-xl bg-zinc-800" />
          <Skeleton className="h-64 rounded-xl bg-zinc-800" />
        </div>
      ) : favoriteNfts.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-12 text-center space-y-3">
          <p className="text-zinc-400">Você ainda não favoritou nenhum NFT.</p>
          <Link to="/">
            <Button className="bg-emerald-500 text-zinc-950 font-semibold">
              Explorar Catálogo
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {favoriteNfts.map((nft) => (
            <div
              key={nft.id}
              className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-3"
            >
              <img
                src={nft.image}
                alt={nft.title}
                className="aspect-square w-full rounded-lg object-cover"
              />
              <h2 className="font-semibold text-white truncate">{nft.title}</h2>
              <div className="flex items-center justify-between pt-2">
                <Link to="/nft/$nftId" params={{ nftId: nft.id }}>
                  <Button size="sm" className="bg-emerald-500 text-zinc-950 font-semibold">
                    Ver NFT
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeMutation.mutate(nft.id)}
                  className="text-xs text-zinc-400 hover:text-red-400"
                >
                  Remover
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function OrdersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const res = await api.get<{ orders: Order[] }>('/orders');
      return res.data.orders;
    },
  });

  const orders = data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Package className="h-6 w-6 text-emerald-400" />
        <h1 className="text-2xl font-bold text-white">Histórico de Pedidos</h1>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full rounded-xl bg-zinc-800" />
          <Skeleton className="h-28 w-full rounded-xl bg-zinc-800" />
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-12 text-center space-y-3">
          <p className="text-zinc-400">Nenhum pedido encontrado na sua conta.</p>
          <Link to="/">
            <Button className="bg-emerald-500 text-zinc-950 font-semibold">
              Explorar NFTs
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-white">{order.id}</span>
                  {order.status === 'confirmed' && (
                    <Badge className="bg-emerald-500/15 text-emerald-400">
                      <CheckCircle2 className="mr-1 h-3 w-3" /> Confirmado
                    </Badge>
                  )}
                  {order.status === 'pending' && <Badge variant="secondary">Pendente</Badge>}
                  {order.status === 'rejected' && <Badge variant="destructive">Recusado</Badge>}
                </div>
                <div className="text-xs text-zinc-400">
                  {new Date(order.createdAt).toLocaleString('pt-BR')} • Rede {order.network}
                </div>
              </div>

              <div className="space-y-2">
                {order.items.map((item) => (
                  <div
                    key={item.nftId + '-' + item.editionId}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-zinc-300">
                      {item.title} ({item.editionName}) × {item.quantity}
                    </span>
                    <span className="text-zinc-200 font-medium">
                      {formatEth(item.lineTotalEth)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800 pt-3 text-sm">
                <div>
                  <span className="text-zinc-400 mr-2">Total:</span>
                  <span className="font-bold text-emerald-400">{formatEth(order.totalEth)}</span>
                </div>
                {order.explorerUrl && (
                  <a
                    href={order.explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-zinc-300 hover:text-white"
                  >
                    Ver no Explorer <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
