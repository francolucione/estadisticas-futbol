// Baja la lista de videos del canal de Gallo League y la deja en
// src/app/core/data/videos.json. Se corre a mano cuando se sube un video:
//
//   node scripts/videos-canal.mjs
//
// YouTube no da la lista sin API key, asi que se lee el ytInitialData de la
// pagina /videos y se siguen las continuaciones por el endpoint interno
// (youtubei/v1/browse), que es lo mismo que hace la pagina al scrollear.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const CANAL = 'https://www.youtube.com/@lucio-mt4sl/videos';
const DESTINO = fileURLToPath(new URL('../src/app/core/data/videos.json', import.meta.url));

const cabeceras = { 'Accept-Language': 'es-AR,es;q=0.9', 'User-Agent': 'Mozilla/5.0' };

function recorrer(nodo, videos, tokens) {
  if (Array.isArray(nodo)) {
    for (const x of nodo) recorrer(x, videos, tokens);
    return;
  }
  if (!nodo || typeof nodo !== 'object') return;

  if (nodo.lockupViewModel) {
    const l = nodo.lockupViewModel;
    const titulo = l.metadata?.lockupMetadataViewModel?.title?.content;
    const duracion = JSON.stringify(l.contentImage ?? {}).match(/"text":"(\d{1,2}(?::\d{2}){1,2})"/)?.[1];
    if (l.contentId && titulo) videos.push({ youtubeId: l.contentId, titulo, duracion });
  }
  if (nodo.continuationCommand?.token) tokens.push(nodo.continuationCommand.token);
  for (const v of Object.values(nodo)) recorrer(v, videos, tokens);
}

function segundos(hms) {
  if (!hms) return 0;
  return hms.split(':').reduce((acc, n) => acc * 60 + Number(n), 0);
}

/** Interpreta el titulo: las fechas 1-47 (2023-24) traen numero y marcador, las 2025 numero y dia. */
export function interpretar({ youtubeId, titulo, duracion }) {
  const video = { youtubeId, titulo, duracionSeg: segundos(duracion) };

  const fecha = titulo.match(/Fecha N.\s*(\d+):?\s*(Azules|Naranjas)\s+(\d+)\s*-\s*(\d+)\s+(Azules|Naranjas)/i);
  if (fecha) {
    const [, id, eqA, golesA, golesB] = fecha;
    const primero = eqA.toLowerCase().startsWith('azul') ? 'azul' : 'naranja';
    const a = Number(golesA);
    const b = Number(golesB);
    // Algunos titulos traen el dia real: "(Gallo 03-10-23)". El JSON no lo tiene.
    const dia = titulo.match(/Gallo\s+(\d{1,2})-(\d{1,2})-(\d{2})/);
    return {
      ...video,
      temporada: '2023-24',
      fechaId: Number(id),
      ...(dia && { fechaReal: `20${dia[3]}-${dia[2].padStart(2, '0')}-${dia[1].padStart(2, '0')}` }),
      marcadorTitulo: primero === 'azul' ? { azul: a, naranja: b } : { naranja: a, azul: b },
    };
  }

  const nueva = titulo.match(/#\s*(\d+)\s*\(\s*(\d{1,2})[-/](\d{1,2})[-/](\d{2})\s*\)/);
  if (nueva) {
    const [, numero, d, m, a] = nueva;
    const dia = `20${a}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    return { ...video, temporada: '2025', numero: Number(numero), fechaReal: dia };
  }

  return { ...video, temporada: 'especial' };
}

async function main() {
  const html = await (await fetch(CANAL, { headers: cabeceras })).text();
  const inicial = JSON.parse(html.match(/var ytInitialData = (\{.*?\});<\/script>/s)[1]);
  const clave = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/)[1];
  const version = html.match(/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/)[1];

  const crudos = [];
  let tokens = [];
  recorrer(inicial, crudos, tokens);

  const vistos = new Set();
  // Las continuaciones de la grilla de videos: se piden hasta que no quede ninguna nueva.
  while (tokens.length) {
    const token = tokens.shift();
    if (vistos.has(token)) continue;
    vistos.add(token);
    const r = await fetch(`https://www.youtube.com/youtubei/v1/browse?key=${clave}`, {
      method: 'POST',
      headers: { ...cabeceras, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        context: { client: { clientName: 'WEB', clientVersion: version, hl: 'es' } },
        continuation: token,
      }),
    });
    const nuevos = [];
    const siguientes = [];
    recorrer(await r.json(), nuevos, siguientes);
    if (!nuevos.length) continue;
    crudos.push(...nuevos);
    tokens.push(...siguientes);
  }

  const porId = new Map();
  for (const v of crudos) if (!porId.has(v.youtubeId)) porId.set(v.youtubeId, interpretar(v));
  const videos = [...porId.values()];

  const orden = { '2025': 0, especial: 1, '2023-24': 2 };
  videos.sort(
    (a, b) =>
      orden[a.temporada] - orden[b.temporada] ||
      (b.numero ?? b.fechaId ?? 0) - (a.numero ?? a.fechaId ?? 0)
  );

  writeFileSync(DESTINO, JSON.stringify(videos, null, 2) + '\n');
  const cuenta = (t) => videos.filter((v) => v.temporada === t).length;
  console.log(
    `${videos.length} videos: ${cuenta('2023-24')} de 2023-24, ${cuenta('2025')} de 2025, ${cuenta('especial')} especiales`
  );
  const sinDuracion = videos.filter((v) => !v.duracionSeg);
  if (sinDuracion.length) console.warn('Sin duracion:', sinDuracion.map((v) => v.titulo).join(' | '));
}

main();
