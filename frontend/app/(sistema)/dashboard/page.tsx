export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">
          Resumen general de operación y administración.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <h3 className="text-sm text-slate-500">Eventos cargados</h3>
          <p className="text-3xl font-bold text-slate-900 mt-2">12</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <h3 className="text-sm text-slate-500">Personas activas</h3>
          <p className="text-3xl font-bold text-slate-900 mt-2">186</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <h3 className="text-sm text-slate-500">Eventos con faltantes</h3>
          <p className="text-3xl font-bold text-slate-900 mt-2">3</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">
          Importar comanda
        </h2>

        <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center">
          <p className="text-slate-600 mb-3">
            Arrastrá un archivo Excel o seleccionarlo manualmente
          </p>
          <button className="rounded-xl bg-slate-900 text-white px-5 py-3 hover:bg-slate-800">
            Seleccionar archivo
          </button>
        </div>
      </div>
    </div>
  );
}