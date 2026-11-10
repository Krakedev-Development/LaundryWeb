import { useEffect, useSyncExternalStore } from 'react';
import { session } from '../auth/session';
import { ApiError, apiRequest, apiUrl } from './apiConfig';

export type KycStatus = 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED';
export type KycDocumentType = 'SELFIE' | 'ID_FRONT' | 'ID_BACK';

export interface KycRequest {
  id: string;
  kycStatus: KycStatus;
  kycDocumentType: string | null;
  kycDocumentNumber: string | null;
  kycSubmissions: number;
  kycRejectionReason: string | null;
  kycReviewedAt: string | null;
  updatedAt: string;
  user: { name: string; email: string; phone: string | null; createdAt: string };
}

export interface KycDetail extends KycRequest {
  documents: {
    type: KycDocumentType;
    mimeType: string;
    sizeBytes: number;
    createdAt: string;
  }[];
}

export const listKyc = (status: KycStatus) =>
  apiRequest<KycRequest[]>(`/kyc?status=${status}`, {
    token: session.getToken(),
  });

export const getKycDetail = (customerId: string) =>
  apiRequest<KycDetail>(`/kyc/${customerId}`, { token: session.getToken() });

export const reviewKyc = (
  customerId: string,
  approve: boolean,
  reason?: string,
) =>
  apiRequest<{ customerId: string; status: KycStatus }>(
    `/kyc/${customerId}/review`,
    {
      method: 'POST',
      token: session.getToken(),
      body: JSON.stringify({ approve, reason }),
    },
  );

// Una etiqueta <img> no envía el token: la imagen se pide con la sesión y se muestra
// como un objeto temporal del navegador. Quien lo use debe liberar la URL.
export async function fetchKycDocumentUrl(
  customerId: string,
  type: KycDocumentType,
): Promise<string> {
  let response: Response;
  try {
    response = await fetch(`${apiUrl}/kyc/${customerId}/documents/${type}`, {
      headers: { authorization: `Bearer ${session.getToken() ?? ''}` },
      cache: 'no-store',
    });
  } catch {
    throw new ApiError('No se pudo conectar con el servidor.', 0);
  }
  if (!response.ok)
    throw new ApiError('No se pudo cargar la imagen.', response.status);
  return URL.createObjectURL(await response.blob());
}

// ---- Cola de pendientes compartida (insignia del menú, avisos y panel)

let pending: KycRequest[] = [];
const listeners = new Set<() => void>();
const publish = (next: KycRequest[]) => {
  pending = next;
  listeners.forEach((l) => l());
};

export async function refreshPendingKyc(): Promise<void> {
  try {
    publish(await listKyc('PENDING'));
  } catch {
    publish([]);
  }
}

const NO_PENDING: KycRequest[] = [];

// Solicitudes pendientes de revisión; solo el administrador las consulta.
export function usePendingKyc(enabled: boolean, poll = false): KycRequest[] {
  useEffect(() => {
    if (!enabled || !poll) return;
    void refreshPendingKyc();
    const timer = window.setInterval(() => void refreshPendingKyc(), 60_000);
    return () => window.clearInterval(timer);
  }, [enabled, poll]);
  const list = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => pending,
  );
  return enabled ? list : NO_PENDING;
}
