import { NFT, Order, User, MockScenario } from '@/types';

export interface StoredUser extends User {
  passwordHash: string;
  favorites: string[];
}

export interface MockDatabase {
  users: StoredUser[];
  nfts: NFT[];
  orders: Order[];
  userCarts: Record<
    string,
    {
      items: Array<{
        nftId: string;
        editionId: string;
        quantity: number;
        unitPriceEthSnapshot: string;
      }>;
      couponCode: string | null;
    }
  >;
  activeTokens: Record<string, string>;
  scenario: MockScenario;
  latencyMs: number;
}

const DB_STORAGE_KEY = 'greenmint_nft_mock_db_v2';

function makeArtSvg(title: string, _c1: string, _c2: string, _symbol: string): string {
  const map: Record<string, string> = {
    'JUNGLE APE #042': '/nfts/1.svg',
    'APE ALT VIEW': '/nfts/2.svg',
    'OBSIDIAN PASS': '/nfts/2.svg',
    'ASTRAL PRISM': '/nfts/3.svg',
    'SYNTHWAVE #09': '/nfts/4.svg',
    'GOLDEN TOTEM': '/nfts/5.svg',
    'MECHA HELMET': '/nfts/6.svg',
    'NEBULA DRIFT': '/nfts/7.svg',
    'QUANTUM CORE': '/nfts/8.svg',
  };
  return map[title] || '/nfts/1.svg';
}






export function hashPassword(raw: string): string {
  return 'sha256_sim_' + btoa(raw).split('').reverse().join('');
}

export const INITIAL_USERS: StoredUser[] = [
  {
    id: 'user-1',
    name: 'Alex Rivera',
    email: 'alex@collector.io',
    passwordHash: hashPassword('Senha@123'),
    avatar: makeArtSvg('AR', '#10b981', '#064e3b', 'AR'),
    bio: 'Digital art collector & Web3 gaming enthusiast.',
    favorites: ['nft-1', 'nft-3'],
    wallets: [
      {
        id: 'w-1',
        label: 'Main Vault',
        address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
        network: 'Ethereum',
        isPrimary: true,
      },
      {
        id: 'w-2',
        label: 'Polygon Fast',
        address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
        network: 'Polygon',
        isPrimary: false,
      },
    ],
  },
  {
    id: 'user-2',
    name: 'Marina Costa',
    email: 'marina@studio.io',
    passwordHash: hashPassword('Senha@123'),
    avatar: makeArtSvg('MC', '#f59e0b', '#78350f', 'MC'),
    bio: 'Curator of generative 3D sculptures and rare passes.',
    favorites: ['nft-2'],
    wallets: [
      {
        id: 'w-3',
        label: 'Arbitrum One',
        address: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
        network: 'Arbitrum',
        isPrimary: true,
      },
    ],
  },
];

