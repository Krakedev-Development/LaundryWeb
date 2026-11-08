// URL base de la API (p. ej. http://localhost:4000/api/v1). Se define por instalación.
const raw =
  (import.meta.env.VITE_API_URL as string | undefined) ||
  'http://localhost:4000/api/v1';

export const apiUrl = raw.replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

// La API devuelve { message: string | string[] } en los errores.
export async function apiRequest<T>(
  path: string,
  init: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const { token, headers, ...rest } = init;
  let response: Response;
  try {
    response = await fetch(`${apiUrl}${path}`, {
      ...rest,
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    });
  } catch {
    throw new ApiError('No se pudo conectar con el servidor.', 0);
  }
  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = Array.isArray(body?.message)
      ? body.message.join(' ')
      : (body?.message ?? 'No se pudo completar la solicitud.');
    throw new ApiError(message, response.status);
  }
  return body as T;
}
