import { useState, type FormEvent } from 'react';
import type { AuthError } from '@supabase/supabase-js';
import { AuthShell } from '../components/bento/AuthShell';
import { Button } from '../components/ui/Button';
import { FeedbackBanner } from '../components/ui/FeedbackBanner';
import { InputField } from '../components/ui/InputField';
import { getResetPasswordUrl, isCorporateEmail, normalizeCorporateEmail } from '../lib/auth';
import { supabase } from '../lib/supabaseClient';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const normalizedEmail = normalizeCorporateEmail(email);

    if (!isCorporateEmail(normalizedEmail)) {
      setErrorMessage('Informe um e-mail @camerite.com valido.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: getResetPasswordUrl(),
      });

      if (error) {
        throw error;
      }

      setSuccessMessage('Enviamos um link de redefinicao para seu e-mail corporativo.');
      setEmail('');
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'message' in error
          ? (error as AuthError).message
          : 'Nao foi possivel enviar o e-mail de recuperacao.';
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      badge="Recuperacao"
      title="Esqueceu a senha"
      subtitle="A recuperacao usa o fluxo oficial do Supabase e devolve o colaborador para uma tela dedicada de redefinicao."
      footer={
        <a className="font-semibold text-primary transition hover:text-white" href="#login">
          Voltar ao login
        </a>
      }
    >
      {errorMessage ? <FeedbackBanner message={errorMessage} tone="error" /> : null}
      {successMessage ? <FeedbackBanner message={successMessage} tone="success" /> : null}

      <form className="space-y-5" onSubmit={handleSubmit}>
        <InputField
          autoComplete="email"
          id="forgot-email"
          label="E-mail corporativo"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="seu.nome@camerite.com"
          required
          type="email"
          value={email}
        />
        <Button disabled={loading} fullWidth type="submit">
          {loading ? 'Enviando...' : 'Enviar link de recuperacao'}
        </Button>
      </form>
    </AuthShell>
  );
}
