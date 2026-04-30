"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    if (!username || !password) {
      alert("Completá usuario y contraseña");
      return;
    }

    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-slate-900">SGP RRHH</h1>
          <p className="text-slate-500 mt-2">
            Sistema de gestión de personal para eventos
          </p>
        </div>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleLogin();
          }}
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Usuario
            </label>
            <input
              type="text"
              placeholder="Ingresá tu usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              placeholder="Ingresá tu contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-slate-900 text-white py-3 font-medium hover:bg-slate-800 transition"
          >
            Ingresar
          </button>
        </form>
      </div>
    </div>
  );
}