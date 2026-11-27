import { apiRequest } from './apiConfig';
import { session } from '../auth/session';
import type { CatalogItem, DiscountType, Promotion, Reward } from '../../types';
import type { MembershipPlan } from '../../features/commercial/membershipPlans';

function unwrapList<T>(
  payload: T[] | { data?: T[]; items?: T[] } | null | undefined,
): T[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.items)) return payload.items;
  return [];
}

// --- 1. GARMENTS (/catalog/garments) ---

export interface CreateGarmentDto {
  name: string;
  basePrice: number;
  description?: string | null;
  category?: string | null;
  estimatedHours?: number | null;
  icon?: string;
}

export interface UpdateGarmentDto {
  name?: string;
  basePrice?: number;
  description?: string | null;
  category?: string | null;
  estimatedHours?: number | null;
  icon?: string;
  active?: boolean;
}

export interface GarmentResponse {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  estimatedHours?: number | null;
  basePrice: number | string;
  icon?: string | null;
  active: boolean;
}

export async function getGarments(): Promise<GarmentResponse[]> {
  const res = await apiRequest<
    GarmentResponse[] | { data?: GarmentResponse[]; items?: GarmentResponse[] }
  >('/catalog/garments', {
    method: 'GET',
    token: session.getToken(),
  });
  return unwrapList(res);
}

export async function createGarment(
  data: CreateGarmentDto,
): Promise<GarmentResponse> {
  return apiRequest<GarmentResponse>('/catalog/garments', {
    method: 'POST',
    token: session.getToken(),
    body: JSON.stringify(data),
  });
}

export async function updateGarment(
  id: string,
  data: UpdateGarmentDto,
): Promise<GarmentResponse> {
  return apiRequest<GarmentResponse>(`/catalog/garments/${id}`, {
    method: 'PATCH',
    token: session.getToken(),
    body: JSON.stringify(data),
  });
}

// --- 2. SERVICES (/catalog/services) ---

export interface CreateServiceTypeDto {
  name: string;
  extraPrice: number;
  /** null borra la descripción guardada. */
  description?: string | null;
  /** Horas enteras de 1 a 720; null deja el servicio sin tiempo estimado. */
  estimatedHours?: number | null;
}

export interface UpdateServiceTypeDto {
  name?: string;
  extraPrice?: number;
  description?: string | null;
  estimatedHours?: number | null;
  active?: boolean;
}

export interface ServiceTypeResponse {
  id: string;
  name: string;
  description?: string | null;
  extraPrice: number | string;
  estimatedHours?: number | null;
  active: boolean;
}

export async function getServices(): Promise<ServiceTypeResponse[]> {
  const res = await apiRequest<
    | ServiceTypeResponse[]
    | { data?: ServiceTypeResponse[]; items?: ServiceTypeResponse[] }
  >('/catalog/services', {
    method: 'GET',
    token: session.getToken(),
  });
  return unwrapList(res);
}

export async function createService(
  data: CreateServiceTypeDto,
): Promise<ServiceTypeResponse> {
  return apiRequest<ServiceTypeResponse>('/catalog/services', {
    method: 'POST',
    token: session.getToken(),
    body: JSON.stringify(data),
  });
}

export async function updateService(
  id: string,
  data: UpdateServiceTypeDto,
): Promise<ServiceTypeResponse> {
  return apiRequest<ServiceTypeResponse>(`/catalog/services/${id}`, {
    method: 'PATCH',
    token: session.getToken(),
    body: JSON.stringify(data),
  });
}

// --- 3. EXTRAS (/catalog/extras) ---

export interface CreateExtraDto {
  name: string;
  description?: string | null;
  price: number;
}

export interface UpdateExtraDto {
  name?: string;
  description?: string | null;
  price?: number;
  active?: boolean;
}

export interface ExtraResponse {
  id: string;
  name: string;
  description?: string | null;
  price: number | string;
  active: boolean;
}

export async function getExtras(): Promise<ExtraResponse[]> {
  const res = await apiRequest<
    ExtraResponse[] | { data?: ExtraResponse[]; items?: ExtraResponse[] }
  >('/catalog/extras', {
    method: 'GET',
    token: session.getToken(),
  });
  return unwrapList(res);
}

export async function createExtra(data: CreateExtraDto): Promise<ExtraResponse> {
  return apiRequest<ExtraResponse>('/catalog/extras', {
    method: 'POST',
    token: session.getToken(),
    body: JSON.stringify(data),
  });
}

