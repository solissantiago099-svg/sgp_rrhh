const eventos = [
  { fecha: "13/04", nombre: "Fundación Pensar", salon: "El Central" },
  { fecha: "17/03", nombre: "Essen", salon: "El Central" },
  { fecha: "21/03", nombre: "Evento Corporativo", salon: "Origami" },
];

export default function CalendarioPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Calendario</h1>
        <p className="text-slate-500 mt-1">
          Vista simple de eventos ya cargados.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="grid md:grid-cols-3 gap-4">
          {eventos.map((evento, index) => (
            <div
              key={index}
              className="rounded-2xl border border-slate-200 p-4 bg-slate-50"
            >
              <p className="text-sm text-slate-500">{evento.fecha}</p>
              <h3 className="font-semibold text-slate-900 mt-1">
                {evento.nombre}
              </h3>
              <p className="text-sm text-slate-600 mt-1">{evento.salon}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}