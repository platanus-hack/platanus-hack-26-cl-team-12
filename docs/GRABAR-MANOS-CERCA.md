# Señas con las dos manos juntas o en contacto (GRACIAS, POR-FAVOR, etc.)

**Por qué falla:** WiLoR y MediaPipe detectan cada mano por separado. Cuando una tapa a la otra (palmas juntas, aro pulgar-índice con aro) la caja de detección se fusiona, se pierden dedos y el modelo "inventa" la pose.

## Qué hacer al grabar (de más fácil a más difícil)
1. **Cámara más cerca y más alta resolución:** que las manos ocupen mucho cuadro (de pecho para arriba, no de cuerpo entero). Luz fuerte y de frente, fondo liso, manga larga oscura.
2. **Más lento y con pausa:** llegar al contacto, quedarse ~0,5 s y soltar. Los frames del medio del contacto son los malos; la pausa da frames limpios.
3. **Cámara ligeramente de costado (~30°) o desde arriba** solo para estas señas, para que una mano no tape a la otra. Ojo: el giro de cámara cambia la orientación de la muñeca; hay que compensarlo o grabar también de frente.
4. **Más tomas (5 en vez de 3)** y que `fuse_takes.py` descarte las malas (`--takes 2 4`).

## Plan B (el que recomiendo para las que sigan mal): mezcla video + formas de mano prefabricadas
Brazos y muñecas salen del video (eso suele salir bien), pero la **forma de los dedos** se fija con presets: *palma plana*, *aro pulgar-índice*, *puño*, *índice apuntando*, etc., con tiempos de inicio y fin por seña. Así "palmas juntas" y "gracias" no dependen de que el detector vea los dedos tapados. Pendiente de construir (editor de keyframes de formas de mano).
