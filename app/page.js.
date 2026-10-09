import { supabase } from '../lib/supabaseClient';

// Siempre consulta la base de datos en cada visita; nunca deja esta
// página guardada como una versión fija.
export const dynamic = 'force-dynamic';

async function getFeatured() {
  // Trae hasta 4 publicaciones visibles al público (verdes o azules),
  // con los datos del vehículo relacionado.
  const { data, error } = await supabase
    .from('listings')
    .select('id, list_price, trust, vehicles(brand, model, year, mileage_km)')
    .in('status', ['published'])
    .order('published_at', { ascending: false })
    .limit(4);

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
        <div className="wrap">
          <h1>Compra y vende tu auto seminuevo con 0% riesgo</h1>
          <p>Cada auto pasa por revisión de documentos, inspección mecánica y revisión legal antes de publicarse. Tú pones el precio, nosotros resguardamos el pago.</p>
          <div style={{ display: 'flex', gap: 12, marginTop: 22 }}>
            <a className="btn primary" href="/autos">Busca un auto</a>
            <a className="btn outline" href="/vender" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.5)' }}>Vende tu auto gratis</a>
          </div>
        </div>
      </section>

      <section className="wrap" style={{ padding: '48px 0' }}>
        <h2>Las mejores ofertas</h2>
        {cars.length === 0 ? (
          <p style={{ color: 'var(--ink-2)', marginTop: 16 }}>
            Todavía no hay autos publicados. En cuanto corras el esquema SQL y agregues un auto de prueba en Supabase, aparecerá aquí.
          </p>
        ) : (
          <div className="grid4">
            {cars.map((c) => (
              <a className="card" key={c.id} href={`/autos/${c.id}`}>
                <div className="photo">🚗</div>
                <div className="card-body">
                  <strong>{c.vehicles?.brand} {c.vehicles?.model} {c.vehicles?.year}</strong>
                  <div className="price">${Number(c.list_price).toLocaleString('es-MX')}</div>
                  <span className={`trust ${c.trust}`}>{c.trust === 'green' ? 'Verificado' : c.trust === 'blue' ? 'Documentos listos' : 'En revisión'}</span>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
