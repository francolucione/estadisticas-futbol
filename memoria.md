# Memoria - Estadísticas Fútbol (Gallo League)

## Resumen del Proyecto

**Gallo League** es una aplicación de estadísticas para los partidos de un grupo de fútbol amateur. Reemplaza una versión anterior que era un simple `index.html` con una tabla.

**Stack:** Angular 20 + Ionic 8 + Capacitor (para generar app Android) + Firebase (Firestore, Auth con Google, Hosting) desde v5

**Publicada en:** https://gallo-league.web.app (proyecto Firebase `gallo-league`, Firestore en `southamerica-east1`)

---

## Pantallas Principales

### 1. **Tabla**
- Tabla de posiciones tipo liga (3 puntos por ganado, 1 por empatado)
- Rankings de 18 métricas agrupadas en: Ataque, Resultados y Goles
- Nombres de jugadores llevan a su ficha individual
- Acceso al panel admin desde el engranaje en la cabecera

### 2. **Fechas**
- Las 47 fechas con marcadores y figura de cada fecha
- Al tocar una fecha, muestra las dos formaciones completas

### 3. **Jugadores**
- Listado con buscador
- Separación entre habituales e invitados/esporádicos

### 4. **Datos**
- Globales de la liga
- Muro de curiosidades (ej: "Martin" y "Martin2" sospechosamente parecidos)
- Validaciones y avisos de datos inconsistentes

### 5. Vistas Adicionales

**Ficha del Jugador:**
- Resumen y forma
- Evolución de influencias fecha a fecha
- Records y posición en cada ranking
- Análisis relacional:
  - **Con quién** rinde mejor/peor como compañero
  - **Contra quién** le va mejor/peor como rival
- Se piden mínimo 5 partidos compartidos para mostrar relación

**Cabeza a Cabeza:**
- Dos jugadores enfrentados métrica por métrica
- Registro directo entre ellos
- Se accede desde la ficha del jugador

---

## Lectura de "Con quién / Contra quién"

**Importante:** No es suficiente decir "junto a Fulano gana el 70%". Si Fulano gana el 70% con cualquiera, el dato no dice nada.

Lo que se muestra es la **diferencia** entre:
- Rendimiento del jugador jugando con esa persona
- Rendimiento del jugador en el resto de sus partidos

**Ejemplo:** Un `+15 pp` significa que gana 15 puntos porcentuales más seguido cuando juega con esa persona.

---

## Panel Admin

**Acceso:** Engranaje en la cabecera de Tabla, o directamente en `/admin`

**Funciones:**
- Corregir goles, asistencias y equipos
- Agregar o quitar jugadores de una fecha
- Cargar fechas nuevas
- Cargar goles en contra
- Fusionar nombres (alias) que son la misma persona

**Importante:** Las correcciones viven **en el navegador**, no en el repositorio. Se guardan como parches en `localStorage`. Cuando termines:
1. Haz clic en **Descargar JSON** (o **Copiar**)
2. Reemplaza `src/app/core/data/partidos.json` con el resultado
3. Commitea ese cambio

El panel muestra cuántas correcciones tienes sin exportar.

---

## Datos: Formato y Estructura

**Ubicación:** `src/app/core/data/partidos.json`

### Formato Base
```json
{
  "alias": {},
  "partidos": [
    {
      "id": 1,
      "jugadores": [
        { "nombre": "Lucio", "goles": 1, "asistencias": 4, "equipo": "naranja" }
      ]
    }
  ]
}
```

### Campos
- `equipo`: `"naranja"` o `"azul"` (antes era booleano)
- `fecha`: opcional (ISO). Las 47 fechas históricas no la tienen
- `golesEnContra`: opcional. Goles que suman al marcador pero no se atribuyen a nadie

### Cargar o Corregir una Fecha

**Recomendado:** Usar el panel admin. Es cómodo, valida en vivo y exporta el JSON corregido.

**A mano:** Agregar un objeto al final de `partidos` con el siguiente `id` y 10 jugadores. La app valida que los equipos estén parejos.

### Fusionar Nombres (Alias)

