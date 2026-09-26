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
