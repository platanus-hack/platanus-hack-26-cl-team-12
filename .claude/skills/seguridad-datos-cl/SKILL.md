---
name: seguridad-datos-cl
description: 'Úsala cuando el proyecto recolecte, guarde, procese o transfiera datos personales de usuarios o clientes (formularios, cuentas, logs con emails/RUT, analítica, datos de salud, biométricos, menores de edad, datos financieros), al diseñar el modelo de datos o una API, al elegir un proveedor cloud/IA, o al revisar un PR que toque datos personales. Aplica la Ley 21.719 de Chile (modifica la Ley 19.628) y estándares de seguridad de la industria (OWASP, NIST SSDF).'
---

# Seguridad y protección de datos personales (Chile)

## Marco legal

**Ley 21.719** (publicada en diciembre de 2024) reescribe la Ley 19.628 y crea la **Agencia de Protección de Datos Personales**. Su vigencia está fijada para el **1 de diciembre de 2026**.

> ⚠️ En octubre de 2026 el Senado aprobó un proyecto para postergar esa fecha. **Antes de afirmar la fecha de vigencia, verifícala** en https://www.bcn.cl/leychile (idNorma 1209272). Para diseñar el producto da igual: se construye conforme a la ley desde el día 1 (privacidad desde el diseño).

Otras normas a considerar según el caso:
- **Ley 21.663**, Marco de Ciberseguridad (ANCI). Aplica a servicios esenciales y operadores de importancia vital.
- **Ley 21.459** de delitos informáticos.

Las citas de artículos corresponden al texto refundido de la Ley 19.628 según la Ley 21.719, verificado en LeyChile.

### Obligaciones que impactan el código

| Obligación | Artículo | Qué significa en ingeniería |
|------------|----------|-----------------------------|
| Principios: licitud, finalidad, **proporcionalidad**, calidad, responsabilidad, seguridad, transparencia, confidencialidad | art. 3 | Recolecta solo los campos necesarios. Define una **retención** y borra o anonimiza al vencer |
| Derechos de acceso, rectificación, supresión, oposición, **portabilidad**, **bloqueo**; derechos frente a decisiones automatizadas | arts. 5–8 ter | Endpoints o procesos para exportar (JSON/CSV), corregir, borrar y suspender el tratamiento por usuario. Explicación e intervención humana si hay decisiones automatizadas con efectos significativos |
| Responder solicitudes del titular en **30 días corridos**, prorrogables una vez por 30 más; guardar respaldo de la respuesta | art. 11 | Registro de solicitudes con timestamps y canal de contacto (email o formulario) |
| Confidencialidad, que subsiste tras terminar la relación | art. 14 bis | Control de acceso por rol; nada de datos personales en logs ni en issues |
| **Transparencia**: política de tratamiento pública, con versión y fecha, categorías de datos, finalidades, base de licitud, destinatarios, plazo de conservación | art. 14 ter | Página `/privacidad` versionada en el repo |
| **Protección desde el diseño y por defecto** | art. 14 quáter | Defaults privados; minimización en el esquema de la BD |
| **Medidas de seguridad** según el riesgo: seudonimización y cifrado, confidencialidad/integridad/disponibilidad/resiliencia, restauración rápida, verificación periódica | art. 14 quinquies | Cifrado en tránsito (TLS) y en reposo, backups probados, pruebas de seguridad en CI |
| **Reporte de brechas** a la Agencia "por los medios más expeditos posibles y sin dilaciones indebidas" si hay riesgo razonable; registro de cada incidente. Aviso **a los titulares** si son datos sensibles, de menores de 14 años o financieros/comerciales | art. 14 sexies | Runbook de incidentes (`docs/INCIDENTES.md`) y registro de incidentes |
| Encargados (proveedores) solo tratan según instrucciones del responsable | art. 15 bis | Contrato o DPA con cada proveedor (cloud, IA, analítica) |
| **Evaluación de impacto (EIPD)** previa si hay alto riesgo: perfilamiento con efectos significativos, gran escala, monitoreo de zonas públicas, datos sensibles… | art. 15 ter | `docs/EIPD.md` antes de lanzar |
| Datos **sensibles** solo con consentimiento expreso, salvo excepciones legales | art. 16 | Flag `sensible` en el esquema, consentimiento registrado con timestamp y versión |
| **Biométricos**: informar el sistema, la finalidad, el período y cómo ejercer derechos | art. 16 ter | Pantalla de información previa a la captura |
| **Niños, niñas y adolescentes**: interés superior; menores de 14 años requieren consentimiento de padres o representantes; datos sensibles de menores de 16 también | art. 16 quáter | Verificación de edad y flujo de consentimiento parental |
| **Transferencia internacional** lícita solo a país adecuado, con cláusulas contractuales o con un modelo de certificación | arts. 27–28 | Inventaria **dónde** se alojan los datos: región de la BD, APIs de IA en EE.UU., etc. |