Editar `alias` sin tocar los partidos:
```json
"alias": { "Martin2": "Martin" }
```

También se hace desde el panel admin en la sección Alias.

Si un alias hace que dos jugadores del mismo partido se llamen igual, la app lanza un error explícito (no fusiona silenciosamente).

---

## Correcciones Aplicadas en la Migración

### 1. "Goles en Contra" ya no es un jugador
- **Antes:** Era una entrada `{nombre: "Goles en Contra", goles: 1}`
- **Ahora:** Es `"golesEnContra": [{ "favorA": "naranja", "cantidad": 1 }]`
- El gol sigue contando para el marcador, pero desaparece del ranking
- **Impacto:** Corrigió total de partidos (471 → 470)

### 2. "Invita2" eran dos personas
- **Antes:** El motor fusionaba por nombre, resultando en 1 fila con 2 partidos en 1 solo partido
- **Ahora:** Figuran como `"Invita2 A"` y `"Invita2 B"`

### 3. Fecha 9: `Adri B` estaba del lado equivocado
- **Antes:** Figuraba en el bloque naranja pero cargado como `azul`. Equipos 4 contra 6 y marcador **naranja 5 - azul 13**
- **Ahora:** `Adri B` es naranja. Equipos 5-5 y **empate 9-9**
- El total de goles de la fecha no cambia (18): cambia quién ganó, no cuántos hubo
- **Impacto:** Los 10 jugadores de esa fecha mueven PG/PE/PP/GF/GC/DG. Los empates de la liga pasan de 3 a 4
- **Efecto lateral:** `Adri B` y `Lucio` dejaron de ser compañeros en esa fecha, así que su dupla cayó de 9/12 a 8/11. La mejor dupla pasó a ser **`Adri R` + `Lucio`** (11 de 15, 73%)
- Era el último aviso de validación pendiente: `validar()` ya no reporta nada

---

## Pendientes: Confirmaciones Necesarias

### Fecha 10: Gol en contra sin cargar
- El `index.js` original tiene comentario: `//GOL EN CONTRA FECHA 10, VER XL`
- **Acción:** Encontrar en Excel y agregarlo como `"golesEnContra"`

### Martin vs Martin2
- Figuran como dos jugadores distintos
- **Evidencia:** Martin (fechas 1-26) y Martin2 (32-47), sin superposición
- **Sospecha:** Misma persona cargada dos veces
- La app lo muestra como curiosidad en **Datos** bajo "Sospechosamente parecidos"
- **Acción:** Confirmar y resolver con alias si es necesario

### Invitados Sueltos
- `Extra 1`, `Extra 2`, `Extra C`, `Invitado`, `Invita2 A`, `Invita2 B`, `Sergio (invita2)`, `Seba`
- Menos de 10 partidos cada uno → aparecen en "Esporádicos e invitados"

---

## El VAR (v5, 18-sep-2026)

Pestaña **VAR**: se elige un video del canal de YouTube de Gallo League (`@lucio-mt4sl`), se le da play y se marcan eventos en su segundo exacto. Lo marcado es público y arma rankings nuevos.

- **Videos**: `src/app/core/data/videos.json`, generado por `npm run videos` (`scripts/videos-canal.mjs`, lee la página del canal sin API key). 65 videos: fechas 1-47 (temporada `2023-24`, con marcador y a veces el día en el título), `2025` #1-#16 (sin planilla) y 2 especiales. **Correrlo de nuevo cada vez que se suba un video.**
- **Categorías de fábrica** en `src/app/core/data/categorias.ts` (⚽ gol, 🥅 palo, 🚀 era un golazo, 🟨 falta, 🏴‍☠️ robo, 📣 grita, 👟 cordones, 😂 cosa graciosa). El `id` es la clave de los contadores: **no se cambia nunca**. Las que inventa el grupo van a la colección `categorias`.
- **Frases**: `{j}` el jugador, `{j2}` el segundo, `[...]` sólo si hay segundo: `"{j} roba[ a {j2}]"`.
- **La planilla manda.** Marcar un gol en el video NO cambia la tabla: el control de goles sólo avisa si no coincide. "Dar por terminado" guarda los goles de ese momento en `videos/{id}` y las diferencias pasan a Datos.
- **Titulos vs planilla**: 10 fechas no dan el mismo marcador (1, 3, 10, 11, 13, 20, 29, 32, 33, 43; en 11 y 33 son los colores al revés). No se corrigen solas; están clavadas en `var.engine.spec.ts` y listadas en Datos. La fecha 10 encaja con el pendiente del gol en contra.

