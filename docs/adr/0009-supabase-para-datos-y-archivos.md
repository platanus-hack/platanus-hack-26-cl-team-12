# ADR-0009: Supabase para datos y archivos

## Estado
Propuesto

## Contexto
Se necesita persistir:
- el **diccionario de glosas** (ADR-0001) con metadatos y relación a animaciones;
- **archivos** de animación del avatar y modelos ONNX versionados;
- **usuarios** (autenticación básica) y preferencias (velocidad del avatar, tamaño de subtítulos);
- opcionalmente, **transcripciones** de llamadas, solo con consentimiento explícito (ADR-0010).

Los datos son relacionales y de volumen bajo, y el equipo necesita algo operativo en minutos.

## Decisión
Usar **Supabase**:
- **Postgres** para el diccionario, los usuarios y las preferencias.
- **Storage** para animaciones (JSON/GLB) y modelos ONNX, servidos por CDN.
- **Auth** para el login (correo / OAuth).
- **Row Level Security** activada desde el inicio en las tablas con datos de usuario.

Modelo inicial:
```
glosses(id, gloss, category, variants[], animation_path, classifier_label, non_manual, validated_by, version)
users(id, display_name, role: 'sordo' | 'oyente', prefs jsonb)
call_transcripts(id, room_id, user_id, consent bool, content jsonb, created_at)  -- opcional
```

## Consecuencias

### Positivas
- Postgres administrado con autenticación y almacenamiento incluidos: un solo proveedor.
- Plan gratuito suficiente para el MVP.
- RLS da seguridad por fila sin escribir middleware.

### Negativas
- Dependencia de Supabase (mitigable: es Postgres estándar y portable).
- El plan gratuito pausa proyectos inactivos; hay que mantenerlo activo antes de la demo.

### Neutrales
- El diccionario también se exporta como JSON estático al build del cliente, para funcionar sin conexión (PWA).

## Alternativas consideradas

**Firebase (Firestore)**
- Rechazada: el diccionario es relacional (glosa ↔ variantes ↔ animación) y Firestore complica las consultas.

**Postgres propio en Render/Fly + S3**
- Rechazada: más piezas que operar por el mismo resultado.

**Solo archivos JSON en el repo**
- Considerada para el día 1 como fuente inicial; insuficiente para usuarios, auth y preferencias.

## Referencias
- Supabase (Postgres, Storage, Auth, RLS)
- ADR-0001, ADR-0010
