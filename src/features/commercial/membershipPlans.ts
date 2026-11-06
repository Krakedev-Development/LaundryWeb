export interface MembershipPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  interval: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  includedWeight: number;
  weightUnit: 'KG' | 'LB';
  includedPickups: number;
  discountPercent: number;
  priorityService: boolean;
  benefits: string[];
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export const MEMBERSHIP_INTERVALS = {
  MONTHLY: 'Mensual',
  QUARTERLY: 'Trimestral',
  YEARLY: 'Anual',
} as const;

export function validateMembershipPlan(
  plan: MembershipPlan,
  plans: MembershipPlan[],
) {
  if (!plan.name.trim()) throw Error('Escribe el nombre de la membresía.');
  if (
    plans.some(
      (item) =>
        item.id !== plan.id &&
        item.name.trim().toLocaleLowerCase() ===
          plan.name.trim().toLocaleLowerCase(),
    )
  )
    throw Error('Ya existe una membresía con ese nombre.');
  if (!Number.isFinite(plan.price) || plan.price < 0)
    throw Error('El precio debe ser un importe mayor o igual a cero.');
  if (!Number.isFinite(plan.includedWeight) || plan.includedWeight < 0)
    throw Error('El peso incluido debe ser mayor o igual a cero.');
  if (!Number.isInteger(plan.includedPickups) || plan.includedPickups < 0)
    throw Error(
      'Las recogidas deben ser un número entero mayor o igual a cero.',
    );
  if (
    !Number.isFinite(plan.discountPercent) ||
    plan.discountPercent < 0 ||
    plan.discountPercent > 100
  )
    throw Error('El descuento debe estar entre 0 y 100 %.');
  if (
    !(plan.interval in MEMBERSHIP_INTERVALS) ||
    !['KG', 'LB'].includes(plan.weightUnit) ||
    !['ACTIVE', 'INACTIVE'].includes(plan.status)
  )
    throw Error('Revisa la periodicidad, unidad y estado.');
}
