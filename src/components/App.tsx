"use client";

import { useReducer } from "react";
import { fijarNombres } from "@/lib/ff/nombres";
import Asistente from "./asistente/Asistente";
import PantallaAlgoritmo from "./algoritmo/PantallaAlgoritmo";
import { ESTADO_INICIAL, matrizActual, reductor } from "./estado";

export default function App() {
  const [estado, despachar] = useReducer(reductor, ESTADO_INICIAL);
  // Antes de dibujar los hijos, para que nombreNodo use los nombres actuales en toda la app
  fijarNombres(estado.nombres);

  if (estado.pantalla === "algoritmo") {
    return (
      <PantallaAlgoritmo
        matriz={matrizActual(estado)}
        roles={estado.roles}
        onEditar={() => despachar({ tipo: "volverAEditar" })}
        onReiniciar={() => despachar({ tipo: "reiniciar" })}
      />
    );
  }
  return <Asistente estado={estado} despachar={despachar} />;
}
