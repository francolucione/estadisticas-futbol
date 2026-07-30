# Notas sobre los datos

Los datos viven en `src/app/core/data/partidos.json`. Se migraron desde
`ARCHVIOS-REFERENCIA/Gallo League/index.js`, que queda como referencia
historica y no se toca.

## Formato

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

- `equipo` es `"naranja"` o `"azul"` (antes era un booleano `naranja`).
- `fecha` es opcional (ISO). Ninguna de las 47 fechas historicas la tiene.
- `golesEnContra` es opcional: goles que suman al marcador de un equipo pero
  no se le atribuyen a nadie.

### Cargar o corregir una fecha

Lo comodo es el **panel admin** (engranaje en la pestana Tabla, o `/admin`):
edita, valida en vivo y despues exporta el JSON ya corregido para pisar este
archivo. Ver el README.

A mano tambien se puede: agregar un objeto al final de `partidos` con el `id`
siguiente y los 10 jugadores. La app valida sola que los equipos esten parejos
y avisa en la pestana **Datos** si algo no cierra.

### Fusionar dos nombres que son la misma persona

Editar `alias` sin tocar los partidos:

```json
"alias": { "Martin2": "Martin" }
```

Tambien se hace desde el panel admin, en la seccion Alias.

Si un alias hiciera que dos jugadores del mismo partido pasen a llamarse
igual, la app lanza un error explicito en vez de fusionarlos en silencio.

---

## Correcciones aplicadas en la migracion

### 1. `"Goles en Contra"` ya no es un jugador

En la fecha 41 habia una entrada `{nombre: "Goles en Contra", goles: 1,
naranja: true}`. El motor viejo la trataba como una persona: aparecia en la
tabla con 1 gol y 1 partido jugado, y por eso el total de partidos daba
**471** en lugar de 470 (47 fechas x 10 jugadores).

Ahora es `"golesEnContra": [{ "favorA": "naranja", "cantidad": 1 }]`. El gol
sigue contando para el marcador —y no es un detalle: **con el gol la fecha 41
termina 8-8, sin el ganaba azul 7-8**— pero desaparece del ranking.

### 2. `"Invita2"` eran dos personas

En la fecha 46 el nombre `Invita2` aparece dos veces, una en cada equipo. El
motor viejo los fusionaba por nombre, y el resultado era una sola fila con
**2 partidos jugados en un unico partido**, mas una victoria y una derrota
simultaneas, y GF/GC contados dos veces.

En el JSON figuran como `"Invita2 A"` y `"Invita2 B"`.

---

## Pendientes que necesitan tu confirmacion

### Fecha 9: los equipos quedaron 4 contra 6

```
azul     Adri B   4 goles
naranja  Adri R   2
naranja  Dario    0
naranja  Edu      1
naranja  Fede     2
azul     Lucio    4
azul     Bruno    3
azul     Rodri    2
azul     Gaby     0
azul     Fer L    0
```

Tal como esta, el marcador es **naranja 5 - azul 13**.

Es sospechoso: `Adri B` esta listado primero, que es la posicion del bloque
naranja en todas las demas fechas, pero marcado como azul. Si fuera naranja,
los equipos quedan 5 contra 5 y el partido termina **9-9, empate**.

No lo cambie por mi cuenta porque altera el resultado de la fecha y con eso
el PG/PE/PP de los diez jugadores. Si confirmas que fue un error de carga, el
arreglo es cambiar `"equipo": "azul"` por `"naranja"` en la entrada de
`Adri B` del partido 9. La app muestra este aviso sola en la pestana Liga.

### Fecha 10: hay un gol en contra sin cargar

El index.js original tiene el comentario `//GOL EN CONTRA FECHA 10, VER XL`.
Nunca se cargo. El formato ya lo soporta: si lo encontras en el Excel,
agregale al partido 10 un `"golesEnContra": [{ "favorA": "...", "cantidad": 1 }]`.

### `Martin` y `Martin2`

Figuran como jugadores distintos, igual que en la version anterior.

Lo que averiguamos despues: **nunca coincidieron en una misma fecha**. `Martin`
juega de la 1 a la 26 y `Martin2` de la 32 a la 47, sin una sola superposicion
y con un hueco limpio de cinco fechas en el medio. Es evidencia fuerte de que
son la misma persona cargada dos veces, pero no es prueba.

La app lo muestra sola: aparece como curiosidad en la pestana **Datos**, bajo
el titulo "Sospechosamente parecidos". Si confirmas que son el mismo, se
resuelve desde el panel admin en la seccion Alias, o a mano con
`"alias": { "Martin2": "Martin" }`.

### Invitados sueltos

`Extra 1`, `Extra 2`, `Extra C`, `Invitado`, `Invita2 A`, `Invita2 B`,
`Sergio (invita2)` y `Seba` quedan como jugadores normales, tal como pediste.
Como todos tienen menos de 10 partidos, no entran en la tabla filtrada por
defecto y aparecen bajo "Esporadicos e invitados" en la pestana Jugadores.

---

## Garantia de que no se rompio nada

`src/app/core/services/stats.engine.spec.ts` corre el motor nuevo sobre las
47 fechas y compara jugador por jugador contra `totales-legacy.fixture.json`,
que se genero ejecutando el agregador original tal cual. Los 33 jugadores
comparables dan **identicos** en goles, asistencias, influencias, PJ, PG, PE,
PP, GF, GC y DG. Las unicas diferencias son las dos correcciones de arriba, y
el test las declara explicitamente.
