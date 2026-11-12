import { Gem, Shield, Crown, Music, Sparkles, Cpu, Flame, Hexagon } from 'lucide-react';

interface NftArtworkProps {
  nftId: string;
  title: string;
  className?: string;
}

const ART_THEMES: Record<
  string,
  { bg: string; badge: string; Icon: typeof Gem }
> = {
  'nft-1': {
    bg: 'from-emerald-900 via-[#1c1612] to-amber-900/60',
    badge: 'NEON CANOPY #042',
    Icon: Crown,
  },
  'nft-2': {
    bg: 'from-amber-900 via-[#120e0b] to-stone-900',
    badge: 'RELIC PASS VIP',
    Icon: Shield,
  },
  'nft-3': {
    bg: 'from-teal-900 via-[#1c1612] to-emerald-950',
    badge: 'ASTRAL PRISM #118',
    Icon: Gem,
  },
  'nft-4': {
    bg: 'from-orange-900 via-[#120e0b] to-amber-950',
    badge: 'SONIC VINYL #09',
    Icon: Music,
  },
  'nft-5': {
    bg: 'from-yellow-900 via-[#1c1612] to-amber-900/50',
    badge: 'GOLDEN TOTEM',
    Icon: Sparkles,
  },
  'nft-6': {
    bg: 'from-emerald-950 via-[#120e0b] to-teal-900',
    badge: 'MECHA ARMOR',
    Icon: Hexagon,
  },
  'nft-7': {
    bg: 'from-amber-950 via-[#1c1612] to-orange-900/50',
    badge: 'NEBULA DRIFT #77',
    Icon: Flame,
  },
  'nft-8': {
    bg: 'from-emerald-900 via-[#120e0b] to-cyan-950',
    badge: 'QUANTUM CORE #01',
    Icon: Cpu,
  },
};

export function NftArtwork({ nftId, title, className = 'aspect-square w-full' }: NftArtworkProps) {
  const theme = ART_THEMES[nftId] || ART_THEMES['nft-1'];
  const Icon = theme.Icon;

  return (
    <div
      role="img"
      aria-label={title}
      className={
        'relative flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br ' +
        theme.bg +
        ' ' +
        className
      }
    >
      <div className="absolute inset-4 rounded-2xl border border-amber-500/25 pointer-events-none" />
      <div className="flex h-24 w-24 items-center justify-center rounded-full border border-amber-400/40 bg-white/5 shadow-inner">
        <Icon className="h-12 w-12 text-amber-400" />
      </div>
      <span className="mt-4 rounded-full border border-amber-500/30 bg-black/40 px-3 py-1 font-mono text-[11px] font-semibold tracking-wider text-amber-300">
        {theme.badge}
      </span>
    </div>
  );
}
