export interface SedeInfo {
  clave: string;
  nombre: string;
  logo: string;
}

export const SEDES: SedeInfo[] = [
  { clave: 'Soledad', nombre: 'Soledad', logo: '/sede-soledad.png' },
  { clave: 'Barranquilla', nombre: 'Barranquilla', logo: '/sede-barranquilla.jpeg' },
  { clave: 'Colsamiro', nombre: 'Colsamiro', logo: '/sede-colsamiro.jpeg' },
];

export function sedeInfo(clave?: string | null): SedeInfo | null {
  if (!clave) return null;
  return SEDES.find((s) => s.clave === clave) ?? null;
}