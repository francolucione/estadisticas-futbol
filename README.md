# Gallo League

Estadisticas de los partidos del grupo. Angular 20 + Ionic 8, con Capacitor
para generar la app de Android.

Reemplaza a la version anterior (un `index.html` con una sola tabla), que
queda archivada en `ARCHVIOS-REFERENCIA/`.

## Arrancar

```bash
npm install
npm start            # http://localhost:4200
```

## Pantallas

Cuatro pestanas:

- **Tabla** — tabla de posiciones tipo liga (3 por ganado, 1 por empatado) mas
  los rankings por cada una de las 18 metricas, agrupadas en Ataque,
  Resultados y Goles. El nombre de cada jugador lleva a su ficha.
- **Fechas** — las 47 fechas con su marcador y la figura de cada una. Al tocar
  una, las dos formaciones completas.
- **Jugadores** — listado con buscador, separando habituales de invitados.
- **Datos** — los globales de la liga y el muro de curiosidades.

Y dos vistas mas:

- **Ficha del jugador** — resumen, forma, evolucion de influencias fecha a
  fecha, records, puesto en cada ranking, y el analisis relacional: **con
  quien** rinde mejor y peor como companero, y **contra quien** le va mejor y
  peor como rival.
- **Cabeza a cabeza** — dos jugadores enfrentados metrica por metrica, mas el
  registro directo entre ellos. Se entra desde la ficha.

### Como leer "con quien / contra quien"

No alcanza con decir "junto a Fulano gana el 70%": si Fulano gana el 70% con
cualquiera, el dato no dice nada. Lo que se muestra es la **diferencia** entre
el rendimiento del jugador junto a esa persona y su rendimiento en el resto de
sus partidos, en puntos porcentuales. Un `+15 pp` significa que gana 15 puntos
mas seguido cuando juega con el.

Se piden 5 partidos compartidos como minimo para que la relacion aparezca.

## Panel admin

Se entra por el engranaje en la cabecera de **Tabla**, o directamente en
`/admin`. Permite corregir goles, asistencias y equipos, agregar o sacar
jugadores de una fecha, cargar fechas nuevas, cargar goles en contra y fusionar
dos nombres que son la misma persona.

**Las correcciones viven en el navegador, no en el repositorio.** El JSON viaja
dentro del build y la app no puede reescribirlo, asi que las ediciones se
guardan como una capa de parches en `localStorage` y se aplican encima del
archivo base. Cuando termines de corregir, **Descargar JSON** (o **Copiar**) y
reemplaza `src/app/core/data/partidos.json` con el resultado. Hasta que hagas
eso, el panel muestra cuantas correcciones tenes sin exportar.

## Datos

Todo sale de `src/app/core/data/partidos.json`. El formato, como cargar una
fecha a mano y las correcciones aplicadas en la migracion estan en
**[NOTAS-DATOS.md](NOTAS-DATOS.md)**.

## Tests

```bash
npm run test:ci
```

Incluye un **test de paridad** que compara el motor nuevo contra los totales
del agregador original, jugador por jugador, para garantizar que ningun cambio
posterior movio un numero.

## Android

```bash
npm run build
npx cap sync android
npx cap run android      # requiere Android Studio / SDK
```

## Sistema visual

Solo modo oscuro. Grafito con filos brillantes y acento cyan; densidad de
tabla al estilo Promiedos. Los tokens estan en `src/theme/metal.css`.

Los colores de **dato** (naranja/azul de los equipos, y la escala divergente
azul-rojo) estan validados para contraste y daltonismo contra la superficie
real de la app. El cyan es **chrome**: links, tab activo, foco y banda de
podio. Nunca pinta un dato, porque al lado del azul de equipo seria una
lectura ambigua. No conviene cambiar un hex sin volver a validarlo.
