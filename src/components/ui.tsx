"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { Nivel } from "@/lib/ff/editor";

type Variante = "primario" | "secundario" | "fantasma" | "peligro";

const VARIANTES: Record<Variante, string> = {
  primario: "bg-texto text-invertido border border-texto hover:opacity-85",
  secundario: "bg-fondo text-texto border border-borde-fuerte hover:bg-superficie-2",
  fantasma: "bg-transparent text-texto border border-transparent hover:bg-superficie-2",
  peligro: "bg-fondo text-[var(--a-corte)] border border-borde-fuerte hover:bg-superficie-2",
};

export function Boton({
  variante = "secundario",
  tam = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; tam?: "sm" | "md" | "lg" }) {
  const t = tam === "sm" ? "h-8 px-3 text-sm" : tam === "lg" ? "h-12 px-6 text-base" : "h-10 px-4 text-[15px]";
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${t} ${VARIANTES[variante]} ${className}`}
      {...props}
    />
  );
}

export function Insignia({ color, children, className = "" }: { color: string; children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold tracking-wide ${className}`}
      style={{ borderColor: color, color }}
    >
      <span className="h-2 w-2 rounded-full" style={{ background: color }} aria-hidden="true" />
      {children}
    </span>
  );
}

const ICONO: Record<Nivel, string> = { error: "✕", aviso: "!", ok: "✓", info: "i" };
const COLOR_NIVEL: Record<Nivel, string> = {
  error: "var(--a-corte)",
  aviso: "var(--a-aviso)",
  ok: "var(--a-actualizada)",
  info: "var(--tenue)",
};

/** Mensaje de validación (los textos vienen de Python). */
export function Mensaje({ nivel, children, className = "" }: { nivel: Nivel; children: ReactNode; className?: string }) {
  return (
    <div
      className={`flex items-start gap-2 rounded-md border bg-fondo px-3 py-2 text-[15px] leading-snug ${className}`}
      style={{ borderColor: COLOR_NIVEL[nivel] }}
    >
      <span
        className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
        style={{ background: COLOR_NIVEL[nivel] }}
        aria-hidden="true"
      >
        {ICONO[nivel]}
      </span>
      <span className="whitespace-pre-line [font-variant-ligatures:none]">{children}</span>
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-borde-fuerte bg-superficie px-1.5 py-0.5 font-mono text-[11px] text-tenue">{children}</kbd>
  );
}

export function Tarjeta({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-borde bg-fondo ${className}`}>{children}</div>;
}
