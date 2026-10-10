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
        <div className="wrap hero-grid">
          <div>
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

          {/* Ilustración decorativa: tarjeta con efecto vidrio/metal + ubicación del hub */}
          <div className="hero-visual-pro">
            <div className="halo" />
            <svg className="map-outline" viewBox="0 0 420 340" width="420" height="340">
              <path d="M60 40 L140 10 L220 55 L260 120 L240 220 L150 260 L70 210 L40 120 Z" fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="1.5" />
            </svg>
            <span className="pin" style={{ top: 78, left: 150 }}><i /> Monterrey</span>
            <span className="pin" style={{ top: 198, left: 190 }}><i /> CDMX</span>
            <div className="premium-card">
              <div className="premium-ring" />
              <div className="chip" />
              <div className="brand">CompraCar</div>
            </div>
          </div>
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
                    <span className="badge-360">360°</span>
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
            <p>Compré mi auto sin preocuparme de que estuviera en regla: ya había pasado por la revisión de CompraCar antes de que yo lo viera. El proceso en el hub fue rápido y claro.</p>
            <div className="by">Cliente de CompraCar<span>Contenido de ejemplo — se reemplaza por un testimonio real</span></div>
          </div>
          <div className="photo-frame">
            <div className="inner">CompraCar · Hub Monterrey</div>
          </div>
        </div>
      </section>

      <section id="servicios" className="bg-panel anchor-section">
        <div className="wrap">
          <div className="section-head">
            <span className="kicker">Servicios</span>
            <h2>Todo lo que incluye tu compra o venta</h2>
          </div>
          <div className="services-grid">
            <div className="service-item"><h3>Inspección física</h3><p>Revisión mecánica y legal en nuestro hub antes de publicar cualquier auto.</p></div>
            <div className="service-item"><h3>Pago resguardado</h3><p>El dinero se libera hasta que la compraventa se completa correctamente.</p></div>
            <div className="service-item"><h3>Identidad protegida</h3><p>Comprador y vendedor se comunican sin compartir sus datos de contacto.</p></div>
          </div>
        </div>
      </section>

      <section id="contacto" className="wrap anchor-section">
        <div className="section-head">
          <span className="kicker">Contacto</span>
          <h2>¿Tienes dudas?</h2>
          <p>Escríbenos y te ayudamos a comprar o vender tu auto. Hub Monterrey, Nuevo León.</p>
        </div>
      </section>
    </main>
  );
}
