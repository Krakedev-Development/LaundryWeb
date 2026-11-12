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

// El token de acceso dura poco. La sesión registra aquí cómo renovarlo: ante un 401 de
// una petición autenticada se renueva una sola vez (compartida entre peticiones
// simultáneas) y se repite la petición con el token nuevo.
type Refresher = () => Promise<string | null>;
let refresher: Refresher | null = null;
let refreshing: Promise<string | null> | null = null;

export function setTokenRefresher(fn: Refresher | null) {
  refresher = fn;
}

function renewToken(): Promise<string | null> {
  if (!refresher) return Promise.resolve(null);
  refreshing ??= refresher()
    .catch(() => null)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

// La API devuelve { message: string | string[] } en los errores.
export async function apiRequest<T>(
  path: string,
  init: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const { token, headers, ...rest } = init;
  const send = (bearer: string | null | undefined) =>
    fetch(`${apiUrl}${path}`, {
      ...rest,
      headers: {
        'content-type': 'application/json',
        ...(bearer ? { authorization: `Bearer ${bearer}` } : {}),
        ...headers,
      },
    });
  let response: Response;
  try {
    response = await send(token);
    if (response.status === 401 && token) {
      const renewed = await renewToken();
      if (renewed) response = await send(renewed);
    }
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
