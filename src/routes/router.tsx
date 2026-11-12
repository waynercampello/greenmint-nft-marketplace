import React from 'react';
import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  useNavigate,
  Link,
} from '@tanstack/react-router';
import { Layout } from '@/components/Layout';
import { CatalogPage } from '@/pages/CatalogPage';
import { NftDetailPage } from '@/pages/NftDetailPage';
import { CartPage } from '@/pages/CartPage';
import { CheckoutPage } from '@/pages/CheckoutPage';
import { LoginPage, RegisterPage } from '@/pages/AuthPages';
import {
  ProfilePage,
  WalletsPage,
  FavoritesPage,
  OrdersPage,
} from '@/pages/AccountPages';
import { useAppStore } from '@/stores/appStore';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

// Guardião para rotas que exigem autenticação
function RequireAuth({
  children,
  redirectPath,
}: {
  children: React.ReactNode;
  redirectPath: string;
}) {
  const { user, isAuthLoading } = useAppStore();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!isAuthLoading && !user) {
      navigate({ to: '/login', search: { redirect: redirectPath } });
    }
  }, [isAuthLoading, user, navigate, redirectPath]);

  if (isAuthLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64 bg-zinc-800" />
        <Skeleton className="h-64 w-full bg-zinc-800" />
      </div>
    );
  }

  if (!user) return null;
  return <>{children}</>;
}

const rootRoute = createRootRoute({
  component: () => (
    <Layout>
      <Outlet />
    </Layout>
  ),
  notFoundComponent: () => (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/50 p-12 text-center space-y-4">
      <h1 className="text-3xl font-bold text-white">404 — Página não encontrada</h1>
      <p className="text-sm text-zinc-400">
        A rota acessada não existe no marketplace.
      </p>
      <Link to="/">
        <Button className="bg-emerald-500 text-zinc-950 font-semibold">
          Voltar para o Início
        </Button>
      </Link>
    </div>
  ),
});

interface CatalogSearch {
  search?: string;
  category?: string;
  sort?: 'featured' | 'price_asc' | 'price_desc' | 'newest';
  page?: number;
}

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  validateSearch: (search: Record<string, unknown>): CatalogSearch => ({
    search: typeof search.search === 'string' ? search.search : undefined,
    category: typeof search.category === 'string' ? search.category : undefined,
    sort:
      search.sort === 'price_asc' ||
      search.sort === 'price_desc' ||
      search.sort === 'newest' ||
      search.sort === 'featured'
        ? search.sort
        : undefined,
    page: Number(search.page) > 0 ? Number(search.page) : undefined,
  }),
  component: CatalogPage,
});

const nftDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/nft/$nftId',
  component: NftDetailPage,
});

const cartRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cart',
  component: CartPage,
});

const checkoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/checkout',
  component: () => (
    <RequireAuth redirectPath="/checkout">
      <CheckoutPage />
    </RequireAuth>
  ),
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : '/',
  }),
  component: LoginPage,
});

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  component: RegisterPage,
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
  component: () => (
    <RequireAuth redirectPath="/profile">
      <ProfilePage />
    </RequireAuth>
  ),
});

const walletsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/wallets',
  component: () => (
    <RequireAuth redirectPath="/wallets">
      <WalletsPage />
    </RequireAuth>
  ),
});

const favoritesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/favorites',
  component: () => (
    <RequireAuth redirectPath="/favorites">
      <FavoritesPage />
    </RequireAuth>
  ),
});

const ordersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/orders',
  component: () => (
    <RequireAuth redirectPath="/orders">
      <OrdersPage />
    </RequireAuth>
  ),
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  nftDetailRoute,
  cartRoute,
  checkoutRoute,
  loginRoute,
  registerRoute,
  profileRoute,
  walletsRoute,
  favoritesRoute,
  ordersRoute,
]);

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
