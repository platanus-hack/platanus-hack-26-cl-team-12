# Iconos de AWS para diseñar la arquitectura

> ⚠️ **Puente no corre en AWS.** Hoy el plan usa Vercel, Fly.io, LiveKit Cloud, Supabase y proveedores de IA
> ([`ARQUITECTURA.md`](ARQUITECTURA.md)). Este archivo sirve para **dibujar** la arquitectura con iconos de AWS
> (por ejemplo, para el pitch o para una versión "si lo montáramos en AWS"), no cambia nada del despliegue.

## Qué hay en esta carpeta

`docs/diagramas/iconos-aws/` tiene **63 logos en SVG** (galería al final). Sirven para arrastrarlos a draw.io, Excalidraw,
Figma, Canva o PowerPoint. Todos tienen alto 64 px y mantienen su proporción.

**Límites que debes conocer:**
- Vienen del set comunitario [Iconify `logos`](https://icon-sets.iconify.design/logos/), **no** del paquete oficial *AWS Architecture Icons*.
  Se ven parecidos, pero no son idénticos a los de los diagramas oficiales de AWS.
- **Faltan justo los servicios que equivaldrían a tu arquitectura:** Amazon Transcribe, Polly, Bedrock, Connect, Chime SDK y ECR.
  Tampoco hay los contenedores de grupo (Región, VPC, subred, nube de AWS).
- Son marcas de sus dueños. Si los vas a publicar, revisa las [pautas de uso de AWS](https://aws.amazon.com/architecture/icons/).

### Para un resultado profesional: el paquete oficial
1. Entra a <https://aws.amazon.com/architecture/icons/> y descarga el **Asset Package** (un `.zip`).
2. Trae iconos de servicios, de recursos, de categorías y los **grupos** (Región, VPC, etc.) en SVG y PNG.
3. En **draw.io** también hay librerías de AWS integradas: *Más formas* (+) → marca *AWS*.

No incluí el paquete oficial en el repo: pesa varios MB y conviene bajarlo siempre en su versión vigente.

## Cómo se vería Puente en AWS

Equivalencias aproximadas (no están probadas; verifica disponibilidad y precios antes de decidir):

| Pieza de Puente | Hoy | Equivalente en AWS | Icono en esta carpeta |
|---|---|---|---|
| PWA estática | Vercel | S3 + CloudFront (o Amplify Hosting) | `s3`, `cloudfront`, `amplify` |
| DNS y HTTPS | Vercel / Fly | Route 53 + Certificate Manager | `route53`, `certificate-manager` |
| API (FastAPI) | Fly.io | ECS sobre Fargate detrás de un ELB, o API Gateway + Lambda | `ecs`, `fargate`, `elb`, `api-gateway`, `lambda` |
| Agente traductor (proceso largo, sin puerto) | Fly.io | ECS sobre Fargate (servicio sin balanceador) | `ecs`, `fargate` |
| Salas WebRTC | LiveKit Cloud | Sin gestionado equivalente 1 a 1: LiveKit autohospedado en EC2/EKS, o Amazon Chime SDK | `ec2`, `eks` (Chime: falta) |
| Telefonía (SIP/PSTN) | Twilio | Amazon Connect o Chime SDK Voice Connector | **falta** |
| Voz a texto | Deepgram | Amazon Transcribe (verifica el soporte de español de Chile) | **falta** |
| Texto a voz | ElevenLabs | Amazon Polly (verifica si hay voz chilena) | **falta** |
| LLM del traductor | API de Anthropic | Amazon Bedrock (verifica disponibilidad del modelo) | **falta** |
| Base de datos | Supabase Postgres | RDS para PostgreSQL o Aurora | `rds`, `aurora` |
| Archivos (clips, modelos ONNX) | Supabase Storage | S3 | `s3` |
| Autenticación | Supabase Auth | Cognito | `cognito` |
| Secretos | Variables de Fly | Secrets Manager / Systems Manager | `secrets-manager`, `systems-manager` |
| Logs y métricas | Logs del proceso | CloudWatch (+ X-Ray para trazas) | `cloudwatch`, `xray` |
| CI/CD | GitHub Actions + push | CodePipeline y CodeBuild (o seguir con Actions) | `codepipeline`, `codebuild` |
| Protección de `/token` | — | WAF (límite de tasa) y Shield | `waf`, `shield` |
| Desacoplar eventos | — | SQS, SNS o EventBridge | `sqs`, `sns`, `eventbridge` |

> El **WAF con límite de tasa** resolvería parte del requerimiento A4 del plan (`/token` sin límite es un riesgo de costo).

## Diagrama ya hecho: Puente en AWS

![Puente en AWS](diagramas/arquitectura/04-puente-en-aws.png)

[`04-puente-en-aws.png`](diagramas/arquitectura/04-puente-en-aws.png) (3840×2160, para slides) y su fuente
[`04-puente-en-aws.svg`](diagramas/arquitectura/04-puente-en-aws.svg) (íconos incrustados: se abre en draw.io, Figma o el navegador).
Es una **propuesta**: la API pasa a ECS Fargate detrás de WAF y ALB, la PWA a S3 + CloudFront, y Twilio, Claude y ElevenLabs
quedan como servicios externos. Los logos de Twilio, Anthropic y ElevenLabs vienen de Iconify (`logos`, `simple-icons`).

## Consejos para el diagrama
- Una sola dirección de lectura: **izquierda → derecha** (cliente → teléfono/IA → datos).
- Distingue con color o línea punteada lo **implementado** de lo **plan**, como en [`UML.md`](UML.md).
- Etiqueta cada flecha con el protocolo o el mensaje (`HTTPS`, `WebRTC`, `SIP`, `ejecutivo_dice`).
- Los diagramas ya hechos en Mermaid están en [`UML.md`](UML.md) y [`ARQUITECTURA.md`](ARQUITECTURA.md): sirven de borrador.

## Galería (63 iconos)

| Icono | Archivo |
|---|---|
| <img src="diagramas/iconos-aws/amplify.svg" alt="amplify" height="40"> | `amplify.svg` |
| <img src="diagramas/iconos-aws/api-gateway.svg" alt="api-gateway" height="40"> | `api-gateway.svg` |
| <img src="diagramas/iconos-aws/app-mesh.svg" alt="app-mesh" height="40"> | `app-mesh.svg` |
| <img src="diagramas/iconos-aws/appflow.svg" alt="appflow" height="40"> | `appflow.svg` |
| <img src="diagramas/iconos-aws/appsync.svg" alt="appsync" height="40"> | `appsync.svg` |
| <img src="diagramas/iconos-aws/athena.svg" alt="athena" height="40"> | `athena.svg` |
| <img src="diagramas/iconos-aws/aurora.svg" alt="aurora" height="40"> | `aurora.svg` |
| <img src="diagramas/iconos-aws/aws.svg" alt="aws" height="40"> | `aws.svg` |
| <img src="diagramas/iconos-aws/backup.svg" alt="backup" height="40"> | `backup.svg` |
| <img src="diagramas/iconos-aws/batch.svg" alt="batch" height="40"> | `batch.svg` |
| <img src="diagramas/iconos-aws/certificate-manager.svg" alt="certificate-manager" height="40"> | `certificate-manager.svg` |
| <img src="diagramas/iconos-aws/cloudformation.svg" alt="cloudformation" height="40"> | `cloudformation.svg` |
| <img src="diagramas/iconos-aws/cloudfront.svg" alt="cloudfront" height="40"> | `cloudfront.svg` |
| <img src="diagramas/iconos-aws/cloudsearch.svg" alt="cloudsearch" height="40"> | `cloudsearch.svg` |
| <img src="diagramas/iconos-aws/cloudtrail.svg" alt="cloudtrail" height="40"> | `cloudtrail.svg` |
| <img src="diagramas/iconos-aws/cloudwatch.svg" alt="cloudwatch" height="40"> | `cloudwatch.svg` |
| <img src="diagramas/iconos-aws/codebuild.svg" alt="codebuild" height="40"> | `codebuild.svg` |
| <img src="diagramas/iconos-aws/codecommit.svg" alt="codecommit" height="40"> | `codecommit.svg` |
| <img src="diagramas/iconos-aws/codedeploy.svg" alt="codedeploy" height="40"> | `codedeploy.svg` |
| <img src="diagramas/iconos-aws/codepipeline.svg" alt="codepipeline" height="40"> | `codepipeline.svg` |
| <img src="diagramas/iconos-aws/codestar.svg" alt="codestar" height="40"> | `codestar.svg` |
| <img src="diagramas/iconos-aws/cognito.svg" alt="cognito" height="40"> | `cognito.svg` |
| <img src="diagramas/iconos-aws/config.svg" alt="config" height="40"> | `config.svg` |
| <img src="diagramas/iconos-aws/documentdb.svg" alt="documentdb" height="40"> | `documentdb.svg` |
| <img src="diagramas/iconos-aws/dynamodb.svg" alt="dynamodb" height="40"> | `dynamodb.svg` |
| <img src="diagramas/iconos-aws/ec2.svg" alt="ec2" height="40"> | `ec2.svg` |
| <img src="diagramas/iconos-aws/ecs.svg" alt="ecs" height="40"> | `ecs.svg` |
| <img src="diagramas/iconos-aws/eks.svg" alt="eks" height="40"> | `eks.svg` |
| <img src="diagramas/iconos-aws/elastic-beanstalk.svg" alt="elastic-beanstalk" height="40"> | `elastic-beanstalk.svg` |
| <img src="diagramas/iconos-aws/elasticache.svg" alt="elasticache" height="40"> | `elasticache.svg` |
| <img src="diagramas/iconos-aws/elb.svg" alt="elb" height="40"> | `elb.svg` |
| <img src="diagramas/iconos-aws/eventbridge.svg" alt="eventbridge" height="40"> | `eventbridge.svg` |
| <img src="diagramas/iconos-aws/fargate.svg" alt="fargate" height="40"> | `fargate.svg` |
| <img src="diagramas/iconos-aws/glacier.svg" alt="glacier" height="40"> | `glacier.svg` |
| <img src="diagramas/iconos-aws/glue.svg" alt="glue" height="40"> | `glue.svg` |
| <img src="diagramas/iconos-aws/iam.svg" alt="iam" height="40"> | `iam.svg` |
| <img src="diagramas/iconos-aws/keyspaces.svg" alt="keyspaces" height="40"> | `keyspaces.svg` |
| <img src="diagramas/iconos-aws/kinesis.svg" alt="kinesis" height="40"> | `kinesis.svg` |
| <img src="diagramas/iconos-aws/kms.svg" alt="kms" height="40"> | `kms.svg` |
| <img src="diagramas/iconos-aws/lake-formation.svg" alt="lake-formation" height="40"> | `lake-formation.svg` |
| <img src="diagramas/iconos-aws/lambda.svg" alt="lambda" height="40"> | `lambda.svg` |
| <img src="diagramas/iconos-aws/lightsail.svg" alt="lightsail" height="40"> | `lightsail.svg` |
| <img src="diagramas/iconos-aws/mq.svg" alt="mq" height="40"> | `mq.svg` |
| <img src="diagramas/iconos-aws/msk.svg" alt="msk" height="40"> | `msk.svg` |
| <img src="diagramas/iconos-aws/neptune.svg" alt="neptune" height="40"> | `neptune.svg` |
| <img src="diagramas/iconos-aws/open-search.svg" alt="open-search" height="40"> | `open-search.svg` |
| <img src="diagramas/iconos-aws/opsworks.svg" alt="opsworks" height="40"> | `opsworks.svg` |
| <img src="diagramas/iconos-aws/quicksight.svg" alt="quicksight" height="40"> | `quicksight.svg` |
| <img src="diagramas/iconos-aws/rds.svg" alt="rds" height="40"> | `rds.svg` |
| <img src="diagramas/iconos-aws/redshift.svg" alt="redshift" height="40"> | `redshift.svg` |
| <img src="diagramas/iconos-aws/route53.svg" alt="route53" height="40"> | `route53.svg` |
| <img src="diagramas/iconos-aws/s3.svg" alt="s3" height="40"> | `s3.svg` |
| <img src="diagramas/iconos-aws/secrets-manager.svg" alt="secrets-manager" height="40"> | `secrets-manager.svg` |
| <img src="diagramas/iconos-aws/ses.svg" alt="ses" height="40"> | `ses.svg` |
| <img src="diagramas/iconos-aws/shield.svg" alt="shield" height="40"> | `shield.svg` |
| <img src="diagramas/iconos-aws/sns.svg" alt="sns" height="40"> | `sns.svg` |
| <img src="diagramas/iconos-aws/sqs.svg" alt="sqs" height="40"> | `sqs.svg` |
| <img src="diagramas/iconos-aws/step-functions.svg" alt="step-functions" height="40"> | `step-functions.svg` |
| <img src="diagramas/iconos-aws/systems-manager.svg" alt="systems-manager" height="40"> | `systems-manager.svg` |
| <img src="diagramas/iconos-aws/timestream.svg" alt="timestream" height="40"> | `timestream.svg` |
| <img src="diagramas/iconos-aws/vpc.svg" alt="vpc" height="40"> | `vpc.svg` |
| <img src="diagramas/iconos-aws/waf.svg" alt="waf" height="40"> | `waf.svg` |
| <img src="diagramas/iconos-aws/xray.svg" alt="xray" height="40"> | `xray.svg` |
