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
  const [resetStatus, setResetStatus] = useState('idle'); // idle | sending | sent | error

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) { setError('Correo o contraseña incorrectos.'); return; }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();
    router.push(profile?.role === 'admin' ? '/admin' : '/');
  }

  async function handleForgotPassword() {
    if (!email) { setError('Escribe tu correo arriba y vuelve a darle clic a "Olvidé mi contraseña".'); return; }
    setResetStatus('sending');
    setError('');
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined,
    });
    setResetStatus(resetError ? 'error' : 'sent');
  }

  return (
    <main className="wrap" style={{ padding: '60px 24px', maxWidth: 420 }}>
      <h1>Entrar</h1>
      <p style={{ color: 'var(--ink-2)', margin: '10px 0 24px' }}>Accede a tu cuenta de CARTRU.</p>
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

      <div style={{ marginTop: 18, display: 'grid', gap: 10 }}>
        {resetStatus === 'sent' ? (
          <p style={{ color: 'var(--green-ink)', background: 'var(--green-tint)', padding: 10, borderRadius: 8 }}>
            Te enviamos un enlace a {email} para crear una nueva contraseña. Revisa también spam.
          </p>
        ) : (
          <button
            type="button"
            onClick={handleForgotPassword}
            disabled={resetStatus === 'sending'}
            style={{ background: 'none', border: 0, color: 'var(--navy)', fontWeight: 600, textAlign: 'left', padding: 0, cursor: 'pointer', fontSize: '.9rem' }}
          >
            {resetStatus === 'sending' ? 'Enviando…' : '¿Olvidaste tu contraseña?'}
          </button>
        )}
        <p style={{ color: 'var(--ink-2)' }}>¿No tienes cuenta? <a href="/register" style={{ color: 'var(--navy)', fontWeight: 600 }}>Regístrate</a>.</p>
      </div>
    </main>
  );
}
