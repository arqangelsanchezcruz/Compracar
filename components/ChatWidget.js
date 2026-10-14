'use client';
import { useState, useRef, useEffect } from 'react';

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '¡Hola! Soy el asistente de CARTRU. ¿En qué te ayudo?' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, open]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const next = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: 'assistant', content: data.reply || data.error || 'No pude responder, intenta otra vez.' }]);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: 'Hubo un problema de conexión, intenta otra vez.' }]);
    }
    setLoading(false);
  }

  return (
    <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 50 }}>
      {open && (
        <div style={{ width: 320, maxWidth: 'calc(100vw - 40px)', height: 420, background: '#fff', border: '1px solid var(--line)', borderRadius: 20, boxShadow: '0 20px 50px rgba(0,0,0,.18)', display: 'flex', flexDirection: 'column', marginBottom: 12, overflow: 'hidden' }}>
          <div style={{ background: 'var(--graphite)', color: '#fff', padding: '14px 16px', fontWeight: 600 }}>Soporte CARTRU</div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                background: m.role === 'user' ? 'var(--yellow)' : 'var(--chalk)',
                color: 'var(--ink)', padding: '8px 12px', borderRadius: 14, maxWidth: '85%', fontSize: '.88rem',
              }}>
                {m.content}
              </div>
            ))}
            {loading && <div style={{ color: 'var(--ink-2)', fontSize: '.85rem' }}>Escribiendo…</div>}
            <div ref={bottomRef} />
          </div>
          <div style={{ display: 'flex', borderTop: '1px solid var(--line)', padding: 8, gap: 8 }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Escribe tu pregunta…"
              style={{ flex: 1, border: '1px solid var(--line-strong)', borderRadius: 9999, padding: '8px 14px', font: 'inherit', fontSize: '.88rem' }}
            />
            <button onClick={send} className="btn primary" style={{ padding: '8px 16px', fontSize: '.85rem' }}>Enviar</button>
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--graphite)', color: '#fff', border: 0, fontSize: '1.3rem', cursor: 'pointer', boxShadow: '0 10px 24px rgba(0,0,0,.25)' }}
        aria-label="Abrir chat de soporte"
      >
        {open ? '✕' : '💬'}
      </button>
    </div>
  );
}
