'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

function money(n) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n || 0);
}

const STATUS_LABEL = {
  draft: 'Borrador', docs_pending: 'Faltan documentos', inspection_pending: 'Inspección pendiente',
  ready_to_publish: 'Lista para publicar', published: 'Publicado', reserved: 'Reservado',
  sold: 'Vendido', withdrawn: 'Retirado',
};

export default function AdminPage() {
  const router = useRouter();
  const [phase, setPhase] = useState('checking'); // checking | denied | ready
  const [listings, setListings] = useState([]);
  const [saleInputs, setSaleInputs] = useState({}); // { [listingId]: '125000' }

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || profile.role !== 'admin') { setPhase('denied'); return; }

    await loadListings();
    setPhase('ready');
  }

  async function loadListings() {
    const { data } = await supabase
      .from('listings')
      .select('id, status, list_price, sale_price, commission_pct, commission_amount, commission_paid, sold_at, created_at, vehicles(brand, model, year)')
      .order('created_at', { ascending: false });
    setListings(data || []);
  }

  async function markSold(listing) {
    const priceStr = saleInputs[listing.id];
    const salePrice = Number((priceStr || '').replace(/\D/g, ''));
    if (!salePrice) { alert('Escribe el precio final de venta.'); return; }
    const commission = Math.round(salePrice * Number(listing.commission_pct) / 100);
    await supabase.from('listings').update({
      status: 'sold',
      sold_at: new Date().toISOString(),
      sale_price: salePrice,
      commission_amount: commission,
    }).eq('id', listing.id);
    loadListings();
  }

  async function toggleCommissionPaid(listing) {
    const next = !listing.commission_paid;
    await supabase.from('listings').update({
      commission_paid: next,
      commission_paid_at: next ? new Date().toISOString() : null,
    }).eq('id', listing.id);
    loadListings();
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  if (phase === 'checking') return <main className="wrap" style={{ padding: 60 }}><p>Verificando acceso…</p></main>;
  if (phase === 'denied') return <main className="wrap" style={{ padding: 60 }}><p>Esta cuenta no tiene permisos de administrador.</p></main>;

  const sold = listings.filter((l) => l.status === 'sold');
  const months = {};
  sold.forEach((l) => {
    const d = new Date(l.sold_at);
    const key = d.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
    if (!months[key]) months[key] = { count: 0, sales: 0, commission: 0, paid: 0 };
    months[key].count += 1;
    months[key].sales += Number(l.sale_price || 0);
    months[key].commission += Number(l.commission_amount || 0);
    if (l.commission_paid) months[key].paid += Number(l.commission_amount || 0);
  });

  return (
    <main className="wrap" style={{ padding: '36px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Panel de administrador</h1>
        <button className="btn outline" style={{ color: 'var(--navy)', borderColor: 'var(--line-strong)' }} onClick={signOut}>Cerrar sesión</button>
      </div>

      <h2 style={{ marginTop: 36, fontSize: '1.3rem' }}>Resumen por mes</h2>
      {Object.keys(months).length === 0 ? (
        <p style={{ color: 'var(--ink-2)' }}>Todavía no hay autos marcados como vendidos.</p>
      ) : (
        <div style={{ overflowX: 'auto', marginTop: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--line-strong)' }}>
                <th style={{ padding: 8 }}>Mes</th><th style={{ padding: 8 }}>Autos vendidos</th>
                <th style={{ padding: 8 }}>Ventas totales</th><th style={{ padding: 8 }}>Comisión generada</th>
                <th style={{ padding: 8 }}>Comisión cobrada</th><th style={{ padding: 8 }}>Comisión pendiente</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(months).map(([key, m]) => (
                <tr key={key} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: 8, textTransform: 'capitalize' }}>{key}</td>
                  <td style={{ padding: 8 }}>{m.count}</td>
                  <td style={{ padding: 8 }}>{money(m.sales)}</td>
                  <td style={{ padding: 8 }}>{money(m.commission)}</td>
                  <td style={{ padding: 8, color: 'var(--green-ink)' }}>{money(m.paid)}</td>
                  <td style={{ padding: 8, color: 'var(--yellow-ink)' }}>{money(m.commission - m.paid)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 style={{ marginTop: 40, fontSize: '1.3rem' }}>Todos los autos</h2>
      <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
        {listings.map((l) => (
          <div key={l.id} style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <strong>{l.vehicles?.brand} {l.vehicles?.model} {l.vehicles?.year}</strong>
              <div style={{ color: 'var(--ink-2)', fontSize: '.9rem' }}>{STATUS_LABEL[l.status]} · Publicado en {money(l.list_price)}</div>
              {l.status === 'sold' && (
                <div style={{ fontSize: '.9rem', marginTop: 4 }}>
                  Vendido en {money(l.sale_price)} · Comisión {money(l.commission_amount)} · {l.commission_paid ? <span style={{ color: 'var(--green-ink)' }}>Pagada</span> : <span style={{ color: 'var(--yellow-ink)' }}>Pendiente</span>}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {l.status !== 'sold' && (
                <>
                  <input
                    placeholder="Precio final"
                    style={{ width: 140, padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--line-strong)' }}
                    value={saleInputs[l.id] || ''}
                    onChange={(e) => setSaleInputs((s) => ({ ...s, [l.id]: e.target.value.replace(/\D/g, '') }))}
                  />
                  <button className="btn primary" onClick={() => markSold(l)}>Marcar vendido</button>
                </>
              )}
              {l.status === 'sold' && (
                <button className="btn outline" style={{ color: 'var(--navy)', borderColor: 'var(--line-strong)' }} onClick={() => toggleCommissionPaid(l)}>
                  {l.commission_paid ? 'Marcar como no pagada' : 'Marcar comisión como pagada'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
