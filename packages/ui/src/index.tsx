// @puente/ui — componentes por defecto de Puente (WCAG 2.2 AA; avisos visuales en vez de sonoros).
// Estilos: importa "@puente/ui/src/styles/tokens.css" y luego "@puente/ui/src/styles/components.css".
// Guía de uso: packages/ui/README.md (es el mismo contenido del artefacto "Puente Design System").

export { Logo } from "./components/Logo";
export { Icon, iconNames, type IconName } from "./components/Icon";
export { Button, type ButtonProps } from "./components/Button";
export { CallStatus, formatDuration, type CallState } from "./components/CallStatus";
export { VisualAlert, type AlertTone } from "./components/VisualAlert";
export { Subtitles, type SubtitleLine } from "./components/Subtitles";
export { QuickReplies, DEFAULT_REPLIES } from "./components/QuickReplies";
export { Composer, type ComposerProps } from "./components/Composer";
export { GlossChip, type GlossState } from "./components/GlossChip";
export { SignCamera, type SignCameraProps } from "./components/SignCamera";
export { SignAvatar, type SignAvatarProps } from "./components/SignAvatar";
export { default as tokens } from "./tokens.json";