export async function updateExtra(
  id: string,
  data: UpdateExtraDto,
): Promise<ExtraResponse> {
  return apiRequest<ExtraResponse>(`/catalog/extras/${id}`, {
    method: 'PATCH',
    token: session.getToken(),
    body: JSON.stringify(data),
  });
}

// --- 4. MEMBERSHIPS (/catalog/memberships) ---

export interface CreateMembershipPlanDto {
  name: string;
  description?: string | null;
  priceMonthly: number;
  interval?: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  includedWeight?: number | null;
  weightUnit?: 'KG' | 'LB';
  weeklyPickups?: number | null;
  garmentDiscountPercent: number;
  priorityService?: boolean;
  benefits: string[];
}

export interface UpdateMembershipPlanDto {
  name?: string;
  description?: string | null;
  priceMonthly?: number;
  interval?: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  includedWeight?: number | null;
  weightUnit?: 'KG' | 'LB';
  weeklyPickups?: number | null;
  garmentDiscountPercent?: number;
  priorityService?: boolean;
  benefits?: string[];
  active?: boolean;
}

export interface MembershipPlanResponse {
  id: string;
  name: string;
  description?: string | null;
  priceMonthly: number | string;
  interval?: 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | null;
  includedWeight?: number | string | null;
  weightUnit?: 'KG' | 'LB' | null;
  weeklyPickups?: number | null;
  garmentDiscountPercent: number | string;
  priorityService?: boolean;
  benefits?: string[] | null;
  active?: boolean;
  activeSubscribersCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface MembershipSubscriber {
  customerId: string;
  name: string;
  email: string;
  phone: string | null;
  startedAt: string | null;
  expiresAt: string | null;
  status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED';
  weeklyPickupsUsed: number;
  weeklyPickupsLimit: number | null;
}

export async function getMemberships(): Promise<MembershipPlanResponse[]> {
  const res = await apiRequest<
    | MembershipPlanResponse[]
    | { data?: MembershipPlanResponse[]; items?: MembershipPlanResponse[] }
  >('/catalog/memberships', {
    method: 'GET',
    token: session.getToken(),
  });
  return unwrapList(res);
}

export async function createMembership(
  data: CreateMembershipPlanDto,
): Promise<MembershipPlanResponse> {
  return apiRequest<MembershipPlanResponse>('/catalog/memberships', {
    method: 'POST',
    token: session.getToken(),
    body: JSON.stringify(data),
  });
}

export async function updateMembership(
  id: string,
  data: UpdateMembershipPlanDto,
): Promise<MembershipPlanResponse> {
  return apiRequest<MembershipPlanResponse>(`/catalog/memberships/${id}`, {
    method: 'PATCH',
    token: session.getToken(),
    body: JSON.stringify(data),
  });
}

export async function getMembershipSubscribers(
  planId: string,
): Promise<MembershipSubscriber[]> {
  return apiRequest<MembershipSubscriber[]>(
    `/catalog/memberships/${planId}/subscribers`,
    {
      method: 'GET',
      token: session.getToken(),
    },
  );
}

// --- 5. PROMOTIONS (/catalog/promotions) ---

export interface CreatePromotionDto {
  code: string;
  description?: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  minOrderAmount?: number;
  validFrom?: string;
  validUntil?: string;
  maxUses?: number;
}

export interface UpdatePromotionDto {
  description?: string;
  discountValue?: number;
  minOrderAmount?: number;
  validFrom?: string;
  validUntil?: string;
  maxUses?: number;
  active?: boolean;
}

export interface PromotionResponse {
  id: string;
  code: string;
  name?: string | null;
  description?: string | null;
  discountType: DiscountType;
  discountValue: number | string;
  minOrderAmount?: number | string | null;
  validFrom?: string | null;
  validUntil?: string | null;
  maxUses?: number | null;
  usedCount?: number | null;
  usageCount?: number | null;
  active?: boolean;
}

export async function getPromotions(): Promise<PromotionResponse[]> {
  const res = await apiRequest<
    | PromotionResponse[]
    | { data?: PromotionResponse[]; items?: PromotionResponse[] }
  >('/catalog/promotions', {
    method: 'GET',
    token: session.getToken(),
  });
  return unwrapList(res);
}

export async function createPromotion(
  data: CreatePromotionDto,
): Promise<PromotionResponse> {
  return apiRequest<PromotionResponse>('/catalog/promotions', {
    method: 'POST',
    token: session.getToken(),
    body: JSON.stringify(data),
  });
}

export async function updatePromotion(
  id: string,
  data: UpdatePromotionDto,
): Promise<PromotionResponse> {
  return apiRequest<PromotionResponse>(`/catalog/promotions/${id}`, {
    method: 'PATCH',
    token: session.getToken(),
    body: JSON.stringify(data),
  });
}

// --- 6. REWARDS (/catalog/rewards) ---

export interface CreateRewardDto {
  title: string;
  description?: string;
  category?: string;
  pointsCost: number;
}

export interface UpdateRewardDto {
  title?: string;
  description?: string;
  category?: string;
  pointsCost?: number;
  active?: boolean;
}

export interface RewardResponse {
  id: string;
  title: string;
  description?: string | null;
  category?: string | null;
  pointsCost: number | string;
  active?: boolean;
}

export async function getRewards(): Promise<RewardResponse[]> {
  const res = await apiRequest<
    RewardResponse[] | { data?: RewardResponse[]; items?: RewardResponse[] }
  >('/catalog/rewards', {
    method: 'GET',
    token: session.getToken(),
  });
  return unwrapList(res);
}

export async function createReward(
  data: CreateRewardDto,
): Promise<RewardResponse> {
  return apiRequest<RewardResponse>('/catalog/rewards', {
    method: 'POST',
    token: session.getToken(),
    body: JSON.stringify(data),
  });
}

export async function updateReward(
  id: string,
  data: UpdateRewardDto,
): Promise<RewardResponse> {
  return apiRequest<RewardResponse>(`/catalog/rewards/${id}`, {
    method: 'PATCH',
    token: session.getToken(),
    body: JSON.stringify(data),
  });
}

// --- MAPPERS TO FRONTEND DOMAIN MODELS ---

export function mapGarmentToCatalogItem(
  garment: GarmentResponse,
): CatalogItem {
  const price = Number(garment.basePrice) || 0;
  return {
    id: garment.id,
    name: garment.name,
    category: 'PRENDAS',
    type: garment.category ?? garment.icon ?? 'Prenda Individual',
    description: garment.description ?? '',
    price,
    pricingModel: 'FIXED',
    weightUnit: 'LB',
    compatibleWithWeight: true,
    customerSelectable: true,
    restrictions: [],
    estimatedHours: garment.estimatedHours ?? 0,
    minHours: 0,
    maxHours: 0,
    status: garment.active === false ? 'INACTIVE' : 'ACTIVE',
    icon: garment.icon ?? undefined,
  };
}

export function mapServiceToCatalogItem(
  service: ServiceTypeResponse,
  existing?: CatalogItem,
): CatalogItem {
  const price = Number(service.extraPrice) || 0;
  return {
    id: service.id,
    name: service.name,
    category: 'SERVICIOS',
    type: existing?.type || 'Servicio de Lavandería',
    // Descripción y tiempo estimado vienen del servidor: lo que ve el cliente en la app.
    description: service.description ?? '',
    price,
    pricingModel: existing?.pricingModel ?? 'FIXED',
    weightUnit: existing?.weightUnit ?? 'KG',
    pricePerWeightUnit:
      existing?.pricingModel === 'PER_WEIGHT' ? price : existing?.pricePerWeightUnit,
    compatibleWithWeight: existing?.compatibleWithWeight ?? true,
    customerSelectable: existing?.customerSelectable ?? true,
    restrictions: existing?.restrictions ?? [],
    estimatedHours: service.estimatedHours ?? 0,
    minHours: existing?.minHours ?? 12,
    maxHours: existing?.maxHours ?? 48,
    status: service.active === false ? 'INACTIVE' : 'ACTIVE',
  };
}

/** Horas del formulario para el servidor: vacío o 0 deja el servicio sin tiempo estimado. */
export function serviceHoursError(hours: number): string | undefined {
  if (!hours) return undefined;
  if (!Number.isInteger(hours) || hours < 1 || hours > 720)
    return 'El tiempo estimado va de 1 a 720 horas enteras (30 días).';
  return undefined;
}

export function mapExtraToCatalogItem(
  extra: ExtraResponse,
  existing?: CatalogItem,
): CatalogItem {
  const price = Number(extra.price) || 0;
  return {
    id: extra.id,
    name: extra.name,
    category: 'EXTRAS',
    type: existing?.type || 'Acabado & Empaque',
    description: extra.description ?? existing?.description ?? '',
    price,
    pricingModel: 'FIXED',
    compatibleWithWeight: existing?.compatibleWithWeight ?? true,
    customerSelectable: existing?.customerSelectable ?? true,
    restrictions: existing?.restrictions ?? [],
    estimatedHours: existing?.estimatedHours ?? 0,
    minHours: existing?.minHours ?? 0,
    maxHours: existing?.maxHours ?? 0,
    status: extra.active === false ? 'INACTIVE' : 'ACTIVE',
  };
}

export async function fetchAllCatalogItems(
  existingCatalog: CatalogItem[] = [],
): Promise<CatalogItem[]> {
  const byId = new Map(existingCatalog.map((item) => [item.id, item]));
  const [garments, services, extras] = await Promise.all([
    getGarments(),
    getServices(),
    getExtras(),
  ]);
  return [
    ...garments.map((g) => mapGarmentToCatalogItem(g)),
    ...services.map((s) => mapServiceToCatalogItem(s, byId.get(s.id))),
    ...extras.map((e) => mapExtraToCatalogItem(e, byId.get(e.id))),
  ];
}

export function mapMembershipResponseToPlan(
  raw: MembershipPlanResponse,
): MembershipPlan {
  const benefits = Array.isArray(raw.benefits) ? raw.benefits : [];
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description ?? '',
    price: Number(raw.priceMonthly) || 0,
    interval: raw.interval ?? 'MONTHLY',
    includedWeight: raw.includedWeight != null ? Number(raw.includedWeight) || 0 : 0,
    weightUnit: raw.weightUnit === 'LB' ? 'LB' : 'KG',
    includedPickups: raw.weeklyPickups === null ? null : Number(raw.weeklyPickups ?? 0),
    discountPercent: Number(raw.garmentDiscountPercent) || 0,
    priorityService: Boolean(raw.priorityService),
    benefits,
    status: raw.active === false ? 'INACTIVE' : 'ACTIVE',
    activeSubscribersCount: raw.activeSubscribersCount ?? 0,
    createdAt: raw.createdAt ?? new Date().toISOString(),
    updatedAt: raw.updatedAt ?? new Date().toISOString(),
  };
}

