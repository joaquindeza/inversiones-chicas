-- Catálogos fijos (no son datos personales). Las hermanas y sus datos los carga
-- migracion/migrar_excel.py.

insert into public.plataformas (nombre, orden) values
  ('IOL', 1), ('Cocos', 2), ('Balanz', 3), ('Lemon', 4), ('Binance', 5), ('Belo', 6), ('Otra', 7);

insert into public.categorias (id, nombre, color, objetivo_pct, orden) values
  (1, 'Bonos / ONs',         '#7C3AED', 0.15, 1),
  (2, 'CEDEARs',             '#EA580C', null, 2),
  (3, 'Cripto',              '#CA8A04', null, 3),
  (4, 'Fondos USD',          '#0D9488', null, 4),
  (5, 'Acciones americanas', '#DB2777', null, 5),
  (6, 'Acciones argentinas', '#2563EB', null, 6),
  (7, 'Disponibilidades',    '#64748B', null, 7);

insert into public.reglas_alerta (tipo, umbral, activa, nota) values
  ('desvio_categoria',     0.05, true, 'Una categoría se aleja más de este % de su objetivo'),
  ('aporte_sin_registrar', 1000, true, 'Efectivo en IOL (ARS) que el libro no explica'),
  ('movimiento_posicion',  0.15, true, 'Una posición sube o baja más de este % en el mes'),
  ('vencimiento_on',       null, true, 'Pago de cupón o vencimiento de una ON');

insert into public.config (clave, valor) values
  ('sync_frecuencia', '"off"'),
  ('tolerancia_efectivo_ars', '1000');
