import type { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary';

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-300',
  secondary:
    'bg-gray-100 hover:bg-gray-200 text-gray-800 disabled:bg-gray-50 disabled:text-gray-400',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

/**
 * Botón base del proyecto. index.css ya no trae un reset global de
 * <button> (era CSS heredado de la plantilla vieja) — este componente es
 * el reemplazo: úsalo en vez de un <button> a mano para tener el mismo
 * look consistente en toda la app.
 */
export function Button({ variant = 'primary', type = 'button', className = '', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={`px-4 py-2 rounded-md font-medium cursor-pointer disabled:cursor-not-allowed transition-colors ${variantClasses[variant]} ${className}`.trim()}
      {...props}
    />
  );
}

export default Button;
