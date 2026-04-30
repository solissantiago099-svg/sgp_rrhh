export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "https://sgp-rrhh-backend.onrender.com";

export async function fetchJson<T>(
  input: string,
  init?: RequestInit
): Promise<T> {
  // Obtener token del localStorage
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers = new Headers(init?.headers || {});

  // Agregar token si existe
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${input}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    let message = "Ocurrió un error al comunicarse con la API.";

    try {
      const errorBody = await response.json();
      if (errorBody?.message) {
        message = errorBody.message;
      }
    } catch {
      // Si la API no responde JSON, mantenemos el mensaje genérico.
    }

    // Si es 401, redirigir a login
    if (response.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }

    throw new Error(message);
  }

  return response.json() as Promise<T>;
}
