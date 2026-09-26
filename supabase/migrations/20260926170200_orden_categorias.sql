-- Orden de las categorías en gráficos: CEDEARs (naranja) y Cripto (ocre) no quedan contiguos,
-- porque son casi indistinguibles con daltonismo (validado con la guía de dataviz).
update public.categorias c set orden = v.orden
from (values ('Bonos / ONs', 1), ('CEDEARs', 2), ('Fondos USD', 3), ('Cripto', 4),
             ('Acciones argentinas', 5), ('Acciones americanas', 6), ('Disponibilidades', 7)) v(nombre, orden)
where c.nombre = v.nombre;
