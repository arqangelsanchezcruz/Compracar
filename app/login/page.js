'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) { setError('Correo o contraseña incorrectos.'); return; }
    router.push('/admin');
  }

  return (
    <main className="wrap" style={{ padding: '60px 24px', maxWidth: 420 }}>
      <h1>Entrar</h1>
      <p style={{ color: 'var(--ink-2)', margin: '10px 0 24px' }}>Acceso para el administrador de CompraCar.</p>
      <form onSubmit={handleSubmit}>
        <label className="field">Correo
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">Contraseña
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && (
          <p style={{ color: 'var(--yellow-ink)', background: 'var(--yellow-tint)', padding: 10, borderRadius: 8, marginBottom: 14 }}>{error}</p>
        )}
        <button className="btn primary" type="submit" disabled={loading}>{loading ? 'Entrando…' : 'Entrar'}</button>
      </form>
    </main>
  );
}
