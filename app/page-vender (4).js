'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

const HUB_MONTERREY_ID_PLACEHOLDER = '4cdd5faf-5548-454f-8fd7-da1bc2ddd727';
const COMMISSION_PCT = 3.5;

// Marcas disponibles en México, en orden alfabético.
const BRANDS = [
  'Acura', 'Alfa Romeo', 'Aston Martin', 'Audi', 'Bentley', 'BMW', 'Buick',
  'Cadillac', 'Changan', 'Chevrolet', 'Chirey', 'Chrysler', 'Dodge', 'Ferrari',
  'Fiat', 'Ford', 'Genesis', 'GMC', 'GWM', 'Honda', 'Hyundai', 'Infiniti',
  'Isuzu', 'JAC', 'Jaguar', 'Jeep', 'Kia', 'Lamborghini', 'Land Rover',
  'Lexus', 'Lincoln', 'Maserati', 'Mazda', 'Mercedes-Benz', 'MG', 'Mini',
  'Mitsubishi', 'Nissan', 'Peugeot', 'Porsche', 'RAM', 'Renault',
  'Rolls-Royce', 'SEAT', 'Subaru', 'Suzuki', 'Tesla', 'Toyota', 'Volkswagen',
  'Volvo',
].sort((a, b) => a.localeCompare(b, 'es'));

function money(n) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n || 0);
}

function calcListPrice(desiredReceive) {
  const raw = desiredReceive * (1 + COMMISSION_PCT / 100);
  return Math.ceil(raw / 500) * 500;
}

// Valida el dígito verificador del VIN. No revisa robo ni adeudos:
// eso se consulta en REPUVE durante la inspección física en el hub.
const VIN_MAP = { A:1,B:2,C:3,D:4,E:5,F:6,G:7,H:8,J:1,K:2,L:3,M:4,N:5,P:7,R:9,S:2,T:3,U:4,V:5,W:6,X:7,Y:8,Z:9 };
const VIN_WEIGHTS = [8,7,6,5,4,3,2,10,0,9,8,7,6,5,4,3,2];
function isValidVin(vin) {
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) return false;
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const ch = vin[i];
    const val = /[0-9]/.test(ch) ? Number(ch) : VIN_MAP[ch];
    if (val === undefined) return false;
    sum += val * VIN_WEIGHTS[i];
  }
  const rem = sum % 11;
  const check = rem === 10 ? 'X' : String(rem);
  return check === vin[8];
}

