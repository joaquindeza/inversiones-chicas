// Explicaciones en lenguaje simple. El objetivo del proyecto no es solo que la plata crezca:
// es que ellas entiendan qué están haciendo.

export const CATEGORIAS_CRIOLLO: Record<string, string> = {
  "Bonos / ONs":
    "Le prestás plata a una empresa (eso es una ON, obligación negociable) o al Estado (un bono) y te la devuelven con intereses. Es la parte más tranquila de tu cartera.",
  "CEDEARs":
    "Un pedacito de una empresa grande de afuera (Apple, Google, MercadoLibre) que se compra en Argentina y en pesos. Si a la empresa le va bien, tu pedacito vale más.",
  "Cripto":
    "Monedas digitales como Bitcoin. Pueden subir o bajar muchísimo en poco tiempo: por eso son una parte chica de la cartera.",
  "Fondos USD":
    "Un fondo junta la plata de muchas personas y la invierte en dólares, con poco riesgo. Sirve para tener plata que rinde algo mientras esperás.",
  "Acciones americanas":
    "Partes de empresas de Estados Unidos compradas directamente allá, en dólares.",
  "Acciones argentinas":
    "Partes de empresas argentinas, como YPF, Galicia o Pampa. Suben y bajan bastante con lo que pasa en el país.",
  "Disponibilidades":
    "Plata que todavía no está invertida: queda lista para la próxima compra.",
  "Otros": "Inversiones que todavía no tienen categoría asignada.",
};

export type Termino =
  | "MEP" | "PPC" | "rendimiento" | "resultado" | "aportado" | "patrimonio" | "efectivo" | "CEDEAR" | "ON"
  | "interes_compuesto" | "diversificar" | "riesgo" | "TIR" | "EV/EBITDA" | "objetivo" | "cierre";

export const GLOSARIO: Record<Termino, { titulo: string; texto: string }> = {
  MEP: {
    titulo: "Dólar MEP",
    texto: "Es el dólar que se consigue comprando y vendiendo bonos, de forma legal. Medimos todo en dólares MEP porque el peso pierde valor con la inflación: si tu cartera sube en pesos pero baja en dólares, en realidad perdiste.",
  },
  PPC: {
    titulo: "Precio promedio de compra (PPC)",
    texto: "Cuánto pagaste en promedio por cada unidad. Si compraste 1 a US$ 10 y otra a US$ 12, tu PPC es US$ 11. Si el precio de hoy está arriba de tu PPC, esa posición va ganando.",
  },
  rendimiento: {
    titulo: "Rendimiento",
    texto: "Cuánto creció (o bajó) tu plata en porcentaje, comparando lo que vale hoy contra lo que se puso. Un 10% quiere decir que por cada US$ 100 puestos hoy tenés US$ 110.",
  },
  resultado: {
    titulo: "Resultado",
    texto: "La ganancia o pérdida en dólares: lo que vale hoy menos lo que se puso. No cuenta la plata que entró como aporte, solo lo que generaron las inversiones.",
  },
  aportado: {
    titulo: "Aportado",
    texto: "Toda la plata que se puso en tu cartera: lo que puso Joaquín, lo que pusiste vos y algún regalo. Es la base contra la que se mide si ganaste.",
  },
  patrimonio: {
    titulo: "Patrimonio",
    texto: "Lo que vale todo lo tuyo hoy: tus inversiones más la plata que tenés sin invertir.",
  },
  efectivo: {
    titulo: "Efectivo",
    texto: "Plata que está en tu cuenta pero todavía no se invirtió. Está bien tener un poco para aprovechar oportunidades, pero mucho tiempo quieta no crece.",
  },
  CEDEAR: { titulo: "CEDEAR", texto: CATEGORIAS_CRIOLLO["CEDEARs"] },
  ON: { titulo: "Obligación negociable (ON)", texto: CATEGORIAS_CRIOLLO["Bonos / ONs"] },
  interes_compuesto: {
    titulo: "Interés compuesto",
    texto: "Ganar intereses sobre los intereses. Si tus US$ 100 ganan 10%, al año tenés 110; al siguiente el 10% es sobre 110, no sobre 100. Con muchos años, esa bola de nieve hace que la plata crezca muchísimo: por eso empezar temprano es la mayor ventaja que tenés.",
  },
  diversificar: {
    titulo: "Diversificar",
    texto: "No poner todos los huevos en la misma canasta. Si tenés varias empresas y tipos de inversión, cuando a una le va mal las otras compensan.",
  },
  riesgo: {
    titulo: "Riesgo y rendimiento",
    texto: "Lo que puede rendir más, también puede bajar más. Las acciones suben más que los bonos a largo plazo, pero en el camino tienen años malos. Como tu horizonte es largo, podés aguantar esos baches.",
  },
  TIR: {
    titulo: "TIR (tasa interna de retorno)",
    texto: "Cuánto rinde por año un bono o una ON si lo tenés hasta que vence, contando todos los pagos que te hace. Sirve para comparar bonos entre sí.",
  },
  "EV/EBITDA": {
    titulo: "EV/EBITDA",
    texto: "Una forma de ver si una empresa está cara o barata: compara lo que vale la empresa entera con lo que gana con su negocio en un año. Cuanto más bajo, más barata (comparando empresas parecidas).",
  },
  objetivo: {
    titulo: "Objetivo de cartera",
    texto: "Qué parte de la cartera queremos en cada tipo de inversión. Por ejemplo, 15% en bonos y ONs para tener una parte tranquila. Si algo se aleja mucho del objetivo, toca “rebalancear”.",
  },
  cierre: {
    titulo: "Cierre del mes",
    texto: "Una foto de cuánto valía la cartera al final de cada mes. Juntando esas fotos se arma el gráfico de cómo viene creciendo.",
  },
};
