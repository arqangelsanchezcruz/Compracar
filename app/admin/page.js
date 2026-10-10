'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

function money(n) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n || 0);
}

const STATUS_LABEL = {
  draft: 'Borrador', docs_pending: 'Faltan documentos', inspection_pending: 'Inspección pendiente',
  ready_to_publish: 'Lista para publicar', published: 'Publicado', reserved: 'Reservado',
  sold: 'Vendido', withdrawn: 'Retirado',
};

export default function AdminPage() {
  const router = useRouter();
  const [phase, setPhase] = useState('checking'); // checking | denied | ready
  const [listings, setListings] =
