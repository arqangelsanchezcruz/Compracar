'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('idle'); // idle | saving | needsConfirm

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('saving');
    setError('');

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) { setStatus('idle'); setError(signUpError.message); return; }

    // Si Supabase pide confirmar el correo, todavía no hay sesión activa.
    if (!data.session) {
      setStatus('needsConfirm');
      return;
    }

    await supabase.from('profiles').insert({ id: data.user.id, full_name: name, role: 'buyer' });
    router.push('/');
  }

  if (status === 'needsConfirm') {
    return (
      <main className="wrap" style={{ padding: '60px 24px', maxWidth: 420 }}>
        <h1>Revisa tu correo</h1>
        <p style={{ color: 'var(--ink-2)', marginTop: 12 }}>
          Te enviamos un enlace para confirmar tu cuenta. Ábrelo y después regresa a <a href="/login" style={{ color: 'var(--blue)' }}>iniciar sesión</a>.
        </p>
      </main>
    );
  }

  return (
    <main className="wrap" style={{ padding: '60px 24px', maxWidth: 420 }}>
      <h1>Crear cuenta</h1>
      <p style={{ color: 'var(--ink-2)', margin: '10px 0 24px' }}>Para comprar o vender un auto en CompraCar necesitas una cuenta.</p>
      <form onSubmit={handleSubmit}>
        <label className="field">Nombre
          <input required value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="field">Correo
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">Contraseña
          <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && (
          <p style={{ color: 'var(--yellow-ink)', background: 'var(--yellow-tint)', padding: 10, borderRadius: 8, marginBottom: 14 }}>{error}</p>
        )}
        <button className="btn primary" type="submit" disabled={status === 'saving'}>{status === 'saving' ? 'Creando…' : 'Crear cuenta'}</button>
      </form>
      <p style={{ marginTop: 18, color: 'var(--ink-2)' }}>¿Ya tienes cuenta? <a href="/login" style={{ color: 'var(--blue)' }}>Entra aquí</a>.</p>
    </main>
  );
}
