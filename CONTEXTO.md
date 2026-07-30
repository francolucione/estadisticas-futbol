# Contexto de Desarrollo — Gallo League

## ¿Qué se logró?

Se completó un **rework completo** de Gallo League: de una página HTML/JS estática → **App Angular 20 + Ionic 8 con Capacitor** para Android.

**Commits:**
- `6445b33` — Rework de Gallo League a app Angular + Ionic con análisis por jugador (28,997 líneas de código, 117 archivos)
- `7613e60` — Commit inicial

## Arquitectura

### Pantallas (4 principales)

1. **Ranking** — tabla histórica de 18 métricas (Ataque/Resultados/Goles), clickeable a ficha de jugador
2. **Jugadores** — listado con búsqueda, separando habituales de invitados
3. **Ficha del jugador** — resumen + evolución + análisis relacional ("con quién" / "contra quién" rinde mejor)
4. **Liga** — reparto de resultados, goles por equipo, records, figura más frecuente

### Decisiones técnicas

- **Lazy loading de componentes** — cada ruta carga su componente bajo demanda (app.routes.ts)
- **Motor de estadísticas** — 363 líneas de lógica pura (stats.engine.ts) que calcula todos los indicadores
- **Test de paridad** — compara el motor nuevo contra los totales del agregador original, jugador por jugador, para garantizar que el rework no cambió ningún número
- **Datos en JSON** — todo viene de `src/app/core/data/partidos.json` (3,066 líneas), editable a mano
- **Componentes reutilizables** — gráficos de evolución (grafico-evolucion.component.ts) y barras delta (barras-delta.component.ts)
- **Tematización validada** — colores para contraste y daltonismo (naranja/azul para equipos, azul/rojo para rendimiento) en `src/theme/viz.css`

### Modelos de datos

- **Partido** — `src/app/core/models/partido.model.ts` (41 líneas)
- **Stats** — `src/app/core/models/stats.model.ts` (180 líneas) — todo lo que se calcula

### Servicios

- `partidos.service.ts` — carga datos de JSON
- `stats.service.ts` — orquesta el cálculo de estadísticas
- `stats.engine.ts` — motor puro de cálculo (sin dependencias)

## Estado actual

### Repo
- **GitHub:** Creado como público (`francolucione/estadisticas-futbol`)
- **Local:** Sincronizado, última rama `main` con 2 commits

### Dev
- **Servidor:** Corriendo en `http://localhost:4200` (`npm start`)
- **Tests:** Incluye suite de tests con paridad (`npm run test:ci`)
- **Build:** Listo para Android (`npm run build` + `npx cap sync android`)

### Datos
- Todas las correcciones aplicadas en la migración están documentadas en `NOTAS-DATOS.md`
- Formato JSON documentado en `NOTAS-DATOS.md` para futuras actualizaciones

## Próximos pasos

- [ ] Deploy a Android (requiere Android Studio/SDK)
- [ ] Validación visual en navegador y en dispositivo
- [ ] Integración continua (GitHub Actions para tests/build)
- [ ] Refinamiento de UX según feedback

## Constraints/Notas

- **OneDrive:** El proyecto está en OneDrive; si `npm install` falla, limpiar `node_modules` y reintentar
- **Rutas:** Todas las rutas referenciadas usan `C:\Users\Lucio\OneDrive\...` (ambiente Windows)
- **Colores:** Los hex en `src/theme/viz.css` están validados para contraste/daltonismo — no cambiar sin re-validar
- **Screenshots:** Se guardan automáticamente en `C:\Users\Lucio\OneDrive\Imágenes\Capturas de pantalla` (lectura directa sin copy/paste)

## Comandos útiles

```bash
npm install          # Instalar dependencias
npm start            # Dev server (Angular)
npm run test:ci      # Tests en CI mode
npm run build        # Build para producción
npx cap sync android # Sincronizar con Capacitor
npx cap run android  # Correr en Android
```

## Referencia rápida de archivos clave

- `src/app/app.routes.ts` — definición de rutas y lazy loading
- `src/app/core/services/stats.engine.ts` — corazón de los cálculos
- `src/app/core/data/partidos.json` — datos (3,066 líneas)
- `src/app/features/ranking/ranking.page.ts` — página principal
- `src/theme/viz.css` — colores validados (no tocar sin validar)
- `NOTAS-DATOS.md` — formato de datos y correcciones aplicadas
