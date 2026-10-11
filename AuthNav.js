'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function AuthNav() {
  const [user, setUser] = useState(undefined); // undefined = cargando, null = sin sesión
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => checkUser(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      checkUser(session?.user || null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function checkUser(u) {
    setUser(u);
    if (u) {
      const { data } = await supabase.from('profiles').select('role').eq('id', u.id).single();
      setIsAdmin(data?.role === 'admin');
    } else {
      setIsAdmin(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = '/';
  }

  if (user === undefined) return null;

  if (!user) {
    return (
      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <a href="/login">Entrar</a>
        <a className="btn primary" style={{ padding: '8px 16px', fontSize: '.88rem' }} href="/register">Registrarme</a>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
      {isAdmin && <a href="/admin">Admin</a>}
      <button onClick={signOut} style={{ background: 'none', border: 0, font: 'inherit', fontWeight: 600, color: 'var(--ink-2)', cursor: 'pointer' }}>Salir</button>
    </div>
  );
}
