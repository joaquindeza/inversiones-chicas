// Modo aprendizaje (idea 8): lecciones cortas con una pregunta al final.

export type Leccion = {
  id: string; titulo: string; emoji: string; parrafos: string[];
  pregunta: { texto: string; opciones: string[]; correcta: number; porque: string };
};

export const LECCIONES: Leccion[] = [
  {
    id: "invertir", emoji: "🌱", titulo: "¿Qué es invertir?",
    parrafos: [
      "Invertir es poner plata en algo que, con el tiempo, puede valer más: una parte de una empresa, un préstamo que te devuelven con intereses, un fondo.",
      "Ahorrar es guardar. Invertir es hacer que lo guardado trabaje para vos.",
      "La clave es el tiempo: no se trata de ganar mucho en un mes, sino de dejar que la plata crezca durante años.",
    ],
    pregunta: {
      texto: "¿Cuál es la mayor ventaja que tenés para invertir?",
      opciones: ["Saber elegir la acción justa", "Tener mucho tiempo por delante", "Mirar la cartera todos los días"],
      correcta: 1, porque: "Con muchos años por delante, el interés compuesto hace casi todo el trabajo. Mirar todos los días no cambia nada.",
    },
  },
  {
    id: "dolares", emoji: "💵", titulo: "¿Por qué medimos en dólares?",
    parrafos: [
      "En Argentina el peso pierde valor todo el tiempo por la inflación: con los mismos pesos, cada año comprás menos cosas.",
      "Si tu cartera sube 30% en pesos pero el dólar subió 40%, en realidad perdiste. Por eso medimos todo en dólares MEP: así vemos si la plata creció de verdad.",
      "El dólar MEP es el que se consigue de forma legal comprando y vendiendo bonos.",
    ],
    pregunta: {
      texto: "Tu cartera sube 20% en pesos y el dólar sube 25%. ¿Ganaste?",
      opciones: ["Sí, subió 20%", "No, en dólares vale menos", "No se puede saber"],
      correcta: 1, porque: "Medida en dólares, tu cartera vale menos que antes: el peso se devaluó más de lo que subieron tus inversiones.",
    },
  },
  {
    id: "cedear", emoji: "🍎", titulo: "¿Qué es un CEDEAR?",
    parrafos: [
      "Un CEDEAR es un certificado que representa una parte de una acción de una empresa de afuera (Apple, Google, Nubank) y que se compra en Argentina, en pesos.",
      "Si la empresa gana más y crece, su acción sube y tu CEDEAR también. Además, como sigue al precio en dólares, te protege de la devaluación.",
      "Tener CEDEARs de varias empresas distintas es ser dueña de un pedacito de cada una.",
    ],
    pregunta: {
      texto: "Si tenés un CEDEAR de MercadoLibre, sos…",
      opciones: ["Dueña de un pedacito de MercadoLibre", "Acreedora de MercadoLibre (te deben plata)", "Empleada de MercadoLibre"],
      correcta: 0, porque: "Un CEDEAR representa acciones: una acción es una parte de la empresa.",
    },
  },
  {
    id: "on", emoji: "🏦", titulo: "¿Qué es una ON?",
    parrafos: [
      "Una obligación negociable (ON) es un préstamo que le hacés a una empresa. A cambio, te paga intereses cada tanto (el cupón) y al final te devuelve lo que prestaste.",
      "Es más tranquila que una acción: sabés de antemano cuánto te van a pagar, salvo que a la empresa le vaya muy mal.",
      "Por eso tenemos una parte de la cartera (~15%) en bonos y ONs: es el colchón que se mueve menos.",
    ],
    pregunta: {
      texto: "Cuando comprás una ON de YPF…",
      opciones: ["Pasás a ser dueña de una parte de YPF", "Le prestás plata a YPF y te paga intereses", "Comprás nafta más barata"],
      correcta: 1, porque: "Una ON es deuda: sos quien presta. Los dueños son los accionistas.",
    },
  },
  {
    id: "riesgo", emoji: "🎢", titulo: "Riesgo y rendimiento",
    parrafos: [
      "Las inversiones que pueden rendir más, también pueden bajar más. Las acciones rinden más que los bonos a largo plazo, pero tienen años malos en el medio.",
      "Diversificar (tener un poco de muchas cosas) hace que si a una inversión le va mal, las otras compensen.",
      "Con un horizonte largo como el tuyo, los años malos se aguantan: lo importante es no vender asustada en una caída.",
    ],
    pregunta: {
      texto: "Tu cartera baja 15% en un mes. ¿Qué conviene hacer, pensando en 20 años?",
      opciones: ["Vender todo antes de que baje más", "Nada: es normal que haya meses malos", "Pasar todo a pesos"],
      correcta: 1, porque: "En el largo plazo las caídas se recuperan. Vender en la baja convierte una pérdida temporal en una definitiva.",
    },
  },
  {
    id: "compuesto", emoji: "⛄", titulo: "El interés compuesto",
    parrafos: [
      "Es ganar intereses sobre los intereses. US$ 100 al 10% anual son 110 al año; al siguiente, el 10% es sobre 110 y llegás a 121.",
      "Al principio parece poco, pero con los años es una bola de nieve: a 10% anual, la plata se duplica cada ~7 años.",
      "Por eso empezar temprano vale más que poner mucho: cada año de ventaja se multiplica.",
    ],
    pregunta: {
      texto: "A 10% por año, ¿más o menos cada cuánto se duplica la plata?",
      opciones: ["Cada 2 años", "Cada 7 años", "Cada 20 años"],
      correcta: 1, porque: "Regla del 72: 72 dividido la tasa (10) da unos 7 años.",
    },
  },
];
