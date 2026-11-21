# ADR-0001: Glosas LSCh como representación intermedia

## Estado
Propuesto

## Contexto
La LSCh es una lengua con gramática propia: otro orden de constituyentes (a menudo tópico–comentario),
uso del espacio y marcadores no manuales (expresión facial, cejas, movimiento de cabeza) que funcionan
como gramática. **No es español señado ni "español simplificado"**, así que traducir palabra por palabra
produce resultados incorrectos.

El sistema tiene tres componentes que deben hablar el mismo "idioma" interno:
1. El clasificador de señas (ADR-0002), que produce unidades reconocidas.
2. El agente LLM (ADR-0004), que traduce entre español y LSCh.
3. El avatar (ADR-0003), que ejecuta señas.

## Decisión
Usar **glosas LSCh** (etiquetas en mayúsculas que representan una seña, por ejemplo `MAÑANA YO MÉDICO IR`)
como el formato intermedio canónico entre todos los componentes, definido por un **diccionario único**
(`packages/glosses`) que funciona como contrato.

Cada entrada del diccionario incluye como mínimo:
```json
{
  "gloss": "MÉDICO",
  "category": "salud",
  "variants": ["DOCTOR"],
  "animationId": "medico_v1",
  "classifierLabel": 17,
  "nonManual": null,
  "notes": "Seña validada por intérprete X"
}
```
El deletreo manual (`DACTILOLOGÍA:J-U-A-N`) es el respaldo para nombres propios y palabras fuera del vocabulario.

## Consecuencias

### Positivas
- Un solo contrato permite que los tres equipos (reconocimiento, agente, avatar) trabajen en paralelo.
- Las glosas son texto: se pueden versionar, testear y depurar fácilmente.
- El LLM recibe y produce texto estructurado, que es su punto fuerte.

### Negativas
- Las glosas pierden información (marcadores no manuales, uso del espacio, intensidad). Se mitiga con campos opcionales (`nonManual`) que el avatar puede interpretar.
- No existe un estándar único de glosado para LSCh; el equipo define su convención y debe validarla con intérpretes.

### Neutrales
- El vocabulario del MVP queda limitado al tamaño del diccionario.

## Alternativas consideradas

**Traducción directa video ↔ texto (end-to-end)**
- Rechazada: requiere grandes datasets de LSCh que no existen públicamente y es una caja negra difícil de depurar.

**Español simplificado como formato intermedio**
- Rechazada: confunde lengua de señas con español y produce un orden gramatical incorrecto para usuarios sordos.

**Notación fonológica (HamNoSys / SignWriting)**
- Rechazada para el MVP: más expresiva, pero con mucha curva de aprendizaje y sin herramientas listas para LSCh. Se puede reconsiderar para el avatar en el futuro.

## Referencias
- ADR-0002, ADR-0003, ADR-0004
