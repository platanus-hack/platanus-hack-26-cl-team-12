# Registro de costos de herramientas

> Fuente de verdad del costo actual y futuro. Revisión mensual (issue automático `costos-mensual`).
> Los límites cambian: verifica siempre en la página oficial de pricing y actualiza "Última verificación".

| Herramienta | Uso | Plan actual | Límite gratuito (verificar) | Qué dispara un cobro | Cómo monitorear | Alternativa si se cobra | Última verificación |
|---|---|---|---|---|---|---|---|
| GitHub (repo) | Código, PRs, Projects | Free | Repos privados ilimitados; rulesets/Environments con reviewers solo en públicos | Pasar a Team (por usuario/mes) | Settings → Billing | Repo público / GitHub Education | AAAA-MM-DD |
| GitHub Actions | CI/CD | Free | Públicos: ilimitado. Privados: 2.000 min/mes | Exceder minutos con método de pago y spending limit > 0 | `gh api /users/OWNER/settings/billing/usage` | Mantener spending limit en 0, runners self-hosted | AAAA-MM-DD |
| Dependabot | Dependencias | Free | Incluido | — | — | Renovate (gratis) | AAAA-MM-DD |
| gitleaks / Semgrep CE / osv-scanner | Seguridad | OSS | Ilimitado (CLI) | Usar versiones comerciales (Semgrep AppSec Platform, gitleaks-action en orgs) | — | Trivy | AAAA-MM-DD |
| release-please | Versionamiento | OSS | Ilimitado | — | — | semantic-release | AAAA-MM-DD |
| Hosting front (p.ej. Vercel Hobby) | Front | Hobby | Uso **no comercial**; límites de ancho de banda y builds | Uso comercial → Pro; exceder límites | Dashboard del proveedor | Cloudflare Pages / GitHub Pages | AAAA-MM-DD |
| Hosting back (p.ej. Render free) | API | Free | Instancia se duerme por inactividad; horas/mes limitadas | Instancia paga para evitar sleep | Dashboard del proveedor | Cloud Run free tier, Fly.io | AAAA-MM-DD |
| Base de datos (p.ej. Supabase/Neon free) | BD dev y prod (separadas) | Free | Almacenamiento limitado; pausa por inactividad | Exceder almacenamiento/compute | Dashboard del proveedor | Postgres en Docker local para dev | AAAA-MM-DD |
| API de IA (si aplica) | LLM | Pago por uso / créditos | Créditos de la hackatón | Tokens consumidos | Alertas de gasto del proveedor | Modelos más pequeños, caché | AAAA-MM-DD |

## Reglas
1. Ningún servicio con tarjeta asociada sin fila aquí y **sin límite o alerta de gasto** configurado en el proveedor.
2. Credenciales de cada servicio solo en GitHub Environments / gestor de secretos, nunca en el repo.
3. Si un servicio guarda datos personales, registrar región y encargado en `docs/DATOS-PERSONALES.md` (transferencia internacional, art. 27 Ley 19.628).
