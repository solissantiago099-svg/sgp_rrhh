"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const menuItems = [
  { label: "Inicio", href: "/dashboard", icon: "IN" },
  { label: "Eventos", href: "/eventos", icon: "EV" },
  { label: "Personal", href: "/personas", icon: "PE" },
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
    const token = localStorage.getItem("token");

    if (!token || !user) {
      router.push("/login");
    }
  }, [router, user]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  if (typeof window === "undefined") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="text-slate-600">Cargando...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside
        className={`bg-[#111111] text-white shadow-xl shadow-slate-950/10 transition-all duration-300 ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
          {!collapsed && <h1 className="text-lg font-bold">Sistema SGP</h1>}

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="rounded-lg px-2 py-1 text-slate-200 transition hover:bg-white/10 hover:text-white"
            aria-label="Alternar menú"
          >
            ☰
          </button>
        </div>

        <nav className="space-y-2 p-3">
          {menuItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 transition ${
                  isActive
                    ? "bg-white text-[#111111]"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold ${
                    isActive ? "bg-[#111111] text-white" : "bg-white/10 text-slate-200"
                  }`}
                >
                  {item.icon}
                </span>
                {!collapsed && <span className="font-medium">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-white/10 bg-[#111111] px-6 text-white shadow-sm">
          <h2 className="text-lg font-semibold text-white">Sistema SGP</h2>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-white">
                {user.nombre} {user.apellido}
              </p>
              <p className="text-xs capitalize text-slate-400">{user.rol}</p>
            </div>

            <button
              onClick={handleLogout}
              className="rounded-xl border border-white/15 px-4 py-2 text-sm text-slate-100 transition hover:border-red-300/70 hover:bg-red-500/10 hover:text-red-100"
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
