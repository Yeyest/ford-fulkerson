"use client";

import { useState } from "react";
import { validarRoles } from "@/lib/ff/red";
import { IconoFuente, IconoSumidero } from "../iconos";
import { Mensaje } from "../ui";
import type { PropsPaso } from "./Asistente";
import Pie from "./Pie";
import MarcarRoles from "./Roles";

export default function PasoRoles({ estado, despachar, onSiguiente, onAnterior }: PropsPaso) {
  const [errores, setErrores] = useState<string[]>([]);
  const manual = estado.modo === "manual";

  const continuar = () => {
    const e = validarRoles(estado.roles);
    setErrores(e);
    if (!e.length) onSiguiente();
  };

  return (
    <>
      <div className="flex flex-1 flex-col gap-4 px-4 py-6 sm:px-6">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <span className="flex shrink-0 items-center" aria-hidden="true">
              <IconoFuente size={20} />
              <IconoSumidero size={20} />
            </span>
            Fuentes y sumideros
          </h1>
          <p className="mt-2 max-w-3xl text-tenue">
            {manual
              ? "Una vez construido el grafo, selecciona uno o varios vértices fuente y uno o varios vértices sumidero."
              : "Marca las fuentes y los sumideros primero: el generador aleatorio los usa para armar el DAG por capas."}{" "}
            Con varias fuentes se agrega un origen ficticio S y con varios sumideros un destino ficticio T, para que el
            algoritmo trabaje con una sola fuente y un solo sumidero.
          </p>
          {estado.aviso && <Mensaje nivel="ok" className="mt-3 max-w-xl">{estado.aviso}</Mensaje>}
        </div>
        <MarcarRoles
          n={estado.n}
          matriz={manual ? estado.manual.matriz : null}
          roles={estado.roles}
          onRoles={(roles) => {
            despachar({ tipo: "roles", roles });
            if (errores.length) setErrores(validarRoles(roles));
          }}
          errores={errores}
        />
      </div>
      <Pie onAnterior={onAnterior} onContinuar={continuar} />
    </>
  );
}
