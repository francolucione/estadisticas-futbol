// Pruebas de firestore.rules contra el emulador. Se corren con:
//
//   npm run test:reglas
//
// que levanta el emulador de Firestore, corre esto con `node --test` y lo apaga.
import { after, before, beforeEach, describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, increment, serverTimestamp, setDoc, writeBatch, getDoc } from 'firebase/firestore';

let env;

before(async () => {
  const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8081').split(':');
  env = await initializeTestEnvironment({
    projectId: 'gallo-league-test',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host, port: Number(port) },
  });
});

after(() => env.cleanup());
beforeEach(() => env.clearFirestore());

const lucio = () => env.authenticatedContext('uid-lucio').firestore();
const adri = () => env.authenticatedContext('uid-adri').firestore();
const anonimo = () => env.unauthenticatedContext().firestore();

function evento(uid, extra = {}) {
  return {
    videoId: 'abc123',
    t: 83,
    categoriaId: 'cordones',
    jugador: 'Adri R',
    autorUid: uid,
    autorNombre: 'Lucio',
    creado: serverTimestamp(),
    ...extra,
  };
}

/** El batch que arma la app: el evento y su contador, juntos. */
function anotar(db, id, ev, delta = 1) {
  const b = writeBatch(db);
  b.set(doc(db, 'eventos', id), ev);
  b.set(
    doc(db, 'contadores', 'global'),
    {
      categorias: { [ev.categoriaId]: { total: increment(delta), porJugador: { [ev.jugador]: increment(delta) } } },
      porVideo: { [ev.videoId]: increment(delta) },
      ultimoEvento: id,
    },
    { merge: true }
  );
  return b.commit();
}

function borrar(db, id, ev) {
  const b = writeBatch(db);
  b.delete(doc(db, 'eventos', id));
  b.set(
    doc(db, 'contadores', 'global'),
    {
      categorias: { [ev.categoriaId]: { total: increment(-1), porJugador: { [ev.jugador]: increment(-1) } } },
      porVideo: { [ev.videoId]: increment(-1) },
      ultimoEvento: id,
    },
    { merge: true }
  );
  return b.commit();
}

describe('eventos', () => {
  it('logueado, con su contador: pasa', async () => {
    await assertSucceeds(anotar(lucio(), 'e1', evento('uid-lucio')));
    const g = await getDoc(doc(lucio(), 'contadores', 'global'));
    if (g.data().categorias.cordones.porJugador['Adri R'] !== 1) throw new Error('el contador no quedo en 1');
  });

  it('dos seguidos acumulan', async () => {
    await assertSucceeds(anotar(lucio(), 'e1', evento('uid-lucio')));
    await assertSucceeds(anotar(lucio(), 'e2', evento('uid-lucio', { t: 90 })));
  });

  it('sin login: no', async () => {
    await assertFails(anotar(anonimo(), 'e1', evento('nadie')));
  });

  it('a nombre de otro: no', async () => {
    await assertFails(anotar(lucio(), 'e1', evento('uid-adri')));
  });

  it('el evento solo, sin tocar el contador: no', async () => {
    await assertFails(setDoc(doc(lucio(), 'eventos', 'e1'), evento('uid-lucio')));
  });

  it('contador con delta 2: no', async () => {
    await assertFails(anotar(lucio(), 'e1', evento('uid-lucio'), 2));
  });

  it('segundo negativo: no', async () => {
    await assertFails(anotar(lucio(), 'e1', evento('uid-lucio', { t: -1 })));
  });

  it('un campo de mas: no', async () => {
    await assertFails(anotar(lucio(), 'e1', evento('uid-lucio', { goles: 99 })));
  });

  it('borrar el propio con su descuento: pasa', async () => {
    await anotar(lucio(), 'e1', evento('uid-lucio'));
    await assertSucceeds(borrar(lucio(), 'e1', evento('uid-lucio')));
  });

  it('borrar uno ajeno: no', async () => {
    await anotar(lucio(), 'e1', evento('uid-lucio'));
    await assertFails(borrar(adri(), 'e1', evento('uid-lucio')));
  });

  it('el admin borra uno ajeno', async () => {
    await anotar(lucio(), 'e1', evento('uid-lucio'));
    await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'admins', 'uid-adri'), {}));
    await assertSucceeds(borrar(adri(), 'e1', evento('uid-lucio')));
  });

  it('se lee sin login', async () => {
    await anotar(lucio(), 'e1', evento('uid-lucio'));
    await assertSucceeds(getDoc(doc(anonimo(), 'eventos', 'e1')));
    await assertSucceeds(getDoc(doc(anonimo(), 'contadores', 'global')));
  });
});

describe('contadores', () => {
  it('inflar a alguien sin evento: no', async () => {
    await anotar(lucio(), 'e1', evento('uid-lucio'));
    await assertFails(
      setDoc(
        doc(lucio(), 'contadores', 'global'),
        { categorias: { gol: { total: increment(10), porJugador: { Lucio: increment(10) } } }, ultimoEvento: 'e1' },
        { merge: true }
      )
    );
  });

  it('sumarle a otro jugador que el del evento: no', async () => {
    const db = lucio();
    const b = writeBatch(db);
    const ev = evento('uid-lucio');
    b.set(doc(db, 'eventos', 'e1'), ev);
    b.set(
      doc(db, 'contadores', 'global'),
      {
        categorias: { cordones: { total: increment(1), porJugador: { Lucio: increment(1) } } },
        porVideo: { abc123: increment(1) },
        ultimoEvento: 'e1',
      },
      { merge: true }
    );
    await assertFails(b.commit());
  });
});

describe('categorias', () => {
  const nueva = (uid) => ({
    id: 'caño',
    emoji: '🤌',
    nombre: 'Caño',
    frase: '{j} tira un caño',
    tipo: 'juego',
    creadaPor: uid,
  });

  it('logueado crea una: pasa', async () => {
    await assertSucceeds(setDoc(doc(lucio(), 'categorias', 'cano'), { ...nueva('uid-lucio'), id: 'cano' }));
  });

  it('id con caracteres raros: no', async () => {
    await assertFails(setDoc(doc(lucio(), 'categorias', 'caño'), nueva('uid-lucio')));
  });

  it('frase sin {j}: no', async () => {
    await assertFails(
      setDoc(doc(lucio(), 'categorias', 'cano'), { ...nueva('uid-lucio'), id: 'cano', frase: 'caño' })
    );
  });

  it('pisar una existente sin ser admin: no', async () => {
    await setDoc(doc(lucio(), 'categorias', 'cano'), { ...nueva('uid-lucio'), id: 'cano' });
    await assertFails(
      setDoc(doc(adri(), 'categorias', 'cano'), { ...nueva('uid-adri'), id: 'cano', nombre: 'Otra' })
    );
  });
});

describe('admins', () => {
  it('nadie se nombra admin a si mismo', async () => {
    await assertFails(setDoc(doc(lucio(), 'admins', 'uid-lucio'), {}));
  });
});
