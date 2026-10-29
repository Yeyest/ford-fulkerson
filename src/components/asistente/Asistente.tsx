"use client";

import type { Dispatch } from "react";
import { contarAristas } from "@/lib/ff/editor";
import { validarCantidadNodos } from "@/lib/ff/entrada";
import { validarRoles } from "@/lib/ff/red";
import Creditos from "../Creditos";
import Encabezado from "../Encabezado";
import { type Accion, type Estado, type Etapa, claveAleatorio, etapasDe, matrizActual } from "../estado";
import BarraProgreso from "./BarraProgreso";
import PasoGrafo from "./PasoGrafo";
import PasoModo from "./PasoModo";
import PasoNodos from "./PasoNodos";
import PasoRevision from "./PasoRevision";
import PasoRoles from "./PasoRoles";

/** ¿Está completa la etapa? (para habilitar las siguientes en la barra de progreso) */
function completa(e: Estado, etapa: Etapa): boolean {
  switch (etapa) {
    case "nodos":
      return validarCantidadNodos(e.nTexto).error === null;
    case "modo":
      return e.modo !== null;
    case "roles":
      return validarRoles(e.roles).length === 0;
    case "grafo":
      return e.modo === "manual" ? contarAristas(e.manual.matriz) > 0 : e.aleatorio.clave === claveAleatorio(e) && contarAristas(matrizActual(e)) > 0;
    case "revision":
      return true;
  }
}

export default function Asistente({ estado, despachar }: { estado: Estado; despachar: Dispatch<Accion> }) {
  const etapas = etapasDe(estado.modo);
  const indice = etapas.indexOf(estado.etapa);
  const alcanzables = etapas.map((_, i) => etapas.slice(0, i).every((et) => completa(estado, et)));

  const ir = (etapa: Etapa, aviso?: string | null) => {
    // En modo aleatorio el grafo se genera al llegar a ese paso (o si cambiaron n o los roles)
    if (etapa === "grafo" && estado.modo === "aleatorio" && estado.aleatorio.clave !== claveAleatorio(estado)) {
      despachar({ tipo: "generar" });
    }
    despachar({ tipo: "ir", etapa, aviso });
  };
  const siguiente = (aviso?: string | null) => ir(etapas[indice + 1], aviso);
  const anterior = indice > 0 ? () => ir(etapas[indice - 1]) : undefined;

  const comunes = { estado, despachar, onSiguiente: siguiente, onAnterior: anterior };

  return (
    <div className="flex min-h-dvh flex-col">
      <Encabezado />
      <BarraProgreso etapas={etapas} actual={indice} alcanzables={alcanzables} onIr={(i) => ir(etapas[i])} />
      <main className="flex flex-1 flex-col">
        {estado.etapa === "nodos" && <PasoNodos {...comunes} />}
        {estado.etapa === "modo" && <PasoModo {...comunes} />}
        {estado.etapa === "roles" && <PasoRoles {...comunes} />}
        {estado.etapa === "grafo" && <PasoGrafo {...comunes} />}
        {estado.etapa === "revision" && <PasoRevision {...comunes} />}
      </main>
      <Creditos />
    </div>
  );
}

export interface PropsPaso {
  estado: Estado;
  despachar: Dispatch<Accion>;
  onSiguiente: (aviso?: string | null) => void;
  onAnterior?: () => void;
}