### Sanciones (art. 35)
- Leves: amonestación o hasta **5.000 UTM**.
- Graves: hasta **10.000 UTM**.
- Gravísimas: hasta **20.000 UTM**.
- Reincidencia: hasta 3 veces la multa.
- Empresa que no es de menor tamaño y reincide en infracción grave o gravísima: hasta el **2% o 4% de los ingresos anuales**, respectivamente.
- Si no se subsana en 60 días, la multa sube 50%.

Responder fuera de plazo o no publicar la política de privacidad son infracciones **leves** (art. 34 bis), es decir, fáciles de cometer.

## Estándares de la industria recomendados

- **OWASP Top 10 (2021+) y OWASP API Security Top 10**: checklist de cada PR que toque endpoints.
- **OWASP ASVS nivel 1** como mínimo verificable; nivel 2 si hay datos sensibles.
- **NIST SSDF (SP 800-218)**: prácticas de desarrollo seguro (revisión, análisis de dependencias, gestión de secretos).
- **OpenSSF Scorecard**: buenas prácticas del repositorio. Gratis en repos públicos.
- **ISO/IEC 27001 / 27701**: no se certifica en una hackatón, pero se mencionan los controles que el proyecto ya cubre.
- **SemVer + Conventional Commits + Keep a Changelog**: trazabilidad de cambios.

## Controles técnicos (todos de costo 0)

1. **Secretos**:
   - Nunca en el repo: `.env` en `.gitignore`, `.env.example` sin valores.
   - Escaneo con `gitleaks` en pre-commit y en CI.
   - En producción, usar GitHub Environments secrets.
2. **Dependencias**: Dependabot (alerts + updates) y `osv-scanner` o `trivy fs` en CI.
3. **SAST**: `semgrep scan --config p/default --config p/owasp-top-ten` (Semgrep CE, sin login). CodeQL solo si el repo es público (en privado requiere GitHub Advanced Security, que es de pago).
4. **Datos en logs**: logger con redacción de campos (`email`, `rut`, `telefono`, `password`, `token`). Prohibido loguear bodies completos.
5. **Datos de prueba**: solo sintéticos, con Faker y RUTs ficticios. **Nunca datos reales de clientes en dev, seeds, fixtures, screenshots, issues ni prompts a LLMs.**
6. **Cifrado**:
   - TLS siempre.
   - Contraseñas con argon2id o bcrypt.
   - Campos sensibles cifrados a nivel de aplicación o con pgcrypto.
   - Usar seudónimos (UUID) en vez de RUT como identificador.
7. **Acceso**: mínimo privilegio, RLS si se usa Supabase o Postgres, y separación de credenciales dev/prod (los dos ambientes **nunca** comparten BD).
8. **Retención**: un job o script que borre o anonimice según el plazo declarado en la política.
9. **Proveedores de IA**: antes de enviar datos personales a una API externa, verificar que la API no entrene con ellos, la región, la base para transferencia internacional (art. 27) y el DPA. Si no es necesario, seudonimizar o anonimizar antes de enviar.

## Entregables en el repo
Crea o actualiza estos archivos cuando apliquen (las plantillas las genera esta skill):
- `docs/DATOS-PERSONALES.md`: inventario con dato, finalidad, base de licitud, retención, ubicación/región, encargado y si es sensible.
- `docs/privacidad.md`: política pública con versión y fecha (art. 14 ter).
- `docs/INCIDENTES.md`: runbook de brechas:
  1. contener;
  2. evaluar el riesgo;
  3. reportar a la Agencia sin dilaciones indebidas;
  4. avisar a los titulares si corresponde;
  5. registrar (naturaleza, efectos, categorías, número de titulares, medidas).
- `docs/EIPD.md`, si hay alto riesgo (art. 15 ter).
- `SECURITY.md`: cómo reportar vulnerabilidades.

## Checklist para revisar un PR que toca datos personales
- [ ] ¿Cada campo nuevo está justificado por una finalidad (proporcionalidad)?
- [ ] ¿Se agregó al inventario `docs/DATOS-PERSONALES.md`?
- [ ] ¿Hay validación de entrada y autorización por recurso (OWASP API1: BOLA)?
- [ ] ¿Sin datos personales en logs, errores ni respuestas de más?
- [ ] ¿El borrado o la exportación del usuario siguen funcionando con el nuevo campo?
- [ ] ¿Sin secretos y sin datos reales en tests o seeds?

> Esta skill es una guía técnica, no asesoría legal. Para un producto real, valida con un abogado y revisa las instrucciones que dicte la Agencia.