export function mapPromotionResponseToPromotion(
  raw: PromotionResponse,
  existing?: Promotion,
): Promotion {
  const startDate = raw.validFrom
    ? raw.validFrom.slice(0, 10)
    : (existing?.startDate ?? new Date().toISOString().slice(0, 10));
  const endDate = raw.validUntil
    ? raw.validUntil.slice(0, 10)
    : (existing?.endDate ?? '2026-12-31');
  const nowIso = new Date().toISOString().slice(0, 10);
  let status: Promotion['status'] = 'ACTIVE';
  if (raw.active === false) {
    status = 'PAUSED';
  } else if (endDate < nowIso) {
    status = 'EXPIRED';
  } else if (startDate > nowIso) {
    status = 'SCHEDULED';
  }

  return {
    id: raw.id,
    code: raw.code,
    name: raw.name || existing?.name || raw.description || `Campaña ${raw.code}`,
    description: raw.description ?? existing?.description ?? '',
    discountType: raw.discountType ?? 'PERCENTAGE',
    discountValue: Number(raw.discountValue) || 0,
    minOrderAmount: Number(raw.minOrderAmount ?? existing?.minOrderAmount ?? 0),
    usageLimit: Number(raw.maxUses ?? existing?.usageLimit ?? 100),
    usageCount: Number(raw.usedCount ?? raw.usageCount ?? existing?.usageCount ?? 0),
    applicableServices: existing?.applicableServices?.length
      ? existing.applicableServices
      : ['Todos los servicios'],
    startDate,
    endDate,
    status,
    imageUrl: existing?.imageUrl,
  };
}

export function mapRewardResponseToReward(
  raw: RewardResponse,
  existing?: Reward,
): Reward {
  return {
    id: raw.id,
    name: raw.title,
    description:
      raw.description ??
      existing?.description ??
      (raw.category ? `Categoría: ${raw.category}` : ''),
    pointsCost: Number(raw.pointsCost) || 0,
    minPurchases: existing?.minPurchases ?? 1,
    minSpend: existing?.minSpend ?? 0,
    validityDays: existing?.validityDays ?? 30,
    status: raw.active === false ? 'INACTIVE' : 'ACTIVE',
  };
}
