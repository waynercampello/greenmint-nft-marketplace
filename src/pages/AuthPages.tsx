import { useState } from 'react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppStore } from '@/stores/appStore';

export function LoginPage() {
  const { login } = useAppStore();
  const navigate = useNavigate();
  const search = useSearch({ from: '/login' });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Login realizado com sucesso!');
      navigate({ to: (search.redirect as '/') || '/' });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Falha ao autenticar.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md py-6">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-zinc-950">
            <Sparkles className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold text-white">Entrar na Conta</h1>
          <p className="text-xs text-zinc-400">
            Acesse sua carteira, favoritos e histórico de pedidos.
          </p>
        </div>

        {/* Atalhos para os 2 usuários fictícios exigidos na avaliação */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 space-y-2">
          <p className="text-[11px] font-medium text-zinc-400">
            Contas de demonstração (clique para preencher):
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setEmail('alex@collector.io');
                setPassword('Senha@123');
              }}
              className="h-7 text-xs border-zinc-800 bg-zinc-900 text-zinc-200"
            >
              Alex (Usuário 1)
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setEmail('marina@studio.io');
                setPassword('Senha@123');
              }}
              className="h-7 text-xs border-zinc-800 bg-zinc-900 text-zinc-200"
            >
              Marina (Usuário 2)
            </Button>
          </div>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-lg border border-red-900/60 bg-red-950/40 p-3 text-xs text-red-300"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="login-email">E-mail</Label>
            <Input
              id="login-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@collector.io"
              className="border-zinc-800 bg-zinc-950"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="login-password">Senha</Label>
            <Input
              id="login-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="border-zinc-800 bg-zinc-950"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 text-zinc-950 font-semibold hover:bg-emerald-400"
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Entrar
          </Button>
        </form>

        <p className="text-center text-xs text-zinc-400">
          Ainda não tem conta?{' '}
          <Link to="/register" className="text-emerald-400 hover:underline font-medium">
            Criar conta agora
          </Link>
        </p>
      </div>
    </div>
  );
}

export function RegisterPage() {
  const { register } = useAppStore();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    try {
      await register(name, email, password);
      toast.success('Conta criada com sucesso!');
      navigate({ to: '/' });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Erro ao criar conta.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md py-6">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-white">Criar Conta</h1>
          <p className="text-xs text-zinc-400">
            Cadastre-se para colecionar NFTs e gerenciar suas carteiras.
          </p>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-lg border border-red-900/60 bg-red-950/40 p-3 text-xs text-red-300"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="reg-name">Nome completo</Label>
            <Input
              id="reg-name"
              type="text"
              required
              minLength={3}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              className="border-zinc-800 bg-zinc-950"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reg-email">E-mail</Label>
            <Input
              id="reg-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@exemplo.com"
              className="border-zinc-800 bg-zinc-950"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reg-password">Senha (mínimo 6 caracteres)</Label>
            <Input
              id="reg-password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="border-zinc-800 bg-zinc-950"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 text-zinc-950 font-semibold hover:bg-emerald-400"
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Cadastrar
          </Button>
        </form>

        <p className="text-center text-xs text-zinc-400">
          Já possui conta?{' '}
          <Link to="/login" search={{ redirect: '/' }} className="text-emerald-400 hover:underline font-medium">
            Fazer login
          </Link>
        </p>
      </div>
    </div>
  );
}
