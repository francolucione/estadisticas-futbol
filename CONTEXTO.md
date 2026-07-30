# Contexto de desarrollo — Gallo League

App Angular 20 + Ionic 8 + Capacitor 8 para las estadisticas de los partidos
del grupo. Reemplaza a una pagina HTML/JS estatica que archivamos en
`ARCHVIOS-REFERENCIA/`.

## Como llegamos hasta aca

| Commit | Que trajo |
|---|---|
| `7613e60` | Commit inicial |
| `6445b33` | Rework a Angular: motor de estadisticas, ficha de jugador, test de paridad |
| `194591b` | Densidad tipo Promiedos, panel admin, curiosidades, Fechas, comparador |
| `3e6e10b` | Correccion del `<title>` |
| _(v2)_ | Identidad propia: grafito vivo, luz cian y movimiento |

## Arquitectura

### Pantallas

Cuatro pestanas mas tres vistas de detalle:

| Ruta | Que es |
|---|---|
| `/tabs/tabla` | Tabla de posiciones por puntos + rankings por 18 metricas |
| `/tabs/fechas` | Las 47 fechas con marcador y figura |
| `/tabs/fechas/:id` | Formaciones completas de una fecha |
| `/tabs/jugadores` | Listado con buscador |
| `.../jugador/:nombre` | Ficha individual con analisis relacional |
| `.../comparar/:a/:b` | Cabeza a cabeza |
| `/tabs/datos` | Globales de la liga + muro de curiosidades |
| `/admin`, `/admin/fecha/:id` | Panel de correccion de datos |

### Nucleo (`src/app/core/`)

- **`stats.engine.ts`** — motor puro, sin dependencias de Angular. Calcula
  totales, pares companero/rival, rachas, participacion en goles, records y
  posiciones. **Es codigo validado: no se toca sin correr el test de paridad.**
- **`curiosidades.engine.ts`** — construido encima de las salidas del motor.
  Records, rachas, duplas, bestia negra, regularidad, rarezas.
- **`comparacion.engine.ts`** — el cabeza a cabeza.
- **`partidos.service.ts`** — carga el JSON y le superpone la capa de parches
  del panel admin (localStorage). Todo lo demas son `computed`, asi que editar
  un gol recalcula la app entera sola.
- **`stats.service.ts`** — fachada con signals sobre los tres motores.

### Datos

`src/app/core/data/partidos.json`, editable a mano o desde el panel admin.
Formato, correcciones aplicadas y pendientes: **`NOTAS-DATOS.md`**.

### Sistema visual (`src/theme/metal.css`)

Solo modo oscuro. Grafito vivo con filos iluminados y una identidad basada en
**luminosidad**: un unico cian que rampa a blanco (`--luz-0` a `--luz-3`).

Dos reglas que conviene no romper:

1. **El cian nunca pinta un dato.** Es chrome: logotipo, subrayado activo,
   foco, banda de podio, numeros protagonistas. Las barras y tramos van en
   naranja/azul de equipo y en la escala divergente.
2. **Los colores de dato estan validados** para contraste y daltonismo contra
   la superficie real (`#16161C`). No cambiar un hex sin volver a correr el
   validador.

Movimiento: solo `transform` y `opacity`, con `--ease-salida` (expo-out).
Todo bajo `prefers-reduced-motion`, y las directivas de TypeScript hacen su
propio chequeo porque un `!important` de CSS no frena logica de JS.

## Tests

```bash
npm run test:ci     # 80 specs
```

El que importa es el **test de paridad** (`stats.engine.spec.ts`): corre el
motor nuevo sobre las 47 fechas y lo compara jugador por jugador contra los
totales del agregador original de la version HTML. Es la garantia de que
ningun rediseno ni refactor movio un numero.

## Comandos

```bash
npm start           # dev server
npm run build       # produccion a www/
npx cap sync android
npx cap run android # requiere Android Studio / SDK
```

## Pendientes

- [ ] Validacion visual en telefono real (la densidad de la tabla es lo mas
      delicado)
- [ ] Deploy a Android
- [ ] Resolver la fecha 9, que quedo 4 contra 6 (ver `NOTAS-DATOS.md`)
- [ ] Decidir si `Martin` y `Martin2` son la misma persona
