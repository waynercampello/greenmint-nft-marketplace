import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Settings2, RotateCcw, Zap, Wifi, WifiOff, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { getMockDb, saveMockDb, resetMockDb } from '@/mocks/db';
import { emitSocketNftUpdate } from '@/mocks/handlers';
import { MockScenario } from '@/types';
import { queryClient } from '@/main';
import { useAppStore } from '@/stores/appStore';

const SCENARIOS: Array<{ value: MockScenario; label: string }> = [
  { value: 'default', label: 'Padrão (Sucesso)' },
  { value: 'slow_network', label: 'Rede Lenta (2.2s)' },
  { value: 'server_error_500', label: 'Falha HTTP 500' },
  { value: 'session_expired', label: 'Sessão Expirada (401)' },
  { value: 'payment_rejected', label: 'Pagamento Recusado' },
  { value: 'checkout_timeout_idempotent', label: 'Timeout Checkout (Idempotente)' },
];

export function MockControlPanel() {
  const [open, setOpen] = useState(false);
  const [scenario, setScenario] = useState<MockScenario>(() => getMockDb().scenario);
  const { socketConnected } = useAppStore();

  const handleScenarioChange = (next: MockScenario) => {
    const db = getMockDb();
    db.scenario = next;
    saveMockDb(db);
    setScenario(next);
    toast.info('Cenário MSW alterado para: ' + next);
  };

  const handleTriggerPriceChange = () => {
    const db = getMockDb();
    const nft = db.nfts.find((item) => item.id === 'nft-1');
    const edition = nft?.editions.find((ed) => ed.id === 'ed-1-std');
    if (!nft || !edition) return;

    const current = parseFloat(edition.priceEth);
    const nextPrice = (current + 0.05).toFixed(4);
    edition.priceEth = nextPrice;
    edition.version += 1;
    nft.version += 1;
    saveMockDb(db);

    const payload = {
      eventId: uuidv4(),
      nftId: nft.id,
      editionId: edition.id,
      priceEth: nextPrice,
      stock: edition.stock,
      version: edition.version,
    };

    emitSocketNftUpdate(payload);
    window.dispatchEvent(new CustomEvent('msw:nft.updated', { detail: payload }));
  };

  const handleTriggerSoldOut = () => {
    const db = getMockDb();
    const nft = db.nfts.find((item) => item.id === 'nft-1');
    const edition = nft?.editions.find((ed) => ed.id === 'ed-1-std');
    if (!nft || !edition) return;

    edition.stock = 0;
    edition.version += 1;
    nft.version += 1;
    saveMockDb(db);

    const payload = {
      eventId: uuidv4(),
      nftId: nft.id,
      editionId: edition.id,
      priceEth: edition.priceEth,
      stock: 0,
      version: edition.version,
    };

    emitSocketNftUpdate(payload);
    window.dispatchEvent(new CustomEvent('msw:nft.updated', { detail: payload }));
  };

  const handleReset = () => {
    resetMockDb();
    setScenario('default');
    queryClient.invalidateQueries();
    toast.success('Banco simulado restaurado para o estado inicial.');
  };

    if (!open) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setOpen(true)}
          className="shadow-lg border border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800 gap-2"
          aria-label="Abrir painel de simulação MSW e Socket.IO"
        >
          <Settings2 className="h-4 w-4 text-emerald-400" />
          <span>QA / Simulador</span>
          {socketConnected ? (
            <Wifi className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <WifiOff className="h-3.5 w-3.5 text-red-400" />
          )}
        </Button>
      </div>
    );
  }

  return (
    <aside
      aria-label="Painel de controle de cenários simulados"
      className="fixed bottom-4 right-4 z-50 w-80 rounded-xl border border-zinc-800 bg-zinc-950/95 p-4 text-zinc-100 shadow-2xl backdrop-blur"
    >
      <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
        <div className="flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-emerald-400" />
          <h2 className="text-sm font-semibold">Simulador MSW & Socket.IO</h2>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
          aria-label="Fechar painel de simulação"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 space-y-3 text-xs">
        <div>
          <label htmlFor="msw-scenario" className="mb-1 block font-medium text-zinc-400">
            Cenário de Rede / API
          </label>
          <select
            id="msw-scenario"
            value={scenario}
            onChange={(e) => handleScenarioChange(e.target.value as MockScenario)}
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-zinc-100 focus:border-emerald-500 focus:outline-none"
          >
            {SCENARIOS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5 pt-1">
          <p className="font-medium text-zinc-400">Eventos Tempo Real (Socket.IO)</p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleTriggerPriceChange}
              className="border-zinc-700 bg-zinc-900 text-xs text-zinc-200 hover:bg-zinc-800"
            >
              <Zap className="mr-1 h-3.5 w-3.5 text-amber-400" />
              Alterar Preço #1
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleTriggerSoldOut}
              className="border-zinc-700 bg-zinc-900 text-xs text-zinc-200 hover:bg-zinc-800"
            >
              <Zap className="mr-1 h-3.5 w-3.5 text-red-400" />
              Esgotar NFT #1
            </Button>
          </div>
        </div>

        <div className="border-t border-zinc-800 pt-2.5 flex items-center justify-between">
          <span className="text-[11px] text-zinc-400">
            Socket: {socketConnected ? 'Conectado' : 'Desconectado'}
          </span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={handleReset}
            className="h-7 px-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white"
          >
            <RotateCcw className="mr-1 h-3.5 w-3.5" />
            Resetar Dados
          </Button>
        </div>
      </div>
    </aside>
  );
}
