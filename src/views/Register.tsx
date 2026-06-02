import { useMemo, useState, type FormEvent } from 'react';
import type { AuthError } from '@supabase/supabase-js';
import { AuthShell } from '../components/bento/AuthShell';
import { Button } from '../components/ui/Button';
import { FeedbackBanner } from '../components/ui/FeedbackBanner';
import { InputField, SelectField } from '../components/ui/InputField';
import { isCorporateEmail, normalizeCorporateEmail, upsertUserProfile, syncAndFetchUserProfile } from '../lib/auth';
import { supabase } from '../lib/supabaseClient';
import { DEPARTMENTS } from '../lib/types';

function getRegisterErrorMessage(error: AuthError | Error) {
  if ('message' in error && error.message.toLowerCase().includes('already registered')) {
    return 'Ja existe uma conta com esse e-mail.';
  }

  return error.message;
}

export default function Register() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [departamento, setDepartamento] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const passwordHint = useMemo(() => {
    if (!password) {
      return 'Use pelo menos 6 caracteres.';
    }

    return password.length >= 6 ? undefined : 'A senha precisa ter 6 caracteres ou mais.';
  }, [password]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const normalizedEmail = normalizeCorporateEmail(email);

    if (!nome.trim()) {
      setErrorMessage('Informe seu nome completo.');
      return;
    }

    if (!isCorporateEmail(normalizedEmail)) {
      setErrorMessage('Somente e-mails @camerite.com podem se cadastrar.');
      return;
    }

    if (!departamento) {
      setErrorMessage('Selecione um departamento.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            nome: nome.trim(),
            departamento,
          },
        },
      });

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error('Cadastro criado sem retorno de usuario do Supabase.');
      }

      await upsertUserProfile({
        id: data.user.id,
        nome,
        departamento,
      });

      await syncAndFetchUserProfile(data.user);

      if (data.session) {
        setSuccessMessage('Cadastro concluido. Seu perfil ja pode ser usado no app.');
        window.location.hash = '#home';
      } else {
        setSuccessMessage('Cadastro concluido. Sua conta corporativa ja pode ser usada no app.');
      }
      setNome('');
      setEmail('');
      setDepartamento('');
      setPassword('');
    } catch (error) {
      const message =
        error instanceof Error
          ? getRegisterErrorMessage(error)
          : 'Nao foi possivel concluir o cadastro agora.';
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      badge="Novo cadastro"
      title="Entrar no jogo"
      subtitle="Crie sua conta corporativa e mantenha seu perfil sincronizado com a tabela cravou_users para participar dos palpites jogo a jogo."
      footer={
        <a className="font-semibold text-primary transition hover:text-white" href="#login">
          Ja tenho conta
        </a>
      }
    >
      {errorMessage ? <FeedbackBanner message={errorMessage} tone="error" /> : null}
      {successMessage ? <FeedbackBanner message={successMessage} tone="success" /> : null}

      <form className="space-y-5" onSubmit={handleSubmit}>
        <InputField
          autoComplete="name"
          id="register-name"
          label="Nome completo"
          onChange={(event) => setNome(event.target.value)}
          placeholder="Seu nome"
          required
          type="text"
          value={nome}
        />
        <InputField
          autoComplete="email"
          id="register-email"
          label="E-mail da Camerite"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="seu.nome@camerite.com"
          required
          type="email"
          value={email}
        />
        <SelectField
          id="register-department"
          label="Departamento"
          onChange={(event) => setDepartamento(event.target.value)}
          options={[
            { label: 'Selecione seu setor', value: '' },
            ...DEPARTMENTS.map((item) => ({ label: item, value: item })),
          ]}
          required
          value={departamento}
        />
        <InputField
          autoComplete="new-password"
          hint={passwordHint}
          id="register-password"
          label="Senha"
          minLength={6}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Crie uma senha segura"
          required
          type="password"
          value={password}
        />
        <Button disabled={loading} fullWidth type="submit">
          {loading ? 'Criando conta...' : 'Finalizar cadastro'}
        </Button>
      </form>
    </AuthShell>
  );
}
