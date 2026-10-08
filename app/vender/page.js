'use client';
import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

// Hub y documentos de ejemplo. En una siguiente etapa, el hub se elegiría
// según la ciudad del vendedor y los documentos vendrían de la tabla
// document_types en vez de estar escritos aquí.
const HUB_MONTERREY_ID_PLACEHOLDER = 'REEMPLAZA-CON-EL-ID-DEL-HUB-MONTERREY';

export default function VenderPage() {
  const [form, setForm] = useState({ brand: '', model: '', year: '', km: '', vin: '', price: '' });
  const [status, setStatus] = useState('idle'); // idle | saving | done | error
  const [errorMsg, setErrorMsg] = useState('');

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('saving');
    setErrorMsg('');

    // Nota importante: aquí falta pedirle a la persona que inicie sesión
    // (seller_id tiene que ser un usuario real de auth.users). Por ahora
    // este formulario solo demuestra cómo se guardaría el auto y la
    // publicación; antes de usarse de verdad hay que añadir el login.
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

    if (vErr) {
      setStatus('error');
      setErrorMsg(vErr.message);
      return;
    }

    const { error: lErr } = await supabase.from('listings').insert({
      vehicle_id: vehicle.id,
      hub_id: HUB_MONTERREY_ID_PLACEHOLDER,
      expected_price: Number(form.price),
      seller_id: null, // pendiente: id del usuario autenticado
    });

    if (lErr) {
      setStatus('error');
      setErrorMsg(lErr.message);
      return;
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
          <input required value={form.brand} onChange={(e) => update('brand', e.target.value)} />
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
          <input required maxLength={17} value={form.vin} onChange={(e) => update('vin', e.target.value)} />
        </label>
        <label className="field">Precio que quieres recibir (MXN)
          <input required inputMode="numeric" value={form.price} onChange={(e) => update('price', e.target.value)} />
        </label>

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
