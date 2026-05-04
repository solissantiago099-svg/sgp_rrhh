"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  AUTH_TOKEN_KEY,
  AUTH_USER_KEY,
  clearAuth,
  isJwtExpired,
} from "@/app/utils/auth";

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

const subscribeToAuthStorage = (callback: () => void) => {
  window.addEventListener("storage", callback);
  window.addEventListener("auth-changed", callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("auth-changed", callback);
  };
};

const getAuthSnapshot = () => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const user = localStorage.getItem(AUTH_USER_KEY);

  if (!token || !user || isJwtExpired(token)) {
    return "";
  }

  return JSON.stringify({ token, user });
};

const getServerAuthSnapshot = () => undefined;

export default function SistemaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(true);
  const authSnapshot = useSyncExternalStore(
    subscribeToAuthStorage,
    getAuthSnapshot,
    getServerAuthSnapshot
  );
  const user = useMemo(() => {
    if (!authSnapshot) return null;

    try {
      const auth = JSON.parse(authSnapshot) as { user: string };
      return JSON.parse(auth.user) as User;
    } catch {
      return null;
    }
  }, [authSnapshot]);

  useEffect(() => {
    if (authSnapshot === undefined) return;

    if (!authSnapshot || !user) {
      clearAuth();
      router.push("/login");
    }
  }, [authSnapshot, router, user]);

  const handleLogout = () => {
    clearAuth();
    router.push("/login");
  };

  if (authSnapshot === undefined || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="text-slate-600">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside
        className={`bg-slate-900 text-white transition-all duration-300 ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-800 px-4">
          {!collapsed && <h1 className="text-lg font-bold">Sistema SGP</h1>}

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="rounded-lg px-2 py-1 hover:bg-slate-800"
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

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
          <h2 className="text-lg font-semibold text-slate-900">Sistema SGP</h2>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-900">
                {user.nombre} {user.apellido}
              </p>
              <p className="text-xs capitalize text-slate-500">{user.rol}</p>
            </div>

            <button
              onClick={handleLogout}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm transition hover:border-red-300 hover:bg-red-50 hover:text-red-700"
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
