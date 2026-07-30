# Memoria - Estadísticas Fútbol (Gallo League)

## Resumen del Proyecto

**Gallo League** es una aplicación de estadísticas para los partidos de un grupo de fútbol amateur. Reemplaza una versión anterior que era un simple `index.html` con una tabla.

**Stack:** Angular 20 + Ionic 8 + Capacitor (para generar app Android)

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

## Sistema Visual

**Modo:** Solo oscuro

**Colores:**
- **Base:** Grafito con filos brillantes
- **Acento:** Cyan (chrome: links, tab activo, foco, banda de podio)
- **Datos:** Naranja/azul (equipos) + escala divergente azul-rojo
- **Densidad:** Estilo Promiedos

**Tokens:** `src/theme/metal.css`

**Importante:** Los colores de dato están validados para contraste y daltonismo. El cyan **nunca** pinta un dato (ambigüedad con azul de equipo). No cambiar hexadecimales sin revalidar.

### Contador de carga

Al entrar a cada pantalla los números suben desde cero: rápido al principio y frenando al final (easeOutExpo, 900 ms).

- `src/app/shared/contador.service.ts` — **un solo** `requestAnimationFrame` para toda la app. La tabla de posiciones sola tiene ~260 celdas animándose a la vez; con un reloj por número el teléfono se arrastra
- `src/app/shared/contador.directive.ts` — `[appContador]`, con `decimales`, `signo` y `sufijo`. Se adueña del contenido del elemento, así que va en un nodo propio y vacío
- Lo dispara `ionViewWillEnter()` en cada página, que Ionic llama también al volver a una pestaña ya montada
- Con `prefers-reduced-motion: reduce` los números aparecen directamente en su valor final
- **Solo se animan los números protagonistas.** Los valores entre paréntesis, los promedios al pie de los tiles y los que van dentro de una frase quedan fijos. El número de puesto tampoco se anima: es un ranking, no una cantidad

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

**Última actualización:** 2026-07-30  
**Rama:** `main` (desarrollo). Las versiones estables viven en `v1`, `v2`, `v3`
