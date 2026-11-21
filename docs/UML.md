# Diagramas UML de Puente

> Los diagramas están en **Mermaid**, así que GitHub los dibuja directamente en el navegador y se editan como texto.
> Se basan en el código de `services/` y `packages/` tal como está hoy; lo que todavía es plan se marca con **(plan)**.
> Visión general e infraestructura: [`ARQUITECTURA.md`](ARQUITECTURA.md). Decisiones: [`adr/`](adr/README.md).
>
> Mermaid no tiene sintaxis nativa de casos de uso ni de despliegue UML: esos dos se aproximan con diagramas de flujo.

| # | Diagrama | Responde a |
|---|---|---|
| 1 | Casos de uso | ¿Quién usa el sistema y para qué? |
| 2 | Componentes | ¿Qué piezas hay y cómo se conectan? |
| 3 | Clases (Python) | ¿Cómo está armado el backend? |
| 4 | Clases (TypeScript) | ¿Cómo está armado el cliente y el contrato? |
| 5 | Secuencia: unirse a la llamada | ¿Cómo entra el cliente a una sala? |
| 6 | Secuencia: ejecutivo → cliente | Voz a texto simple (v1/v2) |
| 7 | Secuencia: cliente escribe → ejecutivo | Texto a voz (v1/v2) |
| 8 | Secuencia: cliente firma → ejecutivo | Señas a voz (v3) |
| 9 | Secuencia: ejecutivo → cliente en señas | Voz a señas (v4) |
| 10 | Secuencia: llamada saliente por teléfono | Telefonía real **(plan)** |
| 11 | Estados: llamada | Ciclo de vida de una llamada |
| 12 | Estados: reconocimiento de una seña | Del cuadro de cámara a la glosa |
| 13 | Actividad: validación de mensajes | Qué acepta el agente y qué descarta |
| 14 | Despliegue | ¿Dónde corre cada pieza? **(plan)** |

---

## 1. Casos de uso

```mermaid
flowchart LR
    Cliente(["Persona sorda<br/>(cliente)"])
    Ejecutivo(["Ejecutivo<br/>(al teléfono)"])
    Equipo(["Equipo técnico"])

    subgraph Puente["Sistema Puente"]
        UC1(["Iniciar una llamada"])
        UC2(["Leer lo que dice el ejecutivo<br/>como texto simple"])
        UC3(["Responder escribiendo"])
        UC4(["Responder en lengua de señas<br/>frente a la cámara (v3)"])
        UC5(["Ver al ejecutivo en señas (v4)"])
        UC6(["Escuchar la respuesta<br/>con voz natural"])
        UC7(["Mantener el diccionario de glosas"])
        UC8(["Desplegar y vigilar costos"])
    end

    Cliente --- UC1
    Cliente --- UC2
    Cliente --- UC3
    Cliente --- UC4
    Cliente --- UC5
    Ejecutivo --- UC6
    Ejecutivo --- UC1
    Equipo --- UC7
    Equipo --- UC8

    UC3 -. "«include»" .-> UC6
    UC4 -. "«include»" .-> UC6
    UC5 -. "«extend»" .-> UC2
```

---

## 2. Componentes

```mermaid
flowchart TB
    subgraph Cliente["Dispositivo del cliente"]
        Web["apps/web<br/>PWA"]
        Signs["packages/signs<br/>reconocedor"]
        Avatar["packages/avatar<br/>SignPlayer"]
        UI["packages/ui<br/>subtítulos y avisos"]
        Gloss["packages/glosses<br/>diccionario + contrato"]
    end

    subgraph Backend["Backend Python"]
        API["services/api<br/>FastAPI"]
        Agent["services/agent<br/>agent.py"]
        Guard["guard.py"]
        Trad["translator/"]
    end

    LK["LiveKit Cloud<br/>salas + SIP"]
    Ext["Proveedores externos<br/>Anthropic · Deepgram · ElevenLabs"]
    DB[("Supabase (plan)")]

    Web --> Signs
    Web --> Avatar
    Web --> UI
    Web --> Gloss
    Signs --> Gloss
    Avatar --> Gloss

    Web -- "POST /token" --> API
    Web <-- "data channel" --> LK
    API -- "firma el token" --> LK
    Agent <--> LK
    Agent --> Guard
    Agent --> Trad
    Trad --> Ext
    Agent --> Ext
    API --> DB
    Agent --> Gloss
    API --> Gloss
```

---

## 3. Clases: backend (Python)

