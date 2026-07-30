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

- **Ranking** — la tabla historica de siempre, ordenable por 18 metricas
  agrupadas en Ataque / Resultados / Goles. El nombre de cada jugador lleva a
  su ficha.
- **Jugadores** — listado con buscador, separando habituales de invitados.
- **Ficha del jugador** — resumen, forma, evolucion de influencias fecha a
  fecha, records, puesto en cada ranking, y el analisis relacional:
  - **Con quien** rinde mejor y peor como companero.
  - **Contra quien** le va mejor y peor como rival.
- **Liga** — reparto de resultados, goles por equipo, records y quien fue
  figura mas veces.

### Como leer "con quien / contra quien"

No alcanza con decir "junto a Fulano gana el 70%": si Fulano gana el 70% con
cualquiera, el dato no dice nada. Lo que se muestra es la **diferencia** entre
el rendimiento del jugador junto a esa persona y su rendimiento en el resto de
sus partidos, en puntos porcentuales. Un `+15 pp` significa que gana 15 puntos
mas seguido cuando juega con el.

Se piden 5 partidos compartidos como minimo para que la relacion aparezca.

## Datos

Todo sale de `src/app/core/data/partidos.json`, que se edita a mano.
El formato, como cargar una fecha nueva y las correcciones aplicadas en la
migracion estan en **[NOTAS-DATOS.md](NOTAS-DATOS.md)**.

## Tests

```bash
npm run test:ci
```

Incluye un **test de paridad** que compara el motor nuevo contra los totales
del agregador original, jugador por jugador, para garantizar que el rework no
cambio ningun numero salvo las dos correcciones documentadas.

## Android

```bash
npm run build
npx cap sync android
npx cap run android      # requiere Android Studio / SDK
```

## Colores de los graficos

Los pares naranja/azul (equipos) y azul/rojo (escala de rendimiento) estan
validados para contraste y daltonismo contra las dos superficies reales de la
app. Los valores viven en `src/theme/viz.css`; no conviene cambiar un hex sin
volver a validarlo.
