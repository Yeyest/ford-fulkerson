"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";

function BotonTema() {
  const [oscuro, setOscuro] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- el tema lo fija el script del <head>
    setOscuro(document.documentElement.dataset.theme === "dark");
  }, []);
  const alternar = () => {
    const nuevo = !oscuro;
    setOscuro(nuevo);
    if (nuevo) document.documentElement.dataset.theme = "dark";
    else delete document.documentElement.dataset.theme;
    try {
      localStorage.setItem("tema", nuevo ? "oscuro" : "claro");
    } catch {
      /* sin almacenamiento: el tema dura hasta recargar */
    }
  };
  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={oscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      className="flex h-9 w-9 items-center justify-center rounded-md border border-borde text-tenue hover:text-texto"
    >
      {oscuro ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )}
    </button>
  );
}

export default function Encabezado({ children }: { children?: ReactNode }) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-borde px-4 sm:px-6">
      <div className="flex items-center gap-2">
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="5" cy="12" r="3" fill="currentColor" />
          <circle cx="19" cy="6" r="3" fill="currentColor" />
          <circle cx="19" cy="18" r="3" fill="currentColor" />
          <path d="M8 11l8-4M8 13l8 4" stroke="currentColor" strokeWidth="2" />
        </svg>
        <span className="font-semibold tracking-tight">Ford-Fulkerson</span>
        <span className="hidden text-sm text-tenue sm:inline">· flujo máximo paso a paso</span>
      </div>
      <div className="ml-auto flex items-center gap-2">
        {children}
        <BotonTema />
      </div>
    </header>
  );
}
