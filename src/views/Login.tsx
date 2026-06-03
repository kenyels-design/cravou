import { useEffect, useState, type FormEvent } from 'react';
import type { AuthError } from '@supabase/supabase-js';
import { AuthShell } from '../components/bento/AuthShell';
import { Button } from '../components/ui/Button';
import { FeedbackBanner } from '../components/ui/FeedbackBanner';
import { InputField } from '../components/ui/InputField';
import { consumeAuthNotice, isCorporateEmail, normalizeCorporateEmail, syncAndFetchUserProfile } from '../lib/auth';
import { supabase } from '../lib/supabaseClient';

function getLoginErrorMessage(error: AuthError) {
  if (error.message === 'Invalid login credentials') {
    return 'E-mail ou senha incorretos.';
  }

  return error.message;
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isExiting, setIsExiting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const authNotice = consumeAuthNotice();

    if (authNotice) {
      setErrorMessage(authNotice);
    }
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const normalizedEmail = normalizeCorporateEmail(email);

    if (!isCorporateEmail(normalizedEmail)) {
      setErrorMessage('Use seu e-mail corporativo @camerite.com para entrar.');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        await syncAndFetchUserProfile(data.user);
      }

      setSuccessMessage('Login realizado com sucesso. Redirecionando...');
      setIsExiting(true);
      window.setTimeout(() => {
        window.location.hash = '#home';
      }, 300);
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'message' in error
          ? getLoginErrorMessage(error as AuthError)
          : 'Nao foi possivel entrar agora.';
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      className={isExiting ? 'opacity-0' : 'opacity-100'}
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <a className="font-semibold text-primary transition hover:text-white" href="#cadastro">
            Criar conta
          </a>
          <a className="font-semibold text-zinc-300 transition hover:text-secondary" href="#esqueci">
            Esqueci minha senha
          </a>
        </div>
      }
    >
      {errorMessage ? <FeedbackBanner message={errorMessage} tone="error" /> : null}
      {successMessage ? <FeedbackBanner message={successMessage} tone="success" /> : null}

      <form className="space-y-5" onSubmit={handleSubmit}>
        <InputField
          autoComplete="email"
          id="login-email"
          label="E-mail corporativo"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="seu.nome@camerite.com"
          required
          type="email"
          value={email}
        />
        <InputField
          autoComplete="current-password"
          id="login-password"
          label="Senha"
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Sua senha"
          required
          type="password"
          value={password}
        />
        <Button
          className="cursor-pointer transition-all duration-150 hover:bg-[#CCFF00]/90 active:scale-95"
          disabled={loading}
          fullWidth
          type="submit"
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </Button>
      </form>
    </AuthShell>
  );
}