```mermaid
classDiagram
    class Glossary {
        +int version
        +dict entries
        +is_known(gloss) bool
        +as_prompt() str
    }

    class GlossResult {
        +list glosas
        +str subtitulo
        +list descartadas
    }

    class Translator {
        +client
        +Glossary glossary
        +str contexto
        -_system() list
        +glosas_a_espanol(glosas) str
        +simplificar(texto) str
        +espanol_a_glosas(texto) GlossResult
        +validar(glosas, deletrear, subtitulo) GlossResult
    }

    class PuenteTranslator {
        +Room room
        +Translator translator
        +on_user_turn_completed(turn_ctx, new_message)
    }

    class Agent {
        <<livekit-agents>>
    }

    class guard {
        <<module>>
        +int MAX_TEXTO
        +int MAX_GLOSAS
        +int MAX_GLOSAS_CHARS
        +parse_cliente_message(raw, sender_role, glossary) dict
    }

    class TokenResponse {
        <<FastAPI model>>
        +str url
        +str token
        +str room
        +str identity
    }

    class LlamadaRequest {
        <<FastAPI model>>
        +str room
        +str numero
    }

    Translator --> Glossary : usa
    Translator ..> GlossResult : devuelve
    PuenteTranslator --|> Agent
    PuenteTranslator --> Translator
    guard ..> Glossary : valida glosas
```

`guard.parse_cliente_message` devuelve el mensaje validado o `None`. `fingerspell()` y `FINGERSPELL_RE` viven en `translator/glossary.py`
y definen el formato `DACTILOLOGÍA:A-N-A` (máximo 20 letras).

---

## 4. Clases: cliente y contrato (TypeScript)

```mermaid
classDiagram
    class MensajePuente {
        <<union>>
    }
    class EjecutivoDice {
        +tipo = ejecutivo_dice
        +string texto
        +string simple
    }
    class ClienteDice {
        +tipo = cliente_dice
        +string texto
    }
    class Estado {
        +tipo = estado
        +valor llamada_iniciada o llamada_terminada
    }
    class GlosasCliente {
        +tipo = glosas_cliente
        +string[] glosas
        +number confianza
    }
    class GlosasParaSenar {
        +tipo = glosas_para_senar
        +string[] glosas
        +string subtitulo
    }
    EjecutivoDice --|> MensajePuente
    ClienteDice --|> MensajePuente
    Estado --|> MensajePuente
    GlosasCliente --|> MensajePuente
    GlosasParaSenar --|> MensajePuente

    class GlossEntry {
        +string gloss
        +string category
        +string[] es
        +string[] variants
        +number classifierLabel
        +string clip
        +string animationId
        +string nonManual
        +string validatedBy
    }
    class GlossDictionary {
        +number version
        +GlossEntry[] glosses
    }
    GlossDictionary o-- GlossEntry

    class SignRecognizer {
        <<interface>>
        +push(frame) Recognition
        +reset()
    }
    class Classifier {
        <<interface>>
        +predict(window) Float32Array
    }
    class LandmarkFrame {
        +number timestampMs
        +Float32Array points
    }
    class Recognition {
        +string gloss
        +number confidence
    }
    SignRecognizer ..> Recognition : produce
    SignRecognizer ..> LandmarkFrame : consume
    SignRecognizer --> Classifier : createRecognizer
    Recognition ..> GlossEntry : resuelve con classifierLabel

    class SignPlayer {
        <<interface>>
        +play(glosses) Promise
        +stop()
    }
    class ClipSignPlayer {
        +HTMLVideoElement video
        +ClipPlayerOptions opts
        +play(glosses) Promise
        +stop()
    }
    class VrmSignPlayer {
        <<plan>>
    }
    ClipSignPlayer ..|> SignPlayer
    VrmSignPlayer ..|> SignPlayer
    ClipSignPlayer ..> GlossEntry : busca el clip

    class CallHandle {
        <<interface>>
        +send(msg) Promise
        +leave()
    }
    CallHandle ..> MensajePuente : envía
```

`parseMensaje` valida la forma de cada tipo, y `SOLO_AGENTE` (`ejecutivo_dice`, `estado`, `glosas_para_senar`) se acepta únicamente
si el emisor es el agente.

---

## 5. Secuencia: unirse a la llamada