### Firestore

- `eventos/{id}`, `contadores/global` (un solo doc con todo lo que leen tabla, ficha y lista), `categorias/{id}`, `videos/{id}` (sólo los terminados), `admins/{uid}` (se carga a mano desde la consola).
- **Cada evento viaja en el mismo batch que su contador** (`increment`, `merge`) y las reglas controlan las dos puntas: delta ±1 exacto en categoría, jugador y video, con `ultimoEvento` diciendo qué evento lo justifica. Pruebas: `npm run test:reglas` (19, contra el emulador).
- Lectura pública, escritura con Google. Borra el autor o un admin.
- **Nunca** leer `eventos` entero: la ficha pide `where jugador + orderBy creado limit 10` (índice compuesto en `firestore.indexes.json`), el video pide `where videoId`, la bitácora pagina de a 30.

### Trampas que ya se pagaron

- **`firebase` tiene que ser la misma versión que trae `@angular/fire`** (hoy 11.10). Con la 12 en la raíz había dos SDK: las instancias inyectadas eran del 11, las funciones importadas del 12, y `collection()` tiraba *Expected first argument to collection() to be a CollectionReference*. Los tests en memoria no lo ven: sólo aparece contra Firebase de verdad. `npm ls firebase` tiene que dar una sola versión.
- `initializeAuth` no trae el resolver del popup: sin `browserPopupRedirectResolver`, el login con Google tira `auth/argument-error`.
- Los datos del VAR salen de `VarFuente`/`Sesion` (abstractas). La app usa Firestore; las pruebas de pantallas, `MemoriaVarFuente`/`MemoriaSesion`.
- Estilos del VAR en `src/theme/var.scss` (global): el emoji que vuela cuelga de `<body>` y la pantalla pasaba el presupuesto de 8 kB por componente.

### Desarrollo

- `npm run dev:emu` → app en el **4300** contra emuladores (Auth 9098, Firestore 8081, UI 4002: puertos distintos de sistema-minimo para poder correr los dos).
- En el emulador existe `window.__entrarPrueba('Nombre')` para entrar sin el popup (el popup abre una ventana que un navegador automatizado no alcanza). En producción no existe.
- `npm run deploy` = build + reglas + hosting. **Reglas antes que la app** si cambian las dos.

### Pendiente

- **Activar Google en Authentication** (consola de Firebase → Authentication → Comenzar → Google). No se puede por API: necesita un cliente OAuth que crea la consola. Hasta entonces el "Entrar con Google" de producción falla.
- Cargar la temporada 2025 como liga (formaciones y equipos) — fuera de alcance de v5.
- La app Android (Capacitor) no se probó con el login: `signInWithPopup` en un WebView necesita otro camino.

---

## Pruebas

```bash
npm run test:ci
```

**Requiere un binario de Chromium.** Si no tenés Chrome instalado, Edge sirve:

```bash
export CHROME_BIN="C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
npm run test:ci
```

Sin eso, Karma falla con `Cannot find the binary chrome.exe`.

Incluye un **test de paridad** que compara el motor nuevo contra los totales del agregador original:
- Valida jugador por jugador
- Verifica: goles, asistencias, influencias, PJ, PG, PE, PP, GF, GC, DG
- **Resultado:** Los 33 jugadores comparables dan idénticos, salvo las **3 correcciones declaradas explícitamente**
- La fecha 9 se declara como una tabla de deltas (`CORRECCION_FECHA_9` en `stats.engine.spec.ts`), no regenerando el fixture: el fixture legacy es el registro del motor viejo y recalcularlo dejaría al test comparándose contra sí mismo
- Un test aparte verifica que los 23 jugadores ajenos a la fecha 9 sigan clavados al fixture, para que el delta no se aplique de más

