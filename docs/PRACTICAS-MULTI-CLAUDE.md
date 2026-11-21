# Prácticas para trabajar con varios Claudes en paralelo

1. **Al empezar la sesión**: `git pull --rebase origin main`, lee `docs/BITACORA.md` (últimas entradas) y `CLAUDE.md`. No asumas el estado: míralo.
2. **Una rama por vertical** y un dueño por carpeta. No edites carpetas de otra vertical; si hace falta, pídelo en la bitácora.
3. **Archivos compartidos** (`main.py`, `package.json`, `requirements.txt`, `.env.example`, `docs/contrato.md`): cambios mínimos, en un commit aparte, y hacer pull justo antes. Agrega, no reescribas.
4. **Commits pequeños y frecuentes**; `git pull --rebase origin main` antes de cada push para evitar merges feos.
5. **Nunca** `push --force` a `main`, ni `git reset --hard` sobre trabajo ajeno, ni borrar ramas de otros.
6. **El contrato manda**: si cambias un formato de mensaje, actualiza `docs/contrato.md` primero y avisa en la bitácora; los demás programan contra él.
7. **Bitácora al terminar cada bloque de trabajo**: qué hiciste, qué decidiste, qué falta, qué bloqueó. Es la memoria compartida entre Claudes (cada Claude parte sin contexto de los otros).
8. **Investigación** va a `data/research/` (una nota por tema, nombre con fecha: `2026-11-21-stt-espanol.md`), con fuente y conclusión en 3 líneas. Decisiones importantes también a la bitácora.
9. **Secretos**: solo `.env`. Si ves una clave en el código o en un commit, avisa de inmediato.
10. **Respuestas cortas** y sin repetir código ya mostrado; ahorra tokens.
11. **Si dos Claudes chocan** (mismo archivo, misma decisión): para, anótalo en la bitácora y deja que los humanos decidan.
12. **Demo primero**: antes de pulir, comprueba que lo tuyo funciona de punta a punta con datos mockeados.
