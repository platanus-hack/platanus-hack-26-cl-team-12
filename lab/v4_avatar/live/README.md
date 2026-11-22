# Avatar en vivo (webcam → VRM)
Prueba local del paso 1 de v4. Corre: `cd lab/v4_avatar/live && python3 -m http.server 8765` y abre http://localhost:8765.
Modelo: `models/avatar.vrm` (sample de pixiv/three-vrm, no versionado). Descarga:
`curl -L -o models/avatar.vrm https://raw.githubusercontent.com/pixiv/three-vrm/dev/packages/three-vrm/examples/models/VRM1_Constraint_Twist_Sample.vrm`
Stack: three 0.160 + @pixiv/three-vrm 3 + MediaPipe tasks-vision (Pose + Hands) + Kalidokit. Todo en el navegador.