---

## Comandos

### Desarrollo
```bash
npm install
npm start            # http://localhost:4200
```

### Tests
```bash
npm run test:ci
```

### Android
```bash
npm run build
npx cap sync android
npx cap run android      # requiere Android Studio / SDK
```

---

## Sistema Visual (identidad Gallo, 18-sep-2026)

**Idea:** la camiseta del club en el vestuario de noche. Sale del logo del canal (gallo marino con cresta roja sobre blanco). Reemplazó al grafito + cyan + aurora de v1-v4.

**Modo:** solo oscuro. **Tokens:** `src/theme/metal.css` (los nombres `--metal-*` y `--acento` quedaron de antes; los valores son nuevos).

| rol | hex | regla |
|---|---|---|
| fondo carbón | `#0c0f16` | |
| panel | `#141925` | superficie contra la que se validan los datos |
| tinta hueso | `#f2ede3` | 15:1 sobre el panel |
| pluma (secundario) | `#a3adc2` | 7,8:1 |
| cresta | `#d42a3c` | **sólo marca**, nunca dato ni estado |
| oro / plata / bronce | `#e0b54a` `#b9c1cf` `#c0835a` | sólo el podio de la tabla |

- **El chrome no tiene color.** Tab activo, links, foco, botón primario y columna resaltada van en hueso, con peso, subrayado o fondo. Naranja, azul, verde y rojo son **datos** y nada del chrome compite con ellos.
- **Datos:** mismos hex de siempre. Re-validados el 18-sep-2026 contra `#141925` con el validador del skill `dataviz`: naranja y azul pasan los cinco controles. V/E/D "fallan" banda de luminosidad y croma igual que contra la superficie vieja: son colores de estado, siempre con su letra, y el contraste pasa.
- **Tipografía** autoalojada con `@fontsource` (anda sin red en Android), cargada en `angular.json` > `styles`:
  - **Big Shoulders Display** 700/800 (`--f-display`, clase `.cifra`): marcadores, números protagonistas, títulos.
  - **Barlow Semi Condensed** 400-700 (`--f-texto`): todo lo demás, tablas incluidas.
  - Escala en `--t-*`. **Sin mayúsculas espaciadas en ningún lado**: los títulos van en minúscula normal con display.
- **Fondo:** las líneas de una cancha de fútbol 5 en SVG, tenues, fijas (`--metal-fondo`). Va en `ion-content { --background }`, no en `body` (ion-content lo tapa).
- **El momento audaz es uno:** el marcador de la fecha (`fecha-detalle`), con franjas de equipo y dígitos de ~4rem. El resto se queda quieto.
- **Pantalla ancha:** `.contenido.ancho` llega a 1120px (fechas y datos en 2 columnas, jugadores en 3, VAR en 4, la ficha en 2 con `columns`). La tabla de posiciones queda en 760px.

### Marca

- `resources/gallo.jpg` es el logo del canal (1024px). `python scripts/escudo.py` genera el escudo (`src/assets/marca/escudo-96|192.png`), el favicon, los íconos PWA y las fuentes de Android en `resources/`. Después: `npx capacitor-assets generate --android` con fondo `#0c0f16`.
- `<app-escudo>` (`shared/components/escudo.component.ts`) va en la cabecera de las cinco pestañas; en Tabla, con el wordmark.
- `src/manifest.webmanifest`: nombre, color y los íconos.

### Textos

`python scripts/tildes.py` revisa que el texto visible tenga tildes (templates, aria-label/title/placeholder y strings de TS), sin tocar comentarios ni código. Sin argumentos muestra lo que cambiaría; con `--aplicar`, lo cambia. Las ambiguas (esta/está, donde/dónde, quien/quién) van a mano. Hoy da 0.

### La trampa de especificidad de Ionic

`global.scss` importa `@ionic/angular/css/palettes/dark.always.css`, que declara sus colores bajo **`:root.md`** y **`:root.ios`** (0-2-0), no bajo `:root` (0-1-0). Por eso el bloque `--ion-*` en `metal.css` va con las tres formas del selector (`:root, :root.md, :root.ios`). Si algún token `--ion-*` nuevo "no se aplica", el problema es casi siempre este.

