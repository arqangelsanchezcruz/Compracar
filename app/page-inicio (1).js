import { supabase } from '../lib/supabaseClient';

export const dynamic = 'force-dynamic';

function photoUrl(listing) {
  const cover = (listing.listing_photos || []).find((p) => p.is_cover) || (listing.listing_photos || [])[0];
  if (!cover) return null;
  return supabase.storage.from('listing-photos').getPublicUrl(cover.storage_path).data.publicUrl;
}

async function getFeatured() {
  const { data, error } = await supabase
    .from('listings')
    .select('id, list_price, trust, vehicles(brand, model, year, mileage_km), listing_photos(storage_path, is_cover)')
    .in('status', ['published'])
    .order('published_at', { ascending: false })
    .limit(4);

  if (error) {
    console.error('Error cargando autos destacados:', error.message);
    return [];
  }
  return data || [];
}

const TRUST_LABEL = { green: 'Verificado', blue: 'Documentos listos', yellow: 'En revisión' };

export default async function HomePage() {
  const cars = await getFeatured();

  return (
    <main>
      <section className="hero">
        <div className="wrap hero-in">
          <span className="eyebrow">Marketplace de autos seminuevos</span>
          <h1>Compra y vende tu auto con 0% riesgo</h1>
          <p className="lead">Cada auto pasa por revisión de documentos, inspección mecánica y revisión legal en nuestro hub antes de publicarse. Tú pones el precio, nosotros resguardamos el pago.</p>
          <div className="hero-actions">
            <a className="btn primary" href="/autos">Explora el catálogo</a>
            <a className="btn outline" href="/vender">Vende tu auto gratis</a>
          </div>
          <div className="hero-stats">
            <div><strong>100%</strong><span>Autos verificados</span></div>
            <div><strong>Hub MTY</strong><span>Inspección física</span></div>
            <div><strong>3.5%</strong><span>Comisión, sin letras chiquitas</span></div>
          </div>
        </div>
      </section>

      <section className="wrap">
        <div className="section-head">
          <span className="kicker">Catálogo</span>
          <h2>Las mejores ofertas de la semana</h2>
        </div>
        {cars.length === 0 ? (
          <p style={{ color: 'var(--ink-2)' }}>
            Todavía no hay autos publicados. En cuanto verifiques un auto en Supabase, aparecerá aquí.
          </p>
        ) : (
          <div className="grid4">
            {cars.map((c) => {
              const img = photoUrl(c);
              return (
                <a className="card" key={c.id} href={`/autos/${c.id}`}>
                  <div className="photo">{img ? <img src={img} alt={`${c.vehicles?.brand} ${c.vehicles?.model}`} /> : '🚗'}</div>
                  <div className="card-body">
                    <h3>{c.vehicles?.brand} {c.vehicles?.model} {c.vehicles?.year}</h3>
                    <div className="meta-row"><span>{Number(c.vehicles?.mileage_km || 0).toLocaleString('es-MX')} km</span></div>
                    <div className="price">${Number(c.list_price).toLocaleString('es-MX')}</div>
                    <span className={`trust ${c.trust}`}>{TRUST_LABEL[c.trust]}</span>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