export default function VenderPage() {
  const router = useRouter();
  const [form, setForm] = useState({ brand: '', model: '', trim: '', year: '', km: '', owners: '1', vin: '', price: '' });
  const [photos, setPhotos] = useState([]);
  const [status, setStatus] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [userId, setUserId] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Modelos reales según la marca elegida (base de datos pública NHTSA).
  const [models, setModels] = useState([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [manualModel, setManualModel] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/login'); return; }
      setUserId(data.user.id);
      setCheckingAuth(false);
    });
  }, [router]);

  useEffect(() => {
    if (!form.brand) { setModels([]); return; }
    setModelsLoading(true);
    setModels([]);
    fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMake/${encodeURIComponent(form.brand)}?format=json`)
      .then((r) => r.json())
      .then((data) => {
        const names = Array.from(new Set((data.Results || []).map((r) => r.Model_Name))).sort((a, b) => a.localeCompare(b, 'es'));
        setModels(names);
      })
      .catch(() => setModels([]))
      .finally(() => setModelsLoading(false));
  }, [form.brand]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function updateBrand(value) {
    setForm((f) => ({ ...f, brand: value, model: '' }));
    setManualModel(false);
  }

  const desiredReceive = Number(form.price) || 0;
  const listPrice = desiredReceive > 0 ? calcListPrice(desiredReceive) : 0;
  const commissionAmount = listPrice > 0 ? listPrice - desiredReceive : 0;

  async function handleSubmit(e) {
    e.preventDefault();

    if (!isValidVin(form.vin)) {
      setStatus('error');
      setErrorMsg('Ese VIN no parece válido (el dígito verificador no coincide). Revisa que lo hayas copiado bien de la tarjeta de circulación.');
      return;
    }

    setStatus('saving');
    setErrorMsg('');

    const vehicleId = crypto.randomUUID();
    const { error: vErr } = await supabase.from('vehicles').insert({
      id: vehicleId,
      vin: form.vin.toUpperCase(),
      brand: form.brand,
      model: form.model,
      trim: form.trim || null,
      year: Number(form.year),
      mileage_km: Number(form.km),
      owners_count: Number(form.owners),
    });
    if (vErr) { setStatus('error'); setErrorMsg(vErr.message); return; }

    const listingId = crypto.randomUUID();
    const { error: lErr } = await supabase.from('listings').insert({
      id: listingId,
      vehicle_id: vehicleId,
      hub_id: HUB_MONTERREY_ID_PLACEHOLDER,
      expected_price: desiredReceive,
      list_price: listPrice,
      commission_pct: COMMISSION_PCT,
      seller_id: userId,
    });
    if (lErr) { setStatus('error'); setErrorMsg(lErr.message); return; }

    for (let i = 0; i < photos.length; i++) {
      const file = photos[i];
      const path = `${listingId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from('listing-photos').upload(path, file);
      if (upErr) { setStatus('error'); setErrorMsg('Auto guardado, pero una foto no se pudo subir: ' + upErr.message); return; }
      await supabase.from('listing_photos').insert({ listing_id: listingId, storage_path: path, position: i, is_cover: i === 0 });
    }

    setStatus('done');
  }

  if (checkingAuth) {
    return <main className="wrap" style={{ padding: '60px 24px' }}><p>Verificando tu cuenta…</p></main>;
  }

  if (status === 'done') {
    return (
      <main className="wrap" style={{ padding: '48px 0' }}>
        <h1>Recibimos los datos de tu auto</h1>
        <p style={{ marginTop: 10, color: 'var(--ink-2)' }}>
          El siguiente paso, cuando conectemos documentos e inspección, es verificar tu auto antes de publicarlo.
        </p>
      </main>
    );
  }

  return (
    <main className="wrap" style={{ padding: '48px 0', maxWidth: 560 }}>
      <h1>Vende tu auto</h1>
      <p style={{ color: 'var(--ink-2)', margin: '10px 0 24px' }}>
        Este formulario ya guarda tu auto en la base de datos real de CARTRU.
      </p>
      <form onSubmit={handleSubmit}>
        <label className="field">Marca
          <select required value={form.brand} onChange={(e) => updateBrand(e.target.value)}>
            <option value="">Selecciona una marca</option>
            {BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </label>

        <label className="field">Modelo
          {form.brand && models.length > 0 && !manualModel ? (
            <>
              <select
                required
                value={form.model}
                onChange={(e) => {
                  if (e.target.value === '__otro__') { setManualModel(true); update('model', ''); return; }
                  update('model', e.target.value);
                }}
              >
                <option value="">Selecciona un modelo</option>
                {models.map((m) => <option key={m} value={m}>{m}</option>)}
                <option value="__otro__">Mi modelo no aparece — escribirlo</option>
              </select>
              <span className="hint" style={{ color: 'var(--ink-2)', fontWeight: 400, fontSize: '.82rem' }}>
                Esta lista viene de una base de datos de EE. UU.; algunos modelos exclusivos de México (como el VW Virtus) no aparecen — usa "Mi modelo no aparece" para escribirlo.
              </span>
            </>
          ) : (
            <input
              required
              value={form.model}
              onChange={(e) => update('model', e.target.value)}
              placeholder={modelsLoading ? 'Buscando modelos…' : (form.brand ? 'Escribe el modelo' : 'Primero elige una marca')}
              disabled={modelsLoading}
            />
          )}
        </label>

        <label className="field">Versión
          <input value={form.trim} onChange={(e) => update('trim', e.target.value)} placeholder="Ej. GLS, Sport, Limited" />
        </label>
        <label className="field">Año
          <input required inputMode="numeric" value={form.year} onChange={(e) => update('year', e.target.value)} />
        </label>
        <label className="field">Kilometraje
          <input required inputMode="numeric" value={form.km} onChange={(e) => update('km', e.target.value)} />
        </label>
        <label className="field">Número de dueños
          <select required value={form.owners} onChange={(e) => update('owners', e.target.value)}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
        <label className="field">Número de serie (VIN, 17 caracteres)
          <input required maxLength={17} value={form.vin} onChange={(e) => update('vin', e.target.value.toUpperCase())} />
        </label>

        <label className="field">Fotos de tu auto
          <div style={{ position: 'relative' }}>
            <label htmlFor="photos-input" className="btn outline" style={{ display: 'inline-flex', cursor: 'pointer' }}>Elegir fotos</label>
            <input
              id="photos-input"
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setPhotos(Array.from(e.target.files))}
              style={{ position: 'absolute', width: 1, height: 1, opacity: 0, overflow: 'hidden' }}
            />
            {photos.length > 0 && (
              <span style={{ marginLeft: 12, color: 'var(--ink-2)', fontWeight: 400, fontSize: '.88rem' }}>{photos.length} foto(s) seleccionada(s)</span>
            )}
          </div>
        </label>

        <label className="field">Precio que quieres recibir (MXN)
          <input required inputMode="numeric" value={form.price} onChange={(e) => update('price', e.target.value.replace(/\D/g, ''))} />
        </label>

        {listPrice > 0 && (
          <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 8, padding: 14, marginBottom: 14, fontSize: '.92rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Precio de venta</span><strong>{money(listPrice)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ink-2)' }}>
              <span>Comisión CARTRU</span><span>-{money(commissionAmount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--line)', marginTop: 8, paddingTop: 8 }}>
              <span>Tú recibes</span><strong>{money(desiredReceive)}</strong>
            </div>
          </div>
        )}

        {status === 'error' && (
          <p style={{ color: 'var(--yellow-ink)', background: 'var(--yellow-tint)', padding: 10, borderRadius: 8 }}>No se pudo guardar: {errorMsg}</p>
        )}

        <button className="btn primary" type="submit" disabled={status === 'saving'}>{status === 'saving' ? 'Guardando…' : 'Guardar mi auto'}</button>
      </form>
    </main>
  );
}
