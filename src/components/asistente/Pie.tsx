"use client";

import type { ReactNode } from "react";
import { Boton } from "../ui";

/** Botones Atrás / Continuar del asistente. */
export default function Pie({
  onAnterior,
  onContinuar,
  continuar = "Continuar",
  deshabilitado,
  explicacion,
  children,
}: {
  onAnterior?: () => void;
  onContinuar: () => void;
  continuar?: string;
  deshabilitado?: boolean;
  explicacion?: string | null;
  children?: ReactNode;
}) {
  return (
    <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-3 border-t border-borde bg-fondo px-4 py-3 sm:px-6">
      {onAnterior && (
        <Boton variante="fantasma" onClick={onAnterior}>
          ← Atrás
        </Boton>
      )}
      {children}
      <div className="ml-auto flex items-center gap-3">
        {deshabilitado && explicacion && (
          <span id="explicacion-continuar" className="hidden text-sm text-tenue sm:inline">
            {explicacion}
          </span>
        )}
        <Boton
          variante="primario"
          onClick={onContinuar}
          disabled={deshabilitado}
          aria-describedby={deshabilitado && explicacion ? "explicacion-continuar" : undefined}
          title={deshabilitado && explicacion ? explicacion : undefined}
        >
          {continuar} →
        </Boton>
      </div>
    </div>
  );
}
