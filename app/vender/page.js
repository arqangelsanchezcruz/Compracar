'use client';
import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

const HUB_MONTERREY_ID_PLACEHOLDER = '4cdd5faf-5548-454f-8fd7-da1bc2ddd727';

// Comisión que cobra CompraCar, aplicada SOBRE el precio que el vendedor
// quiere recibir, para obtener el precio que ve el comprador.
const COMMISSION_PCT = 3.5;

// Marcas más comunes en México. Se puede ampliar cuando quieras.
const BRANDS = [
  'Nissan', 'Chevrolet', 'Volkswagen', 'Toyota', 'Honda', 'Mazda', 'Kia',
  'Hyundai', 'Ford', 'SEAT', 'Renault', 'Chrysler', 'Jeep', 'RAM', 'GMC',
  'Audi', 'BMW', 'Mercedes-Benz', 'Mitsubishi', 'Suzuki', 'Fiat', 'Peugeot',
  'MG', 'Changan', 'JAC', 'Chirey', 'BYD', 'GWM', 'Volvo', 'Subaru',
];

// Valida el "dígito verificador" del VIN (posición 9), una fórmula
// matemática estándar en todos los autos. Si no coincide, el VIN tiene
// un error de captura o fue inventado. Esto NO revisa robo ni adeudos:
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

function money(n) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n || 0);
}

// El vendedor escribe cuánto quiere recibir. El precio que ve el
// comprador se calcula agregando la comisión y redondeando hacia
// arriba al múltiplo de 500 más cercano.
function calcListPrice(desiredReceive) {
  const raw = desiredReceive * (1 + COMMISSION_PCT / 100);
  return Math.ceil(raw / 500)
