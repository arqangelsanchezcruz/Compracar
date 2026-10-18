'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('idle'); // idle | saving | done | error
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('saving');
    setError('');
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) { setStatus('error'); setError(updateError.message); return; }
    setStatus('done');
    setTimeout(() => router.push('/login'), 2500);
  }

  if (status === 'done') {
    return (
      <main className="wrap" style={{ padding: '60px 24px', maxWidth: 420 }}>
        <h1>Contraseña actualizada</h1>
        <p style={{ color: 'var(--ink-2)', marginTop: 12 }}>Ya puedes entrar con tu nueva contraseña. Te llevamos a la página de inicio de sesión…</p>
      </main>
    );
  }

  return (
    <main className="wrap" style={{ padding: '60px 24px', maxWidth: 420 }}>
      <h1>Crea tu nueva contraseña</h1>
      <p style={{ color: 'var(--ink-2)', margin: '10px 0 24px' }}>Llegaste aquí desde el enlace que te enviamos por correo.</p>
      <form onSubmit={handleSubmit}>
        <label className="field">Nueva contraseña
          <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && (
          <p style={{ color: 'var(--yellow-ink)', background: 'var(--yellow-tint)', padding: 10, borderRadius: 8, marginBottom: 14 }}>{error}</p>
        )}
        <button className="btn primary" type="submit" disabled={status === 'saving'}>{status === 'saving' ? 'Guardando…' : 'Guardar nueva contraseña'}</button>
      </form>
    </main>
  );
}
