# CompraCar — proyecto base

Esta es la primera versión real de CompraCar: una app de Next.js conectada
a una base de datos de Supabase. Reemplaza al prototipo de un solo archivo
HTML: aquí los autos sí se guardan de verdad.

## Qué funciona ya

- **Inicio** (`/`) y **Catálogo** (`/autos`): muestran autos publicados,
  leídos en vivo desde Supabase.
- **Ficha de un auto** (`/autos/[id]`): detalle de un auto. Los botones de
  oferta y prueba de manejo todavía son de muestra.
- **Vender** (`/vender`): formulario que SÍ guarda un auto nuevo en la base
  de datos (tablas `vehicles` y `listings`).

## Qué falta (lo seguimos construyendo después)

- Inicio de sesión de usuarios (hoy cualquiera podría publicar sin cuenta).
- Subida de documentos, inspección y el semáforo automático.
- Chat entre comprador y vendedor, ofertas, y el pago en custodia (escrow).

## Paso a paso para dejarlo funcionando

### 1. Crea el proyecto en Supabase
Si no lo has hecho: ve a supabase.com → **New project** → nómbralo
`compracar`, elige una contraseña para la base de datos y una región.

### 2. Corre el esquema SQL
Dentro de tu proyecto de Supabase, ve a **SQL Editor** → **New query**,
pega todo el contenido de `supabase/schema.sql` (está en esta misma
carpeta) y dale **Run**. Esto crea todas las tablas, incluida la de hubs
con Monterrey ya cargado.

### 3. Copia tus llaves de conexión
En Supabase ve a **Project Settings → API**. Vas a copiar dos valores:
- **Project URL**
- **anon public key**

### 4. Configura las variables de entorno
Copia el archivo `.env.example` como `.env.local` y pega ahí esos dos
valores:

```
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

### 5. Pruébalo en tu computadora (opcional, necesitas Node.js instalado)
```
npm install
npm run dev
```
Y abre http://localhost:3000

### 6. Súbelo a GitHub
Crea un repositorio nuevo en GitHub y sube esta carpeta (puedes arrastrar
los archivos desde la página de GitHub si no usas la terminal).

### 7. Despliega en Vercel
En vercel.com → **Add New → Project** → elige el repositorio que acabas de
subir. Antes de darle "Deploy", agrega las mismas dos variables de entorno
del paso 4 en **Environment Variables**. Dale **Deploy**.

En unos minutos tu app queda viva en una dirección como
`compracar.vercel.app`, ya conectada a tu base de datos real.

### 8. Conecta tu dominio
Cuando tengas tu dominio comprado: en Vercel, dentro del proyecto, ve a
**Settings → Domains**, agrega tu dominio y sigue las instrucciones para
apuntar los DNS desde donde lo compraste.

### 9. Carga un hub real
Antes de publicar un auto de prueba desde `/vender`, abre la tabla `hubs`
en Supabase (**Table Editor**), copia el `id` de "Hub Monterrey" y
reemplaza `HUB_MONTERREY_ID_PLACEHOLDER` en `app/vender/page.js` con ese id.
