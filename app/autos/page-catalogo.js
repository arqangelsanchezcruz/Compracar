import { supabase } from '../../lib/supabaseClient';

// Siempre consulta la base de datos en cada visita; nunca deja esta
// página guardada como una versión fija.
export const dynamic = 'force-dynamic';

async function getListings() {
  const { data, error } = await supabase
    .from('listings')
    .select('id, list_price, trust, vehicles(brand, model, year, mileage_km)')
    .in('status', ['published'])
    .order('published_at', { ascending: false });

  if (error) {
    console.error('Error cargando el catálogo:', error.message);
    return [];
  }
  return data || [];
}

export default async function AutosPage() {
  const cars = await getListings();

  return (
    <main className="wrap" style={{ padding: '36px 0' }}>
      <h1>Autos verificados disponibles</h1>
      {cars.length === 0 ? (
        <p style={{ color: 'var(--ink-2)', marginTop: 16 }}>
          Aún no hay autos publicados en el catálogo.
        </p>
      ) : (
        <div className="grid4">
          {cars.map((c) => (
            <a className="card" key={c.id} href={`/autos/${c.id}`}>
              <div className="photo">🚗</div>
              <div className="card-body">
                <strong>{c.vehicles?.brand} {c.vehicles?.model} {c.vehicles?.year}</strong>
                <div style={{ color: 'var(--ink-2)', fontSize: '.88rem', marginTop: 4 }}>
                  {Number(c.vehicles?.mileage_km || 0).toLocaleString('es-MX')} km
                </div>
                <div className="price">${Number(c.list_price).toLocaleString('es-MX')}</div>
                <span className={`trust ${c.trust}`}>{c.trust === 'green' ? 'Verificado' : c.trust === 'blue' ? 'Documentos listos' : 'En revisión'}</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </main>
  );
}