```mermaid
sequenceDiagram
    autonumber
    actor C as Cliente
    participant W as PWA
    participant A as API (FastAPI)
    participant L as LiveKit
    participant G as Agente

    C->>W: Iniciar llamada
    W->>A: POST /token (sin cuerpo)
    A->>A: genera identidad y sala (aleatorias)<br/>rol = cliente, sin publicar audio/video
    A-->>W: url, token, room, identity
    W->>L: connect(url, token)
    L-->>G: nueva sala → asigna el agente
    G->>L: session.start(...)
    G-->>W: estado: llamada_iniciada
    W-->>C: "Llamada conectada"
    Note over A: TODO(auth): exigir sesión y límite de tasa
```

---

## 6. Secuencia: ejecutivo → cliente (voz a texto simple)

```mermaid
sequenceDiagram
    autonumber
    actor E as Ejecutivo
    participant L as LiveKit
    participant G as Agente
    participant S as STT (Deepgram)
    participant T as Translator (Claude)
    participant W as PWA del cliente

    E->>L: habla (audio)
    L->>G: pista de audio
    G->>S: audio en streaming
    S-->>G: texto
    G->>T: simplificar(texto)
    T-->>G: texto simple
    G->>L: data channel: ejecutivo_dice {texto, simple}
    L->>W: ejecutivo_dice
    W->>W: parseMensaje + emisor = agente
    W-->>W: muestra el subtítulo (usa simple si existe)
    Note over G: on_user_turn_completed lanza StopResponse:<br/>el agente traduce, no conversa
```

---

## 7. Secuencia: cliente escribe → ejecutivo (texto a voz)

```mermaid
sequenceDiagram
    autonumber
    actor C as Cliente
    participant W as PWA
    participant L as LiveKit
    participant G as Agente
    participant V as guard.py
    participant TTS as TTS (ElevenLabs)
    actor E as Ejecutivo

    C->>W: escribe un texto
    W->>L: data channel: cliente_dice {texto}
    L->>G: data_received (con atributos del emisor)
    G->>V: parse_cliente_message(datos, rol, diccionario)
    alt rol ≠ cliente, JSON inválido o texto > 500
        V-->>G: None
        G->>G: descarta y registra el aviso
    else mensaje válido
        V-->>G: mensaje validado
        G->>TTS: say(texto)
        TTS-->>L: audio
        L-->>E: se escucha la voz
    end
    Note over G: TODO(v2): complejizar el texto antes de hablar
```

---

## 8. Secuencia: cliente firma → ejecutivo (señas a voz, v3)

```mermaid
sequenceDiagram
    autonumber
    actor C as Cliente
    participant Cam as Cámara
    participant Sg as packages/signs
    participant W as PWA
    participant L as LiveKit
    participant G as Agente
    participant T as Translator (Claude)
    participant TTS as TTS (ElevenLabs)
    actor E as Ejecutivo

    C->>Cam: hace una seña
    loop cada cuadro
        Cam->>Sg: puntos clave (MediaPipe, en el dispositivo)
    end
    Sg->>Sg: ventana de 30 cuadros → Classifier.predict
    alt confianza < 0,7
        Sg-->>W: nada (no adivina)
    else confianza ≥ 0,7
        Sg-->>W: Recognition {gloss, confidence}
    end
    W->>L: glosas_cliente {glosas, confianza}
    L->>G: data_received
    G->>G: guard: rol, glosas conocidas, topes de tamaño
    G->>T: glosas_a_espanol(glosas)
    T-->>G: frase natural y cortés
    G->>TTS: say(frase)
    TTS-->>E: voz
    Note over Cam,Sg: el video nunca sale del dispositivo
```

---

## 9. Secuencia: ejecutivo → cliente en señas (voz a señas, v4)

```mermaid
sequenceDiagram
    autonumber
    actor E as Ejecutivo
    participant G as Agente
    participant T as Translator (Claude)
    participant Gl as Glossary
    participant W as PWA
    participant P as SignPlayer
    actor C as Cliente

    E->>G: (audio ya transcrito a texto)
    G->>T: espanol_a_glosas(texto)
    T->>T: herramienta emitir_glosas (salida estructurada)
    T->>Gl: validar(glosas, deletrear, subtitulo)
    Gl-->>T: GlossResult (descarta las inexistentes,<br/>deletrea nombres propios)
    T-->>G: glosas + subtítulo
    G->>W: glosas_para_senar {glosas, subtitulo}
    W->>P: play(glosas)
    loop por cada glosa
        P->>P: reproduce el clip y espera una pausa de ~200 ms
    end
    P-->>C: lo ve en señas, con subtítulo en español
    Note over G: TODO(v4): publicar glosas_para_senar desde agent.py
```

---

## 10. Secuencia: llamada saliente por teléfono **(plan)**

