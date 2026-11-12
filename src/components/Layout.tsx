import React from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import {
  ShoppingCart,
  Heart,
  User as UserIcon,
  LogOut,
  Wallet,
  Package,
  Menu,
  Leaf,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useAppStore } from '@/stores/appStore';
import { MockControlPanel } from './MockControlPanel';

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, cartItems, logout } = useAppStore();
  const navigate = useNavigate();

  const totalItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const handleLogout = async () => {
    await logout();
    navigate({ to: '/' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#120e0b] text-[#f5efe8] selection:bg-amber-500/30">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-amber-500 focus:px-4 focus:py-2 focus:text-[#120e0b] focus:font-semibold"
      >
        Pular para o conteúdo principal
      </a>

      <header className="sticky top-0 z-40 border-b border-[#2e241d] bg-[#120e0b]/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <Link
              to="/"
              className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-md"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-amber-500 text-[#120e0b]">
                <Leaf className="h-5 w-5" />
              </div>
              <span>
                Green<span className="text-emerald-400">Mint</span>
              </span>
            </Link>

            <nav aria-label="Navegação principal" className="hidden md:flex items-center gap-6 text-sm">
              <Link
                to="/"
                className="text-stone-300 hover:text-amber-400 transition-colors [&.active]:text-amber-400 [&.active]:font-semibold"
              >
                Explorar
              </Link>
              {user && (
                <>
                  <Link
                    to="/favorites"
                    className="text-stone-300 hover:text-amber-400 transition-colors [&.active]:text-amber-400 [&.active]:font-semibold"
                  >
                    Favoritos
                  </Link>
                  <Link
                    to="/orders"
                    className="text-stone-300 hover:text-amber-400 transition-colors [&.active]:text-amber-400 [&.active]:font-semibold"
                  >
                    Meus Pedidos
                  </Link>
                </>
              )}
            </nav>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link to="/cart">
              <Button
                variant="outline"
                size="sm"
                className="relative border-[#3a2d24] bg-[#1c1612] text-stone-100 hover:bg-[#28201a] hover:text-white"
                aria-label={'Carrinho com ' + totalItems + ' itens'}
              >
                <ShoppingCart className="h-4 w-4 mr-2 text-amber-400" />
                <span>Carrinho</span>
                {totalItems > 0 && (
                  <Badge className="ml-2 bg-amber-500 text-[#120e0b] hover:bg-amber-400 px-1.5 py-0 text-xs font-bold">
                    {totalItems}
                  </Badge>
                )}
              </Button>
            </Link>

            {user ? (
              <div className="flex items-center gap-2">
                <Link to="/wallets">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-stone-300 hover:text-white hover:bg-[#1c1612]"
                  >
                    <Wallet className="h-4 w-4 mr-1.5 text-amber-400" />
                    Carteiras
                  </Button>
                </Link>
                <Link to="/profile">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-stone-200 hover:text-white hover:bg-[#1c1612] gap-2"
                  >
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="h-6 w-6 rounded-full object-cover border border-amber-500/40"
                    />
                    <span className="max-w-[110px] truncate">{user.name}</span>
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  aria-label="Sair da conta"
                  className="text-stone-400 hover:text-red-400 hover:bg-[#1c1612]"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" search={{ redirect: '/' }}>
                  <Button variant="ghost" size="sm" className="text-stone-300 hover:text-white">
                    Entrar
                  </Button>
                </Link>
                <Link to="/register">
                  <Button
                    size="sm"
                    className="bg-amber-500 text-[#120e0b] font-semibold hover:bg-amber-400"
                  >
                    Criar Conta
                  </Button>
                </Link>
              </div>
            )}
          </div>

          <div className="flex md:hidden items-center gap-2">
            <Link to="/cart">
              <Button
                variant="outline"
                size="icon"
                className="relative border-[#3a2d24] bg-[#1c1612] text-stone-100"
                aria-label={'Carrinho com ' + totalItems + ' itens'}
              >
                <ShoppingCart className="h-4 w-4 text-amber-400" />
                {totalItems > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[11px] font-bold text-[#120e0b]">
                    {totalItems}
                  </span>
                )}
              </Button>
            </Link>

            <Sheet>
              <SheetTrigger
                aria-label="Abrir menu de navegação"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-stone-200 hover:bg-[#1c1612]"
              >
                <Menu className="h-5 w-5" />
              </SheetTrigger>
              <SheetContent side="right" className="border-[#2e241d] bg-[#120e0b] text-stone-100 w-72">
                <SheetHeader>
                  <SheetTitle className="text-left text-white flex items-center gap-2">
                    <Leaf className="h-5 w-5 text-emerald-400" />
                    GreenMint
                  </SheetTitle>
                </SheetHeader>
                <nav className="mt-6 flex flex-col gap-3">
                  <Link
                    to="/"
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-stone-200 hover:bg-[#1c1612]"
                  >
                    Explorar Catálogo
                  </Link>
                  <Link
                    to="/cart"
                    className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-stone-200 hover:bg-[#1c1612]"
                  >
                    <span>Carrinho</span>
                    <Badge className="bg-amber-500 text-[#120e0b]">{totalItems}</Badge>
                  </Link>

                  {user ? (
                    <>
                      <Link
                        to="/favorites"
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-stone-200 hover:bg-[#1c1612]"
                      >
                        <Heart className="h-4 w-4 text-amber-400" />
                        Favoritos
                      </Link>
                      <Link
                        to="/orders"
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-stone-200 hover:bg-[#1c1612]"
                      >
                        <Package className="h-4 w-4 text-amber-400" />
                        Meus Pedidos
                      </Link>
                      <Link
                        to="/wallets"
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-stone-200 hover:bg-[#1c1612]"
                      >
                        <Wallet className="h-4 w-4 text-amber-400" />
                        Carteiras
                      </Link>
                      <Link
                        to="/profile"
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-stone-200 hover:bg-[#1c1612]"
                      >
                        <UserIcon className="h-4 w-4 text-amber-400" />
                        Meu Perfil
                      </Link>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleLogout}
                        className="mt-4 w-full"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Sair da Conta
                      </Button>
                    </>
                  ) : (
                    <div className="mt-4 flex flex-col gap-2">
                      <Link to="/login" search={{ redirect: '/' }}>
                        <Button variant="outline" className="w-full border-[#3a2d24]">
                          Entrar
                        </Button>
                      </Link>
                      <Link to="/register">
                        <Button className="w-full bg-amber-500 text-[#120e0b] font-semibold">
                          Criar Conta
                        </Button>
                      </Link>
                    </div>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main id="main-content" className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>

      <footer className="border-t border-[#2e241d] bg-[#0d0a08] py-10 text-xs text-stone-400">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 sm:grid-cols-3 sm:px-6 lg:px-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-base font-bold text-white">
              <Leaf className="h-4 w-4 text-emerald-400" />
              <span>
                Green<span className="text-emerald-400">Mint</span>
              </span>
            </div>
            <p className="text-stone-500 leading-relaxed">
              Marketplace de colecionáveis digitais e edições raras com liquidação simulada em tempo real.
            </p>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-stone-200">Navegação</p>
            <ul className="space-y-1.5 text-stone-400">
              <li>
                <Link to="/" className="hover:text-amber-400">
                  Explorar Catálogo
                </Link>
              </li>
              <li>
                <Link to="/cart" className="hover:text-amber-400">
                  Carrinho de Compras
                </Link>
              </li>
              <li>
                <Link to="/orders" className="hover:text-amber-400">
                  Meus Pedidos
                </Link>
              </li>
            </ul>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-stone-200">Ambiente Simulado</p>
            <p className="text-stone-500">
              Contratos REST via MSW, eventos Socket.IO e cálculos decimais exatos em ETH.
            </p>
          </div>
        </div>
      </footer>

      <MockControlPanel />
    </div>
  );
}
