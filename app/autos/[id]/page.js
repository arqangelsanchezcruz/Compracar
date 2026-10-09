import { supabase } from '../../../lib/supabaseClient';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

async function getListing(id) {
  const { data, error } = await supabase
    .from('listings')
    .select('id, list_price, trust, description, vehicles(brand, model, year, mileage_km, transmission, fuel, color), listing_photos(storage_path, is_cover, position)')
    .eq('id', id)
    .single();

  if (error) return null;
  return data;
}

const TRUST_LABEL = { green: 'Verificado completo', blue: 'Documentos verificados', yellow: 'Verificación parcial' };

export default async function AutoDetailPage({ params }) {
  const c = await getListing(params.id);
  if (!c) return notFound();
  const v = c.vehicles || {};

  const photos = (c.listing_photos || []).slice().sort((a, b) => (a.position || 0) - (b.position || 0));
  const urls = photos.map((p) => supabase.storage.from('listing-photos').getPublicUrl(p.storage_path).data.publicUrl);
  const mainPhoto = urls[0];

  return (
    <main className="wrap" style={{ padding: '36px 24px' }}>
      <a href="/autos" style={{ color: 'var(--ink-2)', fontWeight: 600 }}>&larr; Volver a los autos</a>
      <h1 style={{ marginTop: 14 }}>{v.brand} {v.model} {v.year}</h1>
      <p style={{ color: 'var(--ink-2)', marginTop: 6 }}>Disponible en el Hub Monterrey</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 40, marginTop: 24 }}>
        <div>
          <div className="photo" style={{ borderRadius: 16, fontSize: '3rem' }}>
            {mainPhoto ? <img src={mainPhoto} alt={`${v.brand} ${v.model}`} /> : '🚗'}
          </div>
          {urls.length > 1 && (
            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              {urls.slice(1).map((u, i) => (
                <div key={i} style={{ width: 84, height: 64, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--line)' }}>
                  <img src={u} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          )}
          <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px', marginTop: 24 }}>
            <Spec label="Kilometraje" value={`${Number(v.mileage_km || 0).toLocaleString('es-MX')} km`} />
            <Spec label="Transmisión" value={v.transmission || '—'} />
            <Spec label="Combustible" value={v.fuel || '—'} />
            <Spec label="Color" value={v.color || '—'} />
          </dl>
          {c.description && <p style={{ marginTop: 24 }}>{c.description}</p>}
        </div>

        <aside style={{ border: '1px solid var(--line)', borderRadius: 16, padding: 24 }}>
          <div className="price" style={{ fontSize: '2rem' }}>${Number(c.list_price).toLocaleString('es-MX')}</div>
          <span className={`trust ${c.trust}`}>{TRUST_LABEL[c.trust]}</span>
          <div style={{ display: 'grid', gap: 10, marginTop: 20 }}>
            <button className="btn primary">Agendar prueba de manejo</button>
            <button className="btn outline" style={{ color: 'var(--navy)', borderColor: 'var(--line-strong)', background: 'transparent' }}>Hacer una oferta</button>
          </div>
          <p style={{ color: 'var(--ink-2)', fontSize: '.85rem', marginTop: 14 }}>
            Estos botones todavía son de muestra: falta conectar el formulario de visitas y ofertas a la base de datos.
          </p>
        </aside>
      </div>
    </main>
  );
}

function Spec({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
      <dt style={{ color: 'var(--ink-2)' }}>{label}</dt>
      <dd style={{ margin: 0, fontWeight: 700 }}>{value}</dd>
    </div>
  );
}
