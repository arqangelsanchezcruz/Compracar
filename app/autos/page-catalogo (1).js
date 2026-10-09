import { supabase } from '../../lib/supabaseClient';

export const dynamic = 'force-dynamic';

function photoUrl(listing) {
  const cover = (listing.listing_photos || []).find((p) => p.is_cover) || (listing.listing_photos || [])[0];
  if (!cover) return null;
  return supabase.storage.from('listing-photos').getPublicUrl(cover.storage_path).data.publicUrl;
}

async function getListings() {
  const { data, error } = await supabase
    .from('listings')
    .select('id, list_price, trust, vehicles(brand, model, year, mileage_km), listing_photos(storage_path, is_cover)')
    .in('status', ['published'])
    .order('published_at', { ascending: false });

  if (error) {
    console.error('Error cargando el catálogo:', error.message);
    return [];
  }
  return data || [];
}

const TRUST_LABEL = { green: 'Verificado', blue: 'Documentos listos', yellow: 'En revisión' };

export default async function AutosPage() {
  const cars = await getListings();

  return (
    <main className="wrap" style={{ padding: '44px 24px' }}>
      <span className="kicker">Catálogo</span>
      <h1>Autos verificados disponibles</h1>
      {cars.length === 0 ? (
        <p style={{ color: 'var(--ink-2)', marginTop: 16 }}>
          Aún no hay autos publicados en el catálogo.
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
                  <div className="meta-row">
                    <span>{Number(c.vehicles?.mileage_km || 0).toLocaleString('es-MX')} km</span>
                  </div>
                  <div className="price">${Number(c.list_price).toLocaleString('es-MX')}</div>
                  <span className={`trust ${c.trust}`}>{TRUST_LABEL[c.trust]}</span>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </main>
  );
}
