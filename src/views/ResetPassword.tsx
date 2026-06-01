import { useMemo, useState, type FormEvent } from 'react';
import type { AuthError } from '@supabase/supabase-js';
import { AuthShell } from '../components/bento/AuthShell';
import { Button } from '../components/ui/Button';
import { FeedbackBanner } from '../components/ui/FeedbackBanner';
import { InputField } from '../components/ui/InputField';
import { supabase } from '../lib/supabaseClient';

function getReadableAuthError(error: AuthError) {
  if (error.message.toLowerCase().includes('same password')) {
    return 'Escolha uma senha diferente da anterior.';
  }

  return error.message;
}

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const mismatch = useMemo(() => {
    if (!confirmPassword) {
      return null;
    }

    return password === confirmPassword ? null : 'As senhas precisam ser iguais.';
  }, [confirmPassword, password]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (password.length < 6) {
      setErrorMessage('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Confirme a mesma senha nos dois campos.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        throw error;
      }

      setSuccessMessage('Senha atualizada com sucesso. Vamos te levar de volta para o login.');
      window.history.replaceState({}, '', window.location.pathname);
      window.setTimeout(() => {
        window.location.hash = '#login';
      }, 900);
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'message' in error
          ? getReadableAuthError(error as AuthError)
          : 'Nao foi possivel redefinir a senha agora.';
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      badge="Recuperacao"
      title="Nova senha"
      subtitle="Defina uma senha nova para continuar no bolao interno da Camerite."
      footer={
        <a className="font-semibold text-primary transition hover:text-white" href="#login">
          Voltar para o login
        </a>
      }
    >
      {errorMessage ? <FeedbackBanner message={errorMessage} tone="error" /> : null}
      {successMessage ? <FeedbackBanner message={successMessage} tone="success" /> : null}

      <form className="space-y-5" onSubmit={handleSubmit}>
        <InputField
          autoComplete="new-password"
          id="password"
          label="Nova senha"
          minLength={6}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Minimo de 6 caracteres"
          required
          type="password"
          value={password}
        />
        <InputField
          autoComplete="new-password"
          error={mismatch}
          id="confirm-password"
          label="Confirmar senha"
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Repita a senha"
          required
          type="password"
          value={confirmPassword}
        />
        <Button disabled={loading} fullWidth type="submit">
          {loading ? 'Atualizando...' : 'Salvar nova senha'}
        </Button>
      </form>
    </AuthShell>
  );
}
