/* Motor de voz de Tramaviva: Piper (voces neuronales) ejecutado en el navegador.
   Voces: español (carlfm) e inglés de EE. UU. (lessac). Los pesos grandes vienen en int8 por canal
   y se reconstruyen en fp32 aquí, dentro del propio grafo; todo se carga desde los archivos propios de la página. */
window.VozTV = (() => {
  const base = new URL('tts/', document.baseURI).href;
  const VOICES = {
    es: { name: 'voz-es', size: 6400000 },
    en: { name: 'voz-en', size: 19100000 }
  };
  const COMMON = 10595041 + 11944172 + 635212;
  let common = null, phonData = null, phonWasm = null;
  const loaded = {}; // lang -> {session, cfg}
  const pending = {};

  const loadScript = src => new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src; s.onload = res; s.onerror = () => rej(new Error('No se pudo cargar ' + src));
    document.head.appendChild(s);
  });

  /* Los archivos grandes van partidos en trozos de 4 MB (archivo.part1, .part2…) para poder subirlos
     a GitHub desde la web. Si no hay trozos, se descarga el archivo entero, como antes. */
  const PARTS = { 'ort-wasm-simd.wasm': 3, 'piper_phonemize.data.gz.b64.txt': 3, 'voz-en.w.b64.txt': 5, 'voz-es.w.b64.txt': 2 };
  async function fetchBuf(url, tick) {
    const n = PARTS[url.split('/').pop()];
    if (n) {
      let parts = null;
      try { parts = []; for (let i = 1; i <= n; i++) parts.push(await fetchOne(url + '.part' + i, tick)); }
      catch (e) { if (parts && parts.length) throw e; parts = null; }
      if (parts) { const out = new Uint8Array(parts.reduce((a, p) => a + p.length, 0)); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; } return out; }
    }
    return fetchOne(url, tick);
  }

  async function fetchOne(url, tick) {
    const r = await fetch(url);
    if (!r.ok) throw new Error('Descarga fallida: ' + url + ' (' + r.status + ')');
    if (!r.body || !tick) return new Uint8Array(await r.arrayBuffer());
    const reader = r.body.getReader(), chunks = []; let n = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value); n += value.length; tick(value.length);
    }
    const out = new Uint8Array(n); let o = 0;
    for (const c of chunks) { out.set(c, o); o += c.length; }
    return out;
  }

  /* texto base64 de un gzip -> bytes */
  async function fetchPacked(url, tick) {
    const txt = new TextDecoder().decode(await fetchBuf(url, tick)).trim();
    const bin = atob(txt);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const ds = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Uint8Array(await new Response(ds).arrayBuffer());
  }

  /* rellena los pesos (a cero en el grafo) con los int8 por canal reconstruidos en fp32 */
  function rebuild(idx, packed, graph) {
    for (const e of idx.t) {
      if (e.k === 'r') { graph.set(packed.subarray(e.p, e.p + e.b), e.o); continue; }
      const per = e.n / e.c;
      const sc = new Float32Array(packed.slice(e.p, e.p + e.c * 4).buffer);
      const q = new Int8Array(packed.buffer, packed.byteOffset + e.p + e.c * 4, e.n);
      const dst = new Float32Array(e.n);
      for (let ch = 0, k = 0; ch < e.c; ch++) { const s = sc[ch]; for (let j = 0; j < per; j++, k++) dst[k] = q[k] * s; }
      graph.set(new Uint8Array(dst.buffer), e.o);
    }
    return graph;
  }

  function sizeOf(lang) { return (common ? 0 : COMMON) + (VOICES[lang] || VOICES.es).size; }

  function init(onProgress, lang = 'es') {
    if (!VOICES[lang]) lang = 'es';
    if (loaded[lang]) { onProgress && onProgress(1); return Promise.resolve(); }
    if (pending[lang]) return pending[lang];
    const total = sizeOf(lang); let got = 0;
    const tick = n => { got += n; onProgress && onProgress(Math.min(0.99, got / total)); };
    pending[lang] = (async () => {
      if (!common) common = (async () => {
        await loadScript(base + 'ort.wasm.min.js');
        await loadScript(base + 'piper_phonemize.js');
        ort.env.wasm.numThreads = 1;
        ort.env.wasm.proxy = false;
        const ortWasm = await fetchBuf(base + 'ort-wasm-simd.wasm', tick);
        ort.env.wasm.wasmBinary = ortWasm.buffer;
        /* ONNX Runtime vuelve a pedir el .wasm por su ruta: se le da el ya descargado (y unido) como blob */
        ort.env.wasm.wasmPaths = { 'ort-wasm-simd.wasm': URL.createObjectURL(new Blob([ortWasm], { type: 'application/wasm' })) };
        phonWasm = (await fetchBuf(base + 'piper_phonemize.wasm', tick)).buffer;
        phonData = (await fetchPacked(base + 'piper_phonemize.data.gz.b64.txt', tick)).buffer;
      })();
      try { await common; } catch (e) { common = null; throw e; }
      const v = VOICES[lang];
      const cfg = await (await fetch(base + v.name + '.json')).json();
      const idx = await (await fetch(base + v.name + '.idx.json')).json();
      const graph = await fetchPacked(base + v.name + '.graph.b64.txt', tick);
      const packed = await fetchPacked(base + v.name + '.w.b64.txt', tick);
      const session = await ort.InferenceSession.create(rebuild(idx, packed, graph), { executionProviders: ['wasm'] });
      loaded[lang] = { session, cfg };
      onProgress && onProgress(1);
    })();
    pending[lang].catch(() => { delete pending[lang]; });
    return pending[lang];
  }

  function phonemize(texts, voice) {
    return new Promise((resolve, reject) => {
      const out = [];
      createPiperPhonemize({
        print: d => { try { out.push(JSON.parse(d).phoneme_ids); } catch (e) { /* línea no JSON */ } },
        printErr: () => {},
        wasmBinary: phonWasm,
        getPreloadedPackage: () => phonData,
        locateFile: u => base + u,
        noInitialRun: true
      }).then(m => {
        try {
          m.callMain(['-l', voice, '--input', JSON.stringify(texts.map(t => ({ text: t }))), '--espeak_data', '/espeak-ng-data']);
        } catch (e) { if (!(e && (e.name === 'ExitStatus' || 'status' in e))) { reject(e); return; } }
        resolve(out);
      }, reject);
    });
  }

  /* Texto -> Float32Array (PCM mono). rate 1 = normal. */
  async function synth(text, rate = 1, lang = 'es') {
    if (!VOICES[lang]) lang = 'es';
    await init(null, lang);
    const { session, cfg } = loaded[lang];
    const idsList = await phonemize(splitText(text), cfg.espeak.voice);
    const pcms = [], inf = cfg.inference;
    for (const ids of idsList) {
      if (!ids || !ids.length) continue;
      const feeds = {
        input: new ort.Tensor('int64', BigInt64Array.from(ids.map(BigInt)), [1, ids.length]),
        input_lengths: new ort.Tensor('int64', BigInt64Array.from([BigInt(ids.length)]), [1]),
        scales: new ort.Tensor('float32', Float32Array.from([inf.noise_scale, inf.length_scale / rate, inf.noise_w]), [3])
      };
      const res = await session.run(feeds);
      pcms.push(res.output.data);
      pcms.push(new Float32Array(Math.round(cfg.audio.sample_rate * 0.12)));
    }
    const len = pcms.reduce((a, b) => a + b.length, 0);
    const out = new Float32Array(len); let o = 0;
    for (const p of pcms) { out.set(p, o); o += p.length; }
    return { pcm: out, sampleRate: cfg.audio.sample_rate };
  }

  function splitText(t) {
    const s = t.replace(/\s+/g, ' ').trim();
    if (s.length <= 380) return [s];
    const parts = []; let cur = '';
    for (const frag of s.split(/(?<=[.!?;:,])\s+/)) {
      if ((cur + ' ' + frag).length > 380 && cur) { parts.push(cur); cur = frag; }
      else cur = cur ? cur + ' ' + frag : frag;
    }
    if (cur) parts.push(cur);
    return parts;
  }

  return { init, synth, sizeMB: lang => Math.round(sizeOf(lang) / 1e6), isLoaded: lang => !!loaded[lang || 'es'], get loaded() { return !!loaded.es; } };
})();
