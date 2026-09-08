// src/components/ui/icons.tsx
/**
 * Iconos chicos para acciones de fila en listados del panel admin
 * (editar / dar de baja / reactivar) — sin librería nueva, mismo criterio
 * de cambio mínimo que el resto del proyecto. Trazo simple,
 * `stroke="currentColor"`: heredan el color de texto del botón que los
 * envuelve, así el hover (ej. `hover:text-red-600`) also tiñe el icono
 * sin tocar el SVG.
 */
import type { SVGProps } from 'react';

function IconBase(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      width={18}
      height={18}
      aria-hidden="true"
      {...props}
    />
  );
}

/** Editar */
export function PencilIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </IconBase>
  );
}

/** Dar de baja — círculo con una línea, "no disponible" */
export function BanIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="9" />
      <line x1="6.5" y1="6.5" x2="17.5" y2="17.5" />
    </IconBase>
  );
}

/** Reactivar — círculo con un check, mismo lenguaje visual que BanIcon
 * (mismo círculo base, cambia solo la marca interior) para que el
 * par activo/inactivo se lea como opuestos de una misma acción. */
export function CheckCircleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="9" />
      <polyline points="8 12.5 11 15.5 16 9.5" />
    </IconBase>
  );
}
