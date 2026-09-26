# Plan de la app — etapas 5 y 6

Marcar `[x]` al terminar. Si se corta la sesión, retomar desde la primera `[ ]`.

## Etapa 5 — Vista de cada hermana (celular, PWA)
- [x] Matemática de proyección (`src/lib/proyeccion.ts`), verificada contra el Excel (diferencia 1e-9).
- [x] Layout `/mi`: encabezado con su color, ojo y USD/ARS, navegación inferior de 4 pestañas.
- [x] Vista previa para el admin (`/mi/ver/[id]`) para ver lo que ve cada una.
- [x] Mi cartera: cuánto tengo, cuánto se puso, cuánto ganó, cuánto es mío.
- [x] En qué estoy invertida: categorías y posiciones explicadas en criollo (+ tesis si hay).
- [x] Cómo viene creciendo: evolución y meses.
- [x] Mi futuro: proyección con deslizadores (aporte propio, desde qué edad, rendimiento, gasto "¿y si?").
- [x] PWA: manifest + íconos, instalable desde el navegador.

## Etapa 6 — Las diez ideas
1. [x] Glosario contextual ("explicame esto") en métricas.
2. [x] Alertas configurables (umbral de desvío, efectivo, movimiento de posición; vencimientos ON a mano).
3. [x] Tesis por posición (admin carga; ellas la leen al tocar la posición).
4. [x] Cuánto es mío (aportante Joaquín / Propio / Regalo) — hecho en etapa 3; se suma a la vista de ellas.
5. [x] Simulador "¿y si...?" — dentro de Mi futuro.
6. [x] Comparación contra alternativas (dólar quieto, S&P 500, Merval, plazo fijo).
7. [x] Línea de tiempo de hitos.
8. [x] Modo aprendizaje: mini lecciones con preguntas.
9. [x] Reporte mensual compartible (imagen para WhatsApp).
10. [x] Recordatorio de aporte: plan (monto, día) + cumplimiento + evento de calendario.

## Hecho (26/09/2026)
Todo lo de arriba quedó implementado. Verificado: proyección = Excel (dif. 1e-9), comparación y plazo fijo
con números conocidos, sync con índices y precios diarios (ok en 8,5 s), build de producción limpio.
Lo que necesita sesión (pantallas de ellas, reporte, avisos) lo revisa Joaquín en el navegador.

## Correcciones de Joaquín (26/09/2026, tarde)
- [x] Login lento: funciones de Vercel en São Paulo (gru1, junto a Supabase) + consultas del login en paralelo.
- [x] Vista de ellas: sacar "¿Cuánto es tuyo?" (queda en la vista de Joaquín).
- [x] Sacar el cuadro "Efectivo" de la cartera; sacar Tickers y Avisos del menú.
- [x] Ocultar posiciones con cantidad 0 o valor < US$ 1 en todas las tablas.
- [x] Logos: carpeta public/logos con PNG de cada empresa; logo circular a la izquierda del ticker en todas las tablas.
- [x] Tortas: tocar una categoría abre la torta de esa categoría (100% = la categoría); flecha para volver o tocar afuera.
- [x] Historial: posiciones que tuvimos, cuándo se compró/vendió, resultado y rendimiento.
- [x] Planificación (como Excel + finjoa): mes ← →, capital, niveles Bajo/Medio/Alto con tickers y %, comprado vs plan,
      guardar / copiar a las 3; Tenencias estimadas: TC, ventas planificadas, proyectado vs actual, torta y tabla por categoría.