export const INITIAL_NFTS: NFT[] = [
  {
    id: 'nft-1',
    title: 'Cybernetic Jungle Ape #042',
    description:
      'Hand-crafted cybernetic guardian from the Neon Canopy series with full commercial rights.',
    creator: 'Kaito Studio',
    creatorAvatar: makeArtSvg('KS', '#10b981', '#065f46', 'KS'),
    collection: 'Neon Canopy',
    category: 'Art',
    image: makeArtSvg('JUNGLE APE #042', '#065f46', '#1c1612', '🦍'),
    gallery: [
      makeArtSvg('JUNGLE APE #042', '#065f46', '#1c1612', '🦍'),
      makeArtSvg('APE ALT VIEW', '#b45309', '#1c1612', '👑'),
    ],
    featured: true,
    createdAt: '2026-10-01T10:00:00Z',
    version: 1,
    editions: [
      { id: 'ed-1-std', name: 'Standard Edition', priceEth: '0.2500', stock: 12, version: 1 },
      { id: 'ed-1-gold', name: 'Gold Foil Rare', priceEth: '0.8500', stock: 2, version: 1 },
    ],
  },
  {
    id: 'nft-2',
    title: 'Obsidian Relic Pass',
    description:
      'VIP access token granting early entry into upcoming tournaments and drops.',
    creator: 'Vortex Labs',
    creatorAvatar: makeArtSvg('VL', '#f59e0b', '#78350f', 'VL'),
    collection: 'Relic Passes',
    category: 'Gaming',
    image: makeArtSvg('OBSIDIAN PASS', '#78350f', '#120e0b', '🛡️'),
    gallery: [makeArtSvg('OBSIDIAN PASS', '#78350f', '#120e0b', '🛡️')],
    featured: true,
    createdAt: '2026-10-05T14:30:00Z',
    version: 1,
    editions: [
      { id: 'ed-2-std', name: 'Founder Tier', priceEth: '0.4000', stock: 5, version: 1 },
      { id: 'ed-2-sold', name: 'Genesis 1/1 (Sold Out)', priceEth: '2.5000', stock: 0, version: 1 },
    ],
  },
  {
    id: 'nft-3',
    title: 'Astral Prism #118',
    description:
      'Ray-traced crystalline geometry reacting dynamically to on-chain block timestamps.',
    creator: 'Solstice 3D',
    creatorAvatar: makeArtSvg('S3', '#059669', '#064e3b', 'S3'),
    collection: 'Astral Geometry',
    category: '3D',
    image: makeArtSvg('ASTRAL PRISM', '#0f766e', '#1c1612', '💎'),
    gallery: [makeArtSvg('ASTRAL PRISM', '#0f766e', '#1c1612', '💎')],
    featured: true,
    createdAt: '2026-10-10T09:15:00Z',
    version: 1,
    editions: [
      { id: 'ed-3-std', name: 'Open Edition', priceEth: '0.1200', stock: 25, version: 1 },
    ],
  },
  {
    id: 'nft-4',
    title: 'Synthwave Vinyl #09',
    description:
      'Lossless master audio collectible with interactive visual stem mixer.',
    creator: 'Echo Pulse',
    creatorAvatar: makeArtSvg('EP', '#d97706', '#451a03', 'EP'),
    collection: 'Sonic Waves',
    category: 'Music',
    image: makeArtSvg('SYNTHWAVE #09', '#92400e', '#120e0b', '🎵'),
    gallery: [makeArtSvg('SYNTHWAVE #09', '#92400e', '#120e0b', '🎵')],
    featured: false,
    createdAt: '2026-10-12T18:00:00Z',
    version: 1,
    editions: [
      { id: 'ed-4-std', name: 'Digital Master', priceEth: '0.0800', stock: 40, version: 1 },
    ],
  },
  {
    id: 'nft-5',
    title: 'Golden Totem Statue',
    description:
      'Rare collectible artifact forged for high-tier marketplace members.',
    creator: 'Kaito Studio',
    creatorAvatar: makeArtSvg('KS', '#10b981', '#065f46', 'KS'),
    collection: 'Neon Canopy',
    category: 'Collectibles',
    image: makeArtSvg('GOLDEN TOTEM', '#b45309', '#1c1612', '🗿'),
    gallery: [makeArtSvg('GOLDEN TOTEM', '#b45309', '#1c1612', '🗿')],
    featured: false,
    createdAt: '2026-10-15T11:20:00Z',
    version: 1,
    editions: [
      { id: 'ed-5-std', name: 'Bronze Edition', priceEth: '0.3000', stock: 8, version: 1 },
      { id: 'ed-5-plat', name: 'Platinum Edition', priceEth: '1.1500', stock: 1, version: 1 },
    ],
  },
  {
    id: 'nft-6',
    title: 'Mecha Samurai Helmet',
    description:
      '3D wearable asset compatible with major metaverse arenas.',
    creator: 'Vortex Labs',
    creatorAvatar: makeArtSvg('VL', '#f59e0b', '#78350f', 'VL'),
    collection: 'Relic Passes',
    category: 'Gaming',
    image: makeArtSvg('MECHA HELMET', '#047857', '#120e0b', '⚔️'),
    gallery: [makeArtSvg('MECHA HELMET', '#047857', '#120e0b', '⚔️')],
    featured: false,
    createdAt: '2026-10-18T16:45:00Z',
    version: 1,
    editions: [
      { id: 'ed-6-std', name: 'Standard Armor', priceEth: '0.5500', stock: 6, version: 1 },
    ],
  },
  {
    id: 'nft-7',
    title: 'Nebula Drift #77',
    description:
      'Deep-space generative oil simulation rendered at 8K resolution.',
    creator: 'Solstice 3D',
    creatorAvatar: makeArtSvg('S3', '#059669', '#064e3b', 'S3'),
    collection: 'Astral Geometry',
    category: 'Art',
    image: makeArtSvg('NEBULA DRIFT', '#7c2d12', '#120e0b', '🌌'),
    gallery: [makeArtSvg('NEBULA DRIFT', '#7c2d12', '#120e0b', '🌌')],
    featured: false,
    createdAt: '2026-10-20T08:00:00Z',
    version: 1,
    editions: [
      { id: 'ed-7-std', name: 'Signed Print NFT', priceEth: '0.1900', stock: 15, version: 1 },
    ],
  },
  {
    id: 'nft-8',
    title: 'Quantum Core #01',
    description:
      'Animated energy core collectible with unlockable sound design pack.',
    creator: 'Echo Pulse',
    creatorAvatar: makeArtSvg('EP', '#d97706', '#451a03', 'EP'),
    collection: 'Sonic Waves',
    category: '3D',
    image: makeArtSvg('QUANTUM CORE', '#065f46', '#120e0b', '⚛️'),
    gallery: [makeArtSvg('QUANTUM CORE', '#065f46', '#120e0b', '⚛️')],
    featured: false,
    createdAt: '2026-10-22T21:10:00Z',
    version: 1,
    editions: [
      { id: 'ed-8-std', name: 'Core Edition', priceEth: '0.6200', stock: 4, version: 1 },
    ],
  },
];

function createDefaultDb(): MockDatabase {
  return {
    users: structuredClone(INITIAL_USERS),
    nfts: structuredClone(INITIAL_NFTS),
    orders: [],
    userCarts: {},
    activeTokens: {},
    scenario: 'default',
    latencyMs: 250,
  };
}

export function getMockDb(): MockDatabase {
  try {
    const raw = localStorage.getItem(DB_STORAGE_KEY);
    if (!raw) {
      const fresh = createDefaultDb();
      saveMockDb(fresh);
      return fresh;
    }
    return JSON.parse(raw) as MockDatabase;
  } catch {
    return createDefaultDb();
  }
}

export function saveMockDb(db: MockDatabase): void {
  localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(db));
}

export function resetMockDb(): MockDatabase {
  const fresh = createDefaultDb();
  saveMockDb(fresh);
  return fresh;
}
