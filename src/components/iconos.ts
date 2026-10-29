// Íconos de Lucide (https://lucide.dev, licencia ISC) usados en la interfaz.
// Solo decoran: heredan el color del texto (currentColor) y van con aria-hidden.
import {
  ArrowDownToLine,
  ArrowRightToLine,
  ClipboardCheck,
  Hash,
  type LucideIcon,
  Network,
  Play,
  Route,
  Scissors,
  SlidersHorizontal,
} from "lucide-react";
import type { Etapa } from "./estado";

/** Tamaño común de los íconos (px). */
export const TAM_ICONO = 18;

export const ICONO_ETAPA: Record<Etapa | "ejecucion", LucideIcon> = {
  nodos: Hash,
  modo: SlidersHorizontal,
  roles: ArrowRightToLine,
  grafo: Network,
  revision: ClipboardCheck,
  ejecucion: Play,
};

export { ArrowDownToLine as IconoSumidero, ArrowRightToLine as IconoFuente, Route as IconoCamino, Scissors as IconoCorte };
