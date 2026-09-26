import { Lecciones } from "./lecciones";

export const metadata = { title: "Aprender" };

export default function Aprender() {
  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-white shadow-sm p-5">
        <h1 className="font-bold text-lg">Aprender</h1>
        <p className="text-sm text-tenue">Lecciones cortitas para entender qué estás haciendo con tu plata. Cada una termina con una pregunta.</p>
      </section>
      <Lecciones />
    </div>
  );
}
