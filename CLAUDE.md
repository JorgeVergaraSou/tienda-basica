# CLAUDE.md (raíz del repo)

Este repo (`tienda-basica`) contiene **dos proyectos independientes**, cada uno con su propio
`CLAUDE.md` con el detalle real (arquitectura, convenciones, historial de cambios y el *por qué*
de cada decisión) — leelo entero antes de tocar código en ese proyecto:

- **[Backend/CLAUDE.md](Backend/CLAUDE.md)** — API NestJS + MySQL + TypeORM (`tienda/v1`), puerto
  `3006` por defecto. Auth por JWT/roles, productos, categorías, usuarios, contacto.
- **[Frontend/CLAUDE.md](Frontend/CLAUDE.md)** — SPA React + TypeScript + Vite, puerto `5173` por
  defecto. Catálogo público, panel de administración, perfil.

No son un monorepo con workspaces compartidos: no hay `package.json` en la raíz, cada carpeta
tiene su propio `npm install`/`npm run dev` y corre por separado (`Backend/` necesita estar
levantado para que `Frontend/` funcione de verdad, ver `VITE_API_BASE_URL` en el `.env` del
frontend).

## Qué es esto

Una tienda online real (bazar/juguetería — "vende de todo"), no una demo. Arrancó como dos
plantillas separadas ("base-auth-backend"/"base-auth-react", con auth/roles/sesión ya resueltos) y
se le construyó encima el dominio de negocio real: catálogo público, panel de administración de
productos/categorías/usuarios, galería de fotos por producto, formulario de contacto (mail +
WhatsApp), CRUD de usuarios para ADMIN. El detalle de cada feature — qué se pidió, qué se decidió
y por qué — está en la sección "Historia reciente" de cada `CLAUDE.md`, no acá: este archivo es
solo el punto de entrada para saber a cuál de los dos ir.

## Convenciones que aplican a los dos proyectos

- Comentarios y documentación en español, explicando el *por qué* además del *qué* — mantené ese
  estilo en código nuevo.
- Cambio mínimo necesario: analizar antes de tocar, no reescribir de más ni cambiar de
  librería/arquitectura sin que se pida explícitamente.
- Correr build/lint/test (según el proyecto — ver el comando exacto en cada `CLAUDE.md`) después
  de cada cambio, antes de darlo por terminado.
- `uploads/` en el backend es una carpeta compartida entre datos de prueba y datos reales — nunca
  borrar ahí por patrón/glob, siempre por nombre de archivo específico (ver Backend/CLAUDE.md).
