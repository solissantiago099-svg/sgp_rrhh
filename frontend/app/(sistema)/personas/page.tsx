"use client";

import { useEffect, useState } from "react";

type Persona = {
  id: number;
  legajo: number;
  apellido: string | null;
  nombre: string | null;
  cuil: string | null;
  categoria: string | null;
  tarea: string | null;
  fecha_ingreso: string | null;
  cbu: string | null;
  activo: boolean;
};

export default function PersonasPage() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchPersonas = async () => {
      try {
        const res = await fetch("https://sgp-rrhh-backend.onrender.com/api/personas");
        const data = await res.json();
        setPersonas(data);
      } catch (error) {
        console.error("Error al cargar personas:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPersonas();
  }, []);

  const filteredPersonas = personas.filter((persona) => {
    const text = `${persona.legajo} ${persona.apellido || ""} ${persona.nombre || ""} ${persona.cuil || ""}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Personal</h1>
        <p className="text-slate-500 mt-1">
          Maestro real de personal operativo.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
        <input
          type="text"
          placeholder="Buscar por legajo, apellido, nombre o CUIL..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-6 text-slate-500">Cargando personas...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-4 py-3">Legajo</th>
                <th className="text-left px-4 py-3">Apellido</th>
                <th className="text-left px-4 py-3">Nombre</th>
                <th className="text-left px-4 py-3">CUIL</th>
                <th className="text-left px-4 py-3">Categoría</th>
                <th className="text-left px-4 py-3">Tarea habitual</th>
                <th className="text-left px-4 py-3">CBU</th>
              </tr>
            </thead>
            <tbody>
              {filteredPersonas.map((persona) => (
                <tr key={persona.id} className="border-t border-slate-200">
                  <td className="px-4 py-3">{persona.legajo}</td>
                  <td className="px-4 py-3">{persona.apellido || "-"}</td>
                  <td className="px-4 py-3">{persona.nombre || "-"}</td>
                  <td className="px-4 py-3">{persona.cuil || "-"}</td>
                  <td className="px-4 py-3">{persona.categoria || "-"}</td>
                  <td className="px-4 py-3">{persona.tarea || "-"}</td>
                  <td className="px-4 py-3">{persona.cbu || "-"}</td>
                </tr>
              ))}

              {!loading && filteredPersonas.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                    No se encontraron personas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}