```mermaid
sequenceDiagram
    autonumber
    actor C as Cliente
    participant W as PWA
    participant A as API
    participant L as LiveKit SIP
    participant Tw as Twilio
    actor E as Ejecutivo

    C->>W: elige a quién llamar
    W->>A: POST /llamadas {room, numero}
    A->>A: numero en formato E.164 y dentro de ALLOWED_DESTINATIONS
    A->>L: CreateSIPParticipant(room, numero, sip_trunk_id)
    L->>Tw: INVITE (SIP)
    Tw->>E: suena el teléfono
    E-->>Tw: contesta
    Tw-->>L: audio de la llamada
    L-->>W: el ejecutivo es ahora un participante SIP de la sala
    Note over A: Hoy responde 501 (TODO(v1)).<br/>Falta verificar que la sala sea del llamante.
```

---

## 11. Estados: llamada

```mermaid
stateDiagram-v2
    [*] --> SinSala
    SinSala --> ConToken : POST /token
    ConToken --> EnSala : connect() a LiveKit
    EnSala --> Activa : el agente publica estado llamada_iniciada
    Activa --> Activa : mensajes (ejecutivo_dice, cliente_dice, glosas)
    Activa --> Terminada : colgar o desconexión
    EnSala --> Terminada : el token expira (1 hora)
    Terminada --> [*]

    note right of Terminada
        El agente aún no publica
        estado llamada_terminada (TODO)
    end note
```

---

## 12. Estados: reconocimiento de una seña

```mermaid
stateDiagram-v2
    [*] --> Acumulando
    Acumulando --> Acumulando : llega un cuadro (buffer menor a 30)
    Acumulando --> Clasificando : buffer lleno (30 cuadros)
    Clasificando --> Descartada : confianza menor a 0,7
    Clasificando --> Reconocida : confianza mayor o igual a 0,7
    Descartada --> Acumulando : vacía el buffer
    Reconocida --> Acumulando : vacía el buffer y emite la glosa
```

---

## 13. Actividad: validación de mensajes del cliente

```mermaid
flowchart TD
    Start([data_received]) --> R{"¿rol del emisor<br/>== cliente?<br/>(atributo del token)"}
    R -- no --> X1[/descartar/]
    R -- sí --> J{"¿JSON válido<br/>y es un objeto?"}
    J -- no --> X1
    J -- sí --> T{"¿tipo?"}

    T -- cliente_dice --> T1{"¿texto es string,<br/>no vacío y ≤ 500?"}
    T1 -- no --> X1
    T1 -- sí --> OK1[/aceptar → TTS/]

    T -- glosas_cliente --> G1{"¿lista de 1 a 30<br/>glosas string?"}
    G1 -- no --> X1
    G1 -- sí --> G2{"¿cada glosa está en el diccionario<br/>o es DACTILOLOGÍA:A-N-A (≤ 20 letras)?"}
    G2 -- no --> X1
    G2 -- sí --> G3{"¿suma de caracteres ≤ 400?"}
    G3 -- no --> X1
    G3 -- sí --> OK2[/aceptar → Translator → TTS/]

    T -- otro --> X1
```

---

## 14. Despliegue **(plan)**

```mermaid
flowchart TB
    subgraph Disp["Dispositivo del cliente"]
        Nav["Navegador o app Capacitor<br/>PWA + MediaPipe + ONNX"]
    end

    subgraph Vercel["Vercel"]
        Estatico["Sitio estático<br/>apps/web/out"]
    end

    subgraph Fly["Fly.io · región scl"]
        FApi["Máquina: puente-api<br/>FastAPI :8000"]
        FAgent["Máquina: puente-agent<br/>livekit-agents (sin puerto)"]
    end

    subgraph LKC["LiveKit Cloud"]
        Salas["Salas WebRTC"]
        SIP["SIP"]
    end

    Twilio["Twilio<br/>número + trunk SIP"]
    PSTN(["Red telefónica"])
    IA["Anthropic · Deepgram · ElevenLabs"]
    SB[("Supabase<br/>Postgres · Storage · Auth")]

    Nav -- "HTTPS (descarga)" --> Estatico
    Nav -- "HTTPS /token" --> FApi
    Nav <-- "WebRTC + data channel" --> Salas
    FAgent <--> Salas
    FApi -- "firma tokens, CreateSIPParticipant" --> LKC
    SIP <--> Twilio <--> PSTN
    FAgent -- "HTTPS" --> IA
    FApi --> SB
```
