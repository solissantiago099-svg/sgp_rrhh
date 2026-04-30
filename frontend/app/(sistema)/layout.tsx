"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

const menuItems = [
  { label: "Inicio", href: "/dashboard", icon: "🏠" },
  { label: "Eventos", href: "/eventos", icon: "🎫" },
  { label: "Personal", href: "/personas", icon: "👥" },
];

interface User {
  id: number;
  username: string;
  nombre: string;
  apellido: string;
  rol: string;
}

export default function SistemaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(true);
  const [user] = useState<User | null>(() => {
    if (typeof window === "undefined") return null;

    const userStr = localStorage.getItem("user");
    if (!userStr) return null;

    try {
      return JSON.parse(userStr) as User;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    // Validar que exista token
    const token = localStorage.getItem("token");

    if (!token || !user) {
      router.push("/login");
      return;
    }
  }, [router, user]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  if (typeof window === "undefined") {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-slate-600">Cargando...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-100 flex">
      <aside
        className={`bg-slate-900 text-white transition-all duration-300 ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
          {!collapsed && <h1 className="font-bold text-lg">SGP RRHH</h1>}

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="rounded-lg px-2 py-1 hover:bg-slate-800"
            aria-label="Alternar menú"
          >
            ☰
          </button>
        </div>

        <nav className="p-3 space-y-2">
          {menuItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 transition ${
                  isActive
                    ? "bg-slate-800 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                {!collapsed && <span className="font-medium">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Sistema de Gestión
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-900">
                {user.nombre} {user.apellido}
              </p>
              <p className="text-xs text-slate-500 capitalize">{user.rol}</p>
            </div>

            <button
              onClick={handleLogout}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition"
            >
              Salir
            </button>
          </div>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