### Contador de carga

Al entrar a una pantalla los números arrancan **revolviendo dígitos al azar** (~240 ms, ilegible a propósito) y recién después suben frenando hasta su valor (easeOutExpo, 860 ms). Es puro dibujo: el valor de verdad nunca cambia.

- `src/app/shared/contador.service.ts` — **un solo** `requestAnimationFrame` para toda la app, repartido en canales. La tabla de posiciones sola tiene ~260 celdas animándose a la vez; con un reloj por número el teléfono se arrastra
- `src/app/shared/contador.directive.ts` — `[appContador]`, con `decimales`, `signo`, `sufijo` y `grupo`. Se adueña del contenido del elemento, así que va en un nodo propio y vacío: los paréntesis y las unidades quedan como texto hermano
- El revuelto cambia **solo los dígitos** y deja el signo, el punto decimal y el sufijo donde están, así el texto conserva su largo final. Sin eso la celda salta en cada parpadeo. Por lo mismo, `.contador` lleva `font-variant-numeric: tabular-nums` en `global.scss`
- Los dígitos cambian cada 55 ms, no por frame: por frame se ve mush y además multiplica las escrituras al DOM
- Con `prefers-reduced-motion: reduce` los números aparecen directamente en su valor final, sin ruido
- **Se animan todos los números**, incluido el puesto (#). Las únicas excepciones son el panel admin (es una herramienta de carga, sus números viven en `<input>`) y los valores de curiosidad, que son strings

#### Canales

Los canales existen para poder re-animar una columna sola:

- `reiniciar()` — todos los canales. Lo llama `ionViewWillEnter()` en cada página, y los filtros que cambian el juego de filas (el checkbox de +10 PJ y el cambio de familia)
- `reiniciarGrupo(g)` — uno solo. Lo llama el cambio de métrica en Tabla, que re-ordena las filas pero no cambia los números: se anima solo la columna que pasa a resaltarse
- Se reinicia por **columna**, no por clave de métrica: varias métricas caen en la misma columna (Goles y Goles/PJ resaltan `goles`; PG, PG% y Pts/PJ resaltan `PG`)
- El buscador de Jugadores **no** dispara nada: saltaría en cada tecla
- Como `@for` usa `track j.nombre`, al re-ordenar las directivas siguen vivas. Reiniciar el canal es el mecanismo correcto; no hay que recrear DOM

### Separación en tablas

`.tabla-densa` usa dos pesos distintos a propósito: la línea de fila (`--metal-borde`) se lee antes que la de columna (`--metal-borde-suave`). Con las dos iguales queda cuadriculado. La columna de nombre, que es la que se congela al scrollear, lleva el borde más marcado.

### Barras del gráfico de evolución

Cada barra se pinta por resultado: verde ganado, gris empatado, rojo perdido. Lleva leyenda V/E/D debajo del título, porque el color de resultado **nunca informa solo**. La línea de media móvil es blanca, no gris, para no confundirse con las barras de empate.

### Cabecera

`ion-toolbar` espeja el acabado del tab bar inferior: degradado, borde abajo y filo claro arriba. **El tab bar no se toca.**

---

## Estructura de Archivos Clave

- `src/app/core/data/partidos.json` — datos brutos
- `src/app/core/services/stats.engine.ts` — motor de cálculo
- `src/app/core/services/stats.engine.spec.ts` — test de paridad
- `src/app/shared/contador.service.ts` y `contador.directive.ts` — animación de los números
- `src/theme/metal.css` — tokens de diseño
- `src/global.scss` — panel, tabla densa, tiles, segmento, toolbar
- `ARCHVIOS-REFERENCIA/` — versión anterior (index.html histórico)
- `angular.json` — config Angular
- `ionic.config.json` — config Ionic
- `capacitor.config.ts` — config Capacitor

---

**Última actualización:** 2026-09-18  
**Rama:** `v5` (desarrollo, sale de `v4`). Las versiones estables viven en `v1`…`v4`
