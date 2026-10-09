'use client';
import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

// Hub de ejemplo. Reemplaza este id con el id real de "Hub Monterrey"
// que copiaste de la tabla hubs en Supabase.
const HUB_MONTERREY_ID_PLACEHOLDER = '4cdd5faf-5548-454f-8fd7-da1bc2ddd727';

// Comisión que cobra CompraCar sobre el precio del vendedor.
const COMMISSION_PCT = 3.5;

// Marcas más comunes en México. Se puede ampliar cuando quieras.
const BRANDS = [
  'Nissan', 'Chevrolet', 'Volkswagen', 'Toyota', 'Honda', 'Mazda', 'Kia',
  'Hyundai', 'Ford', 'SEAT', 'Renault', 'Chrysler', 'Jeep', 'RAM', 'GMC',
  'Audi', 'BMW', 'Mercedes-Benz', 'Mitsubishi', 'Suzuki', 'Fiat', 'Peugeot',
  'MG', 'Changan', 'JAC', 'Chirey', 'BYD', 'GWM', 'Volvo', 'Subaru',
];

function money(n) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n || 0);
}

export default function VenderPage() {
  const [form, setForm] = useState({ brand: '', model: '', year: '', km: '', vin: '', price: '' });
  const [photos, setPhotos] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | saving | done | error
  const [errorMsg, setErrorMsg] = useState('');

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  const priceNum = Number(form.price) || 0;
  const commissionAmount = Math.round((priceNum * COMMISSION_PCT) / 100);
  const netAmount = priceNum - commissionAmount;

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('saving');
    setErrorMsg('');

    // Nota: falta el login de usuarios (seller_id debería ser el id del
    // usuario autenticado). Por ahora se guarda sin dueño asignado.
    const { data: vehicle, error: vErr } = await supabase
      .from('vehicles')
      .insert({
        vin: form.vin.toUpperCase(),
        brand: form.brand,
        model: form.model,
        year: Number(form.year),
        mileage_km: Number(form.km),
      })
      .select()
      .single();

    if (vErr) { setStatus('error'); setErrorMsg(vErr.message); return; }

    const { data: listing, error: lErr } = await supabase
      .from('listings')
      .insert({
        vehicle_id: vehicle.id,
        hub_id: HUB_MONTERREY_ID_PLACEHOLDER,
        expected_price: priceNum,
        commission_pct: COMMISSION_PCT,
        seller_id: null,
      })
      .select()
      .single();

    if (lErr) { setStatus('error'); setErrorMsg(lErr.message); return; }

    // Sube cada foto al bucket "listing-photos" y guarda su ruta.
    for (let i = 0; i < photos.length; i++) {
      const file = photos[i];
      const path = `${listing.id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from('listing-photos').upload(path, file);
      if (upErr) { setStatus('error'); setErrorMsg('Auto guardado, pero una foto no se pudo subir: ' + upErr.message); return; }
      await supabase.from('listing_photos').insert({
        listing_id: listing.id,
        storage_path: path,
        position: i,
        is_cover: i === 0,
      });
    }

    setStatus('done');
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
        Este formulario ya guarda tu auto en la base de datos real de CompraCar.
      </p>
      <form onSubmit={handleSubmit}>
        <label className="field">Marca
          <select required value={form.brand} onChange={(e) => update('brand', e.target.value)}>
            <option value="">Selecciona una marca</option>
            {BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </label>
        <label className="field">Modelo
          <input required value={form.model} onChange={(e) => update('model', e.target.value)} />
        </label>
        <label className="field">Año
          <input required inputMode="numeric" value={form.year} onChange={(e) => update('year', e.target.value)} />
        </label>
        <label className="field">Kilometraje
          <input required inputMode="numeric" value={form.km} onChange={(e) => update('km', e.target.value)} />
        </label>
        <label className="field">Número de serie (VIN, 17 caracteres)
          <input required maxLength={17} value={form.vin} onChange={(e) => update('vin', e.target.value.toUpperCase())} />
        </label>
        <label className="field">Fotos de tu auto
          <input type="file" accept="image/*" multiple onChange={(e) => setPhotos(Array.from(e.target.files))} />
          {photos.length > 0 && <span style={{ color: 'var(--ink-2)', fontWeight: 400, fontSize: '.88rem' }}>{photos.length} foto(s) seleccionada(s)</span>}
        </label>
        <label className="field">Precio que quieres recibir (MXN)
          <input required inputMode="numeric" value={form.price} onChange={(e) => update('price', e.target.value.replace(/\D/g, ''))} />
        </label>

        {priceNum > 0 && (
          <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 8, padding: 14, marginBottom: 14, fontSize: '.92rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Precio de venta</span><strong>{money(priceNum)}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ink-2)' }}><span>Comisión CompraCar ({COMMISSION_PCT}%)</span><span>-{money(commissionAmount)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--line)', marginTop: 8, paddingTop: 8 }}><span>Tú recibes</span><strong>{money(netAmount)}</strong></div>
          </div>
        )}

        {status === 'error' && (
          <p style={{ color: 'var(--yellow-ink)', background: 'var(--yellow-tint)', padding: 10, borderRadius: 8 }}>
            No se pudo guardar: {errorMsg}
          </p>
        )}

        <button className="btn primary" type="submit" disabled={status === 'saving'}>
          {status === 'saving' ? 'Guardando…' : 'Guardar mi auto'}
        </button>
      </form>
    </main>
  );
}
