// Sin "use client": lo importa layout.tsx (componente de servidor) para incrustar el script en el <head>.
export const CLAVE_PREFERENCIAS = "puente-preferencias";

/** Script que corre antes de pintar la página: evita el destello de tema claro al abrir en oscuro. */
export const SCRIPT_TEMA = `try{var p=JSON.parse(localStorage.getItem("${CLAVE_PREFERENCIAS}")||"{}");var h=document.documentElement;h.dataset.theme=p.tema==="claro"?"light":"dark";h.dataset.texto=p.textoGrande?"grande":"normal";h.dataset.movimiento=p.reducirMovimiento?"reducido":"normal"}catch(e){document.documentElement.dataset.theme="dark"}`;
