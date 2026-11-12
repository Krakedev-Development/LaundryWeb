import type { ActivityItem } from '../../services/api/staffApi';

// Texto legible de cada acción registrada por el servidor. Las acciones que no estén
// aquí se muestran con un texto genérico en lugar del código interno.
const ACTIONS: Record<string, string> = {
  LOGIN: 'Inició sesión',
  LEG_ASSIGNED: 'Asignó un chofer',
  KYC_APPROVED: 'Aprobó una verificación de identidad',
  KYC_REJECTED: 'Rechazó una verificación de identidad',
  KYC_DOCUMENT_VIEWED: 'Consultó un documento de identidad',
  ZONE_CREATED: 'Creó una zona',
  ZONE_UPDATED: 'Actualizó una zona',
  FACILITY_CREATED: 'Creó una sede',
  FACILITY_UPDATED: 'Actualizó una sede',
  SLOT_CREATED: 'Creó un horario',
  SLOT_UPDATED: 'Actualizó un horario',
  REDEMPTION_APPROVED: 'Aprobó un canje de puntos',
  REDEMPTION_REJECTED: 'Rechazó un canje de puntos',
  POLICY_PUBLISHED: 'Publicó la política del negocio',
  DRIVER_CREATED: 'Creó una cuenta de chofer',
  SUPERVISOR_CREATED: 'Creó una cuenta de supervisor',
  ADMIN_CREATED: 'Creó una cuenta de administrador',
  USER_SUSPENDED: 'Suspendió una cuenta',
  USER_REACTIVATED: 'Reactivó una cuenta',
  PASSWORD_RESET: 'Restableció una contraseña',
  WALLET_MANUAL_CREDIT: 'Acreditó saldo manualmente',
  CHARGE_WAIVED: 'Condonó un cargo',
  HANDOFF_ISSUED: 'Generó un código de entrega',
  HANDOFF_VERIFIED: 'Verificó una entrega',
  HANDOFF_REVOKED: 'Anuló un código de entrega',
  HANDOFF_REVOKED_BY_REISSUE: 'Reemplazó un código de entrega',
  HANDOFF_EXPIRED: 'Un código de entrega venció',
  HANDOFF_FAILED_ATTEMPT: 'Intento fallido de verificar una entrega',
  HANDOFF_LOCKED: 'Un código de entrega se bloqueó por intentos',
};

const CATALOG: Record<string, string> = {
  GARMENTTYPE: 'una prenda',
  SERVICETYPE: 'un servicio',
  EXTRA: 'un extra',
  MEMBERSHIPPLAN: 'una membresía',
  REWARD: 'una recompensa',
  PROMOTION: 'una promoción',
};

export const formatOrderNumber = (n: number) => `SOL-${String(n).padStart(4, '0')}`;

export function activityLabel(item: ActivityItem): string {
  if (item.source === 'ORDER') return item.detail || 'Actualizó una solicitud';
  const known = ACTIONS[item.action];
  if (known) return known;
  const catalog = item.action.match(/^([A-Z]+)_(CREATED|UPDATED)$/);
  if (catalog && CATALOG[catalog[1]])
    return `${catalog[2] === 'CREATED' ? 'Creó' : 'Actualizó'} ${CATALOG[catalog[1]]} del catálogo`;
  return 'Realizó una acción en el sistema';
}

// Información secundaria: la solicitud afectada o el motivo registrado.
export function activityContext(item: ActivityItem): string | null {
  const parts: string[] = [];
  if (item.orderNumber) parts.push(`Solicitud ${formatOrderNumber(item.orderNumber)}`);
  if (item.source === 'AUDIT' && item.detail) parts.push(`Motivo: ${item.detail}`);
  return parts.length ? parts.join(' · ') : null;
}
