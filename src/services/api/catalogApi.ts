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
  icon?: string;
}

export interface UpdateGarmentDto {
  name?: string;
  basePrice?: number;
  icon?: string;
  active?: boolean;
}

export interface GarmentResponse {
  id: string;
  name: string;
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
}

export interface UpdateServiceTypeDto {
  name?: string;
  extraPrice?: number;
  active?: boolean;
}

export interface ServiceTypeResponse {
  id: string;
  name: string;
  extraPrice: number | string;
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
  description?: string;
  price: number;
}

export interface UpdateExtraDto {
  name?: string;
  description?: string;
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
  priceMonthly: number;
  weeklyPickups?: number;
  garmentDiscountPercent: number;
  benefits: string[];
}

export interface UpdateMembershipPlanDto {
  name?: string;
  priceMonthly?: number;
  weeklyPickups?: number;
  garmentDiscountPercent?: number;
  benefits?: string[];
  active?: boolean;
}

export interface MembershipPlanResponse {
  id: string;
  name: string;
  description?: string | null;
  priceMonthly: number | string;
  weeklyPickups?: number | null;
  garmentDiscountPercent: number | string;
  benefits?: string[] | null;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
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
  existing?: CatalogItem,
): CatalogItem {
  const price = Number(garment.basePrice) || 0;
  return {
    id: garment.id,
    name: garment.name,
    category: 'PRENDAS',
    type: existing?.type || garment.icon || 'Prenda Individual',
    description: existing?.description || 'Prenda registrada en catálogo',
    price,
    pricingModel: existing?.pricingModel ?? 'FIXED',
    weightUnit: existing?.weightUnit ?? 'LB',
    pricePerWeightUnit:
      existing?.pricingModel === 'PER_WEIGHT' ? price : existing?.pricePerWeightUnit,
    compatibleWithWeight: existing?.compatibleWithWeight ?? true,
    customerSelectable: existing?.customerSelectable ?? true,
    restrictions: existing?.restrictions ?? [],
    estimatedHours: existing?.estimatedHours ?? 24,
    minHours: existing?.minHours ?? 12,
    maxHours: existing?.maxHours ?? 48,
    status: garment.active === false ? 'INACTIVE' : 'ACTIVE',
    icon: garment.icon ?? existing?.icon,
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
    description: existing?.description || 'Modalidad de procesamiento y cuidado',
    price,
    pricingModel: existing?.pricingModel ?? 'FIXED',
    weightUnit: existing?.weightUnit ?? 'KG',
    pricePerWeightUnit:
      existing?.pricingModel === 'PER_WEIGHT' ? price : existing?.pricePerWeightUnit,
    compatibleWithWeight: existing?.compatibleWithWeight ?? true,
    customerSelectable: existing?.customerSelectable ?? true,
    restrictions: existing?.restrictions ?? [],
    estimatedHours: existing?.estimatedHours ?? 24,
    minHours: existing?.minHours ?? 12,
    maxHours: existing?.maxHours ?? 48,
    status: service.active === false ? 'INACTIVE' : 'ACTIVE',
  };
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
    ...garments.map((g) => mapGarmentToCatalogItem(g, byId.get(g.id))),
    ...services.map((s) => mapServiceToCatalogItem(s, byId.get(s.id))),
    ...extras.map((e) => mapExtraToCatalogItem(e, byId.get(e.id))),
  ];
}

export function mapMembershipResponseToPlan(
  raw: MembershipPlanResponse,
  existing?: MembershipPlan,
): MembershipPlan {
  const benefits = Array.isArray(raw.benefits) ? raw.benefits : [];
  return {
    id: raw.id,
    name: raw.name,
    description:
      raw.description ??
      existing?.description ??
      (benefits.length ? benefits[0] : 'Plan de suscripción comercial'),
    price: Number(raw.priceMonthly) || 0,
    interval: existing?.interval ?? 'MONTHLY',
    includedWeight: existing?.includedWeight ?? 0,
    weightUnit: existing?.weightUnit ?? 'KG',
    includedPickups: Number(raw.weeklyPickups ?? existing?.includedPickups ?? 0),
    discountPercent: Number(raw.garmentDiscountPercent) || 0,
    priorityService: existing?.priorityService ?? false,
    benefits,
    status: raw.active === false ? 'INACTIVE' : 'ACTIVE',
    createdAt: raw.createdAt ?? existing?.createdAt ?? new Date().toISOString(),
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
