export type NetworkType = 'Ethereum' | 'Polygon' | 'Arbitrum' | 'Base';

export interface NFTEdition {
  id: string;
  name: string;
  priceEth: string; // Sempre trafega como string decimal exata
  stock: number;
  version: number;
}

export interface NFT {
  id: string;
  title: string;
  description: string;
  creator: string;
  creatorAvatar: string;
  collection: string;
  category: 'Art' | 'Gaming' | 'Collectibles' | 'Music' | '3D';
  image: string;
  gallery: string[];
  featured: boolean;
  createdAt: string;
  editions: NFTEdition[];
  version: number;
}

export interface Wallet {
  id: string;
  label: string;
  address: string;
  network: NetworkType;
  isPrimary: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  bio: string;
  wallets: Wallet[];
}

export interface CartItem {
  nftId: string;
  editionId: string;
  quantity: number;
  unitPriceEthSnapshot: string;
}

export interface CartQuote {
  items: Array<{
    nftId: string;
    editionId: string;
    title: string;
    editionName: string;
    image: string;
    quantity: number;
    availableStock: number;
    currentPriceEth: string;
    snapshotPriceEth: string;
    priceChanged: boolean;
    stockInsufficient: boolean;
    lineTotalEth: string;
  }>;
  couponCode: string | null;
  subtotalEth: string;
  discountEth: string;
  networkFeeEth: string;
  totalEth: string;
  hasBlockingIssues: boolean;
  quoteTimestamp: number;
}

export type OrderStatus = 'pending' | 'confirmed' | 'rejected';

export interface OrderItemSnapshot {
  nftId: string;
  editionId: string;
  title: string;
  editionName: string;
  image: string;
  quantity: number;
  unitPriceEth: string;
  lineTotalEth: string;
}

export interface Order {
  id: string;
  idempotencyKey: string;
  userId: string;
  status: OrderStatus;
  txHash: string | null;
  explorerUrl: string | null;
  walletAddress: string;
  network: NetworkType;
  items: OrderItemSnapshot[];
  couponCode: string | null;
  subtotalEth: string;
  discountEth: string;
  networkFeeEth: string;
  totalEth: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface ApiErrorResponse {
  code:
    | 'VALIDATION_ERROR'
    | 'UNAUTHORIZED'
    | 'FORBIDDEN'
    | 'NOT_FOUND'
    | 'CONFLICT'
    | 'QUOTE_OUTDATED'
    | 'IDEMPOTENCY_CONFLICT'
    | 'TRANSIENT_ERROR';
  message: string;
  fieldErrors?: Record<string, string>;
}

export interface NftUpdatedEvent {
  eventId: string;
  nftId: string;
  editionId: string;
  priceEth: string;
  stock: number;
  version: number;
}

export interface OrderUpdatedEvent {
  eventId: string;
  orderId: string;
  userId: string;
  status: OrderStatus;
  txHash: string | null;
  explorerUrl: string | null;
  rejectionReason?: string;
  version: number;
}

export type MockScenario =
  | 'default'
  | 'slow_network'
  | 'server_error_500'
  | 'session_expired'
  | 'payment_rejected'
  | 'checkout_timeout_idempotent';
