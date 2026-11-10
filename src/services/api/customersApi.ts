import { session } from '../auth/session';
import { apiRequest } from './apiConfig';
import type { Customer } from '../../types';

interface DirectoryEntry {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  kycStatus: 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED';
  kycDocumentType: string | null;
  kycDocumentNumber: string | null;
  kycRejectionReason: string | null;
  kycReviewedAt: string | null;
  addresses: { title: string; fullAddress: string; reference: string | null }[];
  totalOrders: number;
  createdAt: string;
}

// Directorio real de clientes. Billetera, puntos y membresía aún no vienen del servidor,
// por eso se muestran en cero / estándar hasta conectar esos módulos.
export async function listCustomers(): Promise<Customer[]> {
  const rows = await apiRequest<DirectoryEntry[]>('/customers', {
    token: session.getToken(),
  });
  return rows.map((c) => ({
    id: c.id,
    fullName: c.name,
    email: c.email,
    phone: c.phone ?? '',
    documentType: 'CEDULA',
    documentNumber: c.kycDocumentNumber ?? '',
    // El directorio solo distingue aprobado, pendiente y rechazado.
    kycStatus: c.kycStatus === 'NOT_SUBMITTED' ? 'PENDING' : c.kycStatus,
    kycRejectionReason: c.kycRejectionReason ?? undefined,
    kycReviewedAt: c.kycReviewedAt ?? undefined,
    addresses: c.addresses.map((a) => ({
      street: a.fullAddress,
      number: '',
      neighborhood: a.title,
      city: '',
      reference: a.reference ?? undefined,
    })) as Customer['addresses'],
    membership: 'ESTANDAR',
    walletBalance: 0,
    points: 0,
    activePromotionsCount: 0,
    totalOrders: c.totalOrders,
    completedOrders: 0,
    createdAt: c.createdAt.slice(0, 10),
  }));
}
