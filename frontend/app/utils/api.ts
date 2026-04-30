export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "https://sgp-rrhh-backend.onrender.com";

export async function fetchJson<T>(
  input: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${input}`, init);

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

    throw new Error(message);
  }

  return response.json() as Promise<T>;
}
