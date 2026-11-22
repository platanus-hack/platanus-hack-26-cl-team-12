// A quién se puede llamar con Puente. Es una app de comunicación para personas sordas en general (banco, salud,
// trámites, personas), no solo de salud. Todo es de ejemplo. TODO(real-data): contactos del usuario y números
// reales desde ALLOWED_DESTINATIONS en services/api.
import type { IconName } from "@puente/ui";
import { FRASE_INICIAL, type TipoGuion } from "./mockCall";

export interface Destino {
  id: string;
  nombre: string;
  /** Cómo aparece en los subtítulos. */
  corto: string;
  /** Para qué se suele llamar (línea secundaria). */
  motivo: string;
  sigla: string;
  /** Color de la tarjeta (0 a 4). */
  tono: number;
  guion: TipoGuion;
  /** Lo primero que la persona puede decir con un toque apenas contestan. */
  frasesIniciales: string[];
}

const d = (id: string, nombre: string, corto: string, motivo: string, sigla: string, tono: number, guion: TipoGuion): Destino => ({
  id, nombre, corto, motivo, sigla, tono, guion, frasesIniciales: [FRASE_INICIAL[guion]],
});

/** Contactos frecuentes (carrusel del inicio y pestaña Contactos). */
export const FRECUENTES: Destino[] = [
  d("banco", "Mi ejecutivo del banco", "Banco", "Tarjetas, transferencias", "BA", 0, "general"),
  d("clinica", "Clínica Santa María", "Clínica", "Horas médicas", "SM", 1, "general"),
  d("fonasa", "Fonasa", "Fonasa", "Bonos y beneficios", "FO", 2, "general"),
  d("registro", "Registro Civil", "Registro Civil", "Trámites y certificados", "RC", 3, "general"),
  d("isapre", "Mi isapre", "Isapre", "Reembolsos", "IS", 4, "general"),
  d("luz", "Compañía de luz", "Compañía de luz", "Cortes y cuentas", "LU", 0, "general"),
  d("telefono", "Compañía de teléfono", "Compañía", "Plan y boletas", "TE", 1, "general"),
  d("colegio", "Colegio de mis hijos", "Colegio", "Inspectoría", "CO", 2, "general"),
  d("municipalidad", "Municipalidad", "Municipalidad", "Permisos y patentes", "MU", 3, "general"),
  d("farmacia", "Farmacia", "Farmacia", "Recetas y stock", "FA", 4, "general"),
];

/** Urgencias (pestaña Emergencias y atajo del ícono). */
export const URGENCIAS: Destino = d("urgencias", "Urgencias Clínica Santa María", "Urgencias", "Pedir una ambulancia", "SM", 1, "urgencia");
export const SAMU: Destino = d("samu", "SAMU (ambulancia)", "SAMU", "Pedir una ambulancia", "131", 0, "urgencia");

/** Acciones rápidas del inicio ("¿Qué necesitas hacer?"). La ambulancia va aparte, destacada en rojo. */
export const ACCIONES: { icon: IconName; titulo: string; detalle: string; destino: Destino; tono: number }[] = [
  { icon: "llamar", titulo: "Llamar a mi ejecutivo", detalle: "Banco", destino: FRECUENTES[0]!, tono: 0 },
  { icon: "historial", titulo: "Agendar una hora", detalle: "Clínica", destino: FRECUENTES[1]!, tono: 1 },
  { icon: "subtitulos", titulo: "Hacer un trámite", detalle: "Registro Civil", destino: FRECUENTES[3]!, tono: 3 },
];
