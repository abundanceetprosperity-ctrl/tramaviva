# Tramaviva

De un guion a un vídeo de YouTube terminado, todo en el navegador: escenas, voz, música, subtítulos, clips de Pexels y Pixabay, y paquete de publicación (título, descripción con capítulos, etiquetas, subtítulos .srt y miniatura).

Es una web estática: no necesita servidor ni base de datos. Los proyectos se guardan en el navegador de cada persona.

## Qué hace

1. **Guion**: escribes o pegas el guion. Las líneas que empiezan por `##` son capítulos. Tramaviva lo parte en escenas por frases o por tiempo.
2. **Voz y estilo**: voz Tramaviva en español o inglés (se genera en el navegador), tu propia narración o tu voz escena por escena. Música de fondo compuesta en el navegador o tu canción, con bajada automática bajo la voz. Formato horizontal o vertical, subtítulos y siete estilos visuales.
3. **Escenas**: busca y coloca fotos o vídeos de **Pexels** y **Pixabay** sin salir de la app (con el crédito del autor), sube tus archivos o un ZIP numerado de Flow, añade, une, ordena y revisa escenas.
4. **Exportar**: crea el vídeo MP4 en tu ordenador y descarga el paquete de YouTube.

En «Mis proyectos» puedes guardar una copia `.zip` de un proyecto y abrirla en otro navegador u ordenador.

## Claves de Pexels y Pixabay

La búsqueda dentro de la app usa las API gratuitas de los dos bancos. Cada persona pega sus claves en la ventana de búsqueda; se guardan solo en su navegador y nunca van en el código ni en las copias del proyecto.

- Pexels: https://www.pexels.com/api/
- Pixabay: https://pixabay.com/api/docs/

## Funciones de IA

Escribir el guion con IA, la biblia visual, los dibujos de las escenas y las sugerencias de búsqueda usan Claude y solo aparecen cuando Tramaviva se abre como artifact de Claude. En la versión web esos botones se ocultan y el resto funciona igual.

## Publicar en GitHub Pages

1. Sube el contenido de esta carpeta a un repositorio de GitHub.
2. En el repositorio: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, rama `main`, carpeta `/ (root)`.
3. En uno o dos minutos la web estará en `https://TU-USUARIO.github.io/NOMBRE-DEL-REPO/`.

Para probarla en tu ordenador:

```bash
python3 -m http.server 8765
```

y abre http://localhost:8765

## Estructura

- `index.html`: toda la aplicación.
- `lib/`: JSZip (paquetes .zip) y mp4-muxer (vídeo MP4).
- `tts/`: motor de voz (ONNX Runtime Web, Piper, eSpeak NG) y las dos voces comprimidas. Los cuatro archivos más grandes van partidos en trozos de 4 MB (`.part1`, `.part2`…) para poder subirlos desde la web de GitHub; `tts/voz.js` los vuelve a unir al cargar.

## Créditos y licencias de terceros

- Voces «carlfm» (español) y «lessac» (inglés) de [Piper](https://github.com/rhasspy/piper), licencia MIT.
- [eSpeak NG](https://github.com/espeak-ng/espeak-ng) mediante [piper-phonemize](https://github.com/rhasspy/piper-phonemize), licencia GPL-3.0.
- [ONNX Runtime Web](https://github.com/microsoft/onnxruntime), licencia MIT.
- [mp4-muxer](https://github.com/Vanilagy/mp4-muxer), licencia MIT.
- [JSZip](https://github.com/Stuk/jszip), licencia MIT o GPL-3.0.
- Fotos y vídeos de [Pexels](https://www.pexels.com/license/) y [Pixabay](https://pixabay.com/service/license-summary/), según sus licencias.
