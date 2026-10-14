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
    .limit(3);

  if (error) {
    console.error('Error cargando autos destacados:', error.message);
    return [];
  }
  return data || [];
}

export default async function HomePage() {
  const cars = await getFeatured();

  return (
    <main>
      <section className="hero">
        <div className="wrap hero-in">
          <h1>Encuentra. Compra. Disfruta.</h1>
          <p className="lead">El ecosistema automotriz que te da más: autos verificados, revisión legal y mecánica en hub físico, antes de que tú lo veas.</p>
          <form action="/autos" method="GET">
            <div className="search-bar">
              <input name="q" type="search" placeholder="Buscar marca, modelo o palabras clave…" />
              <button type="submit" aria-label="Buscar">🔍</button>
            </div>
          </form>
        </div>
        <div className="wrap">
          <div className="feature-row">
            <a href="/autos"><span className="ic">✅</span>Autos verificados</a>
            <a href="/#financiamiento"><span className="ic">💳</span>Financiamiento</a>
            <a href="/#servicios"><span className="ic">🛡️</span>Garantías</a>
            <a href="/#comunidad"><span className="ic">👥</span>Comunidad</a>
          </div>
        </div>
      </section>

      <section className="wrap monogram">
        <div className="chalkbg">
          <h2>CAR<span className="badge">TRU</span></h2>
          <p>Confianza sobre ruedas — el marketplace de autos seminuevos más seguro de México</p>
        </div>
      </section>

      <section className="wrap">
        <div className="section-head">
          <span className="kicker">Catálogo</span>
          <h2>Vehículos certificados</h2>
          <p>Cada uno pasó por inspección física en nuestro hub antes de llegar aquí.</p>
        </div>
        {cars.length === 0 ? (
          <p style={{ color: 'var(--ink-2)' }}>
            Todavía no hay autos publicados. En cuanto verifiques un auto en Supabase, aparecerá aquí.
          </p>
        ) : (
          <div className="dark-grid">
            {cars.map((c) => {
              const img = photoUrl(c);
              return (
                <a className="dark-card" key={c.id} href={`/autos/${c.id}`}>
                  <div className="photo">
                    {img ? <img src={img} alt={`${c.vehicles?.brand} ${c.vehicles?.model}`} /> : '🚗'}
                    <span className="badge-cert">CERTIFICADO</span>
                  </div>
                  <div className="info">
                    <h4>{c.vehicles?.brand} {c.vehicles?.model} {c.vehicles?.year}</h4>
                    <div className="price">${Number(c.list_price).toLocaleString('es-MX')}</div>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </section>

      <section className="wrap">
        <div className="testimonial-wrap">
          <div>
            <span className="quote-mark">“</span>
            <p>Compré mi auto sin preocuparme de que estuviera en regla: ya había pasado por la revisión de CARTRU antes de que yo lo viera. El proceso en el hub fue rápido y claro.</p>
            <div className="by">Cliente de CARTRU<span>Contenido de ejemplo — se reemplaza por un testimonio real</span></div>
          </div>
          <div className="photo-frame">
            <div className="inner">CARTRU · Hub Monterrey</div>
          </div>
        </div>
      </section>

      <section id="financiamiento" className="bg-panel anchor-section">
        <div className="wrap">
          <div className="section-head">
            <span className="kicker">Financiamiento</span>
            <h2>Financia tu próximo auto</h2>
            <p>Esta sección está en construcción — aquí vivirá la simulación de crédito.</p>
          </div>
        </div>
      </section>

      <section id="servicios" className="anchor-section">
        <div className="wrap">
          <div className="section-head">
            <span className="kicker">Servicios</span>
            <h2>Todo lo que incluye tu compra o venta</h2>
          </div>
          <div className="services-grid">
            <div className="service-item"><h3>Inspección física</h3><p>Revisión mecánica y legal en nuestro hub antes de publicar cualquier auto.</p></div>
            <div className="service-item"><h3>Identidad protegida</h3><p>Comprador y vendedor se comunican sin compartir sus datos de contacto.</p></div>
            <div className="service-item"><h3>Soporte con IA</h3><p>Resuelve tus dudas al instante con el asistente de CARTRU.</p></div>
          </div>
        </div>
      </section>

      <section id="comunidad" className="bg-panel anchor-section">
        <div className="wrap">
          <div className="section-head">
            <span className="kicker">Comunidad</span>
            <h2>Entusiastas de los autos en México</h2>
            <p>Esta sección está en construcción — próximamente, contenido y eventos para la comunidad CARTRU.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
