// Avisos que se ocultan solos pasado un tiempo (burbujas, mensajes de validación y de éxito).
import { useEffect, useRef, useState } from "react";
import type { Nivel } from "@/lib/ff/editor";

/** Tiempo (ms) que un aviso queda a la vista: los errores y advertencias, más tiempo para leerlos. */
export const DURACION: Record<Nivel, number> = { ok: 4000, info: 5000, aviso: 7000, error: 7000 };

/**
 * Llama a `ocultar` cuando pasan `ms` desde que apareció `valor` (null, undefined o false = no hay aviso).
 * Si el valor cambia antes, el tiempo vuelve a empezar.
 */
export function useOcultarDespues(valor: unknown, ms: number, ocultar: () => void) {
  const ocultarRef = useRef(ocultar);
  useEffect(() => {
    ocultarRef.current = ocultar;
  });
  useEffect(() => {
    if (valor === null || valor === undefined || valor === false) return;
    const t = setTimeout(() => ocultarRef.current(), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);
}

/**
 * Para avisos que no son estado propio del componente (por ejemplo, el aviso del paso anterior):
 * devuelve true mientras deban verse y false pasados `ms`. Un valor nuevo se vuelve a mostrar.
 */
export function useVisibleDurante(valor: unknown, ms: number): boolean {
  const [vencido, setVencido] = useState<unknown>(null);
  useOcultarDespues(valor, ms, () => setVencido(valor));
  return valor !== null && valor !== undefined && valor !== false && vencido !== valor;
}
