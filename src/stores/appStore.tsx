import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { api, TOKEN_STORAGE_KEY } from '@/api/client';
import { queryClient } from '@/main';
import {
  CartItem,
  NftUpdatedEvent,
  OrderUpdatedEvent,
  User,
} from '@/types';

const GUEST_CART_KEY = 'jungle_nft_guest_cart';
const COUPON_STORAGE_KEY = 'jungle_nft_coupon';

interface AppContextValue {
  user: User | null;
  isAuthLoading: boolean;
  cartItems: CartItem[];
  couponCode: string | null;
  socketConnected: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  addToCart: (item: CartItem) => void;
  updateCartQuantity: (nftId: string, editionId: string, quantity: number) => void;
  removeFromCart: (nftId: string, editionId: string) => void;
  clearPurchasedItems: (purchased: Array<{ nftId: string; editionId: string; quantity: number }>) => void;
  setCouponCode: (code: string | null) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [socketConnected, setSocketConnected] = useState<boolean>(false);

  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem(GUEST_CART_KEY);
      return raw ? (JSON.parse(raw) as CartItem[]) : [];
    } catch {
      return [];
    }
  });

  const [couponCode, setCouponCode] = useState<string | null>(() => {
    return localStorage.getItem(COUPON_STORAGE_KEY) || null;
  });

  const processedEventsRef = useRef<Set<string>>(new Set());
  const resourceVersionsRef = useRef<Record<string, number>>({});
  const currentUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    currentUserIdRef.current = user?.id || null;
  }, [user]);

  useEffect(() => {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(cartItems));
  }, [cartItems]);

  useEffect(() => {
    if (couponCode) {
      localStorage.setItem(COUPON_STORAGE_KEY, couponCode);
    } else {
      localStorage.removeItem(COUPON_STORAGE_KEY);
    }
  }, [couponCode]);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
      setIsAuthLoading(false);
      return;
    }

    api
      .get<{ user: User }>('/auth/me')
      .then(async (res) => {
        setUser(res.data.user);
        try {
          const cartRes = await api.get<{ items: CartItem[]; couponCode: string | null }>('/cart');
          if (cartRes.data.items.length > 0) {
            setCartItems(cartRes.data.items);
          }
          if (cartRes.data.couponCode) {
            setCouponCode(cartRes.data.couponCode);
          }
        } catch {
          // Mantém carrinho local se falhar
        }
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        setUser(null);
      })
      .finally(() => {
        setIsAuthLoading(false);
      });
  }, []);

  useEffect(() => {
    const handleExpired = () => {
      setUser(null);
      queryClient.removeQueries({ queryKey: ['favorites'] });
      queryClient.removeQueries({ queryKey: ['orders'] });
      toast.error('Sua sessão expirou. Faça login novamente para continuar.');
    };
    window.addEventListener('auth:session-expired', handleExpired);
    return () => window.removeEventListener('auth:session-expired', handleExpired);
  }, []);

    useEffect(() => {
    const socket: Socket = io(window.location.origin, {
      path: '/socket.io',
      transports: ['websocket'],
      reconnection: true,
    });

    socket.on('connect', () => {
      setSocketConnected(true);
      queryClient.invalidateQueries({ queryKey: ['nfts'] });
      queryClient.invalidateQueries({ queryKey: ['nft'] });
      queryClient.invalidateQueries({ queryKey: ['cart-quote'] });
      if (currentUserIdRef.current) {
        queryClient.invalidateQueries({ queryKey: ['orders'] });
      }
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    const handleNftUpdated = (event: NftUpdatedEvent) => {
      if (processedEventsRef.current.has(event.eventId)) return;
      const key = 'nft:' + event.nftId + ':' + event.editionId;
      const lastVersion = resourceVersionsRef.current[key] || 0;
      if (event.version <= lastVersion) return;

      processedEventsRef.current.add(event.eventId);
      resourceVersionsRef.current[key] = event.version;

      queryClient.invalidateQueries({ queryKey: ['nfts'] });
      queryClient.invalidateQueries({ queryKey: ['nft', event.nftId] });
      queryClient.invalidateQueries({ queryKey: ['cart-quote'] });

      toast.info('Atualização em tempo real: preço ou estoque de um NFT foi alterado.');
    };

    socket.on('nft.updated', handleNftUpdated);

    const onCustomNftUpdate = (e: Event) => {
      handleNftUpdated((e as CustomEvent<NftUpdatedEvent>).detail);
    };
    window.addEventListener('msw:nft.updated', onCustomNftUpdate);

    socket.on('order.updated', (event: OrderUpdatedEvent) => {
      if (processedEventsRef.current.has(event.eventId)) return;
      if (!currentUserIdRef.current || event.userId !== currentUserIdRef.current) {
        return;
      }

      const key = 'order:' + event.orderId;
      const lastVersion = resourceVersionsRef.current[key] || 0;
      if (event.version <= lastVersion) return;

      processedEventsRef.current.add(event.eventId);
      resourceVersionsRef.current[key] = event.version;

      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', event.orderId] });
      queryClient.invalidateQueries({ queryKey: ['nfts'] });

      if (event.status === 'confirmed') {
        toast.success('Pedido ' + event.orderId + ' confirmado na blockchain!');
      } else if (event.status === 'rejected') {
        toast.error(
          'Pedido ' + event.orderId + ' recusado: ' + (event.rejectionReason || 'Falha na rede')
        );
      }
    });

    return () => {
      window.removeEventListener('msw:nft.updated', onCustomNftUpdate);
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, []);
  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.post<{ token: string; user: User }>('/auth/login', {
        email,
        password,
        guestCart: cartItems,
      });
      localStorage.setItem(TOKEN_STORAGE_KEY, res.data.token);
      setUser(res.data.user);

      const cartRes = await api.get<{ items: CartItem[]; couponCode: string | null }>('/cart');
      setCartItems(cartRes.data.items);
      if (cartRes.data.couponCode) {
        setCouponCode(cartRes.data.couponCode);
      }

      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    [cartItems]
  );

  const register = useCallback(async (name: string, email: string, password: string) => {
    const res = await api.post<{ token: string; user: User }>('/auth/register', {
      name,
      email,
      password,
    });
    localStorage.setItem(TOKEN_STORAGE_KEY, res.data.token);
    setUser(res.data.user);
    setCartItems([]);
    setCouponCode(null);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignora erro de rede no logout
    }
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setUser(null);
    setCartItems([]);
    setCouponCode(null);
    processedEventsRef.current.clear();
    resourceVersionsRef.current = {};
    queryClient.clear();
  }, []);

  const addToCart = useCallback((newItem: CartItem) => {
    setCartItems((prev) => {
      const idx = prev.findIndex(
        (i) => i.nftId === newItem.nftId && i.editionId === newItem.editionId
      );
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          quantity: updated[idx].quantity + newItem.quantity,
          unitPriceEthSnapshot: newItem.unitPriceEthSnapshot,
        };
        return updated;
      }
      return [...prev, newItem];
    });
  }, []);

  const updateCartQuantity = useCallback(
    (nftId: string, editionId: string, quantity: number) => {
      setCartItems((prev) => {
        if (quantity <= 0) {
          return prev.filter(
            (i) => !(i.nftId === nftId && i.editionId === editionId)
          );
        }
        return prev.map((i) =>
          i.nftId === nftId && i.editionId === editionId ? { ...i, quantity } : i
        );
      });
    },
    []
  );

  const removeFromCart = useCallback((nftId: string, editionId: string) => {
    setCartItems((prev) =>
      prev.filter((i) => !(i.nftId === nftId && i.editionId === editionId))
    );
  }, []);

  const clearPurchasedItems = useCallback(
    (purchased: Array<{ nftId: string; editionId: string; quantity: number }>) => {
      setCartItems((prev) => {
        const next: CartItem[] = [];
        for (const item of prev) {
          const bought = purchased.find(
            (p) => p.nftId === item.nftId && p.editionId === item.editionId
          );
          if (!bought) {
            next.push(item);
          } else if (item.quantity > bought.quantity) {
            next.push({ ...item, quantity: item.quantity - bought.quantity });
          }
        }
        return next;
      });
      setCouponCode(null);
    },
    []
  );

  return (
    <AppContext.Provider
      value={{
        user,
        isAuthLoading,
        cartItems,
        couponCode,
        socketConnected,
        login,
        register,
        logout,
        setUser,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearPurchasedItems,
        setCouponCode,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppStore() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppStore deve ser usado dentro de AppProvider');
  return ctx;
}
