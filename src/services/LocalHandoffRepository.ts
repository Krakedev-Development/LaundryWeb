import type { HandoffState } from './HandoffService';
/** The host owns storage and commits its complete workflow envelope atomically. */
export class LocalHandoffRepository {
  constructor(
    public readonly read: () => HandoffState,
    public readonly transaction: (work: (state: HandoffState) => void) => void,
  ) {}
  listByOrder(orderId: string) {
    return this.read().handoffs.filter((h) => h.orderId === orderId);
  }
  getById(id: string) {
    return this.read().handoffs.find((h) => h.id === id);
  }
  getByToken(token: string) {
    return this.read().handoffs.find((h) => h.qrToken === token);
  }
  getByCode(code: string) {
    return this.read().handoffs.find((h) => h.fallbackCode === code);
  }
}
/** Future backend transport. Local validation never pretends to be server authority. */
export interface HandoffApi {
  list(orderId: string): Promise<unknown>;
  verify(input: { code: string; expectedHandoffId?: string }): Promise<unknown>;
  confirm(input: {
    verificationId: string;
    count?: number;
    recipient?: string;
    relationship?: string;
    notes?: string;
    idempotencyKey: string;
  }): Promise<unknown>;
  regenerate(input: { handoffId: string; reason: string }): Promise<unknown>;
  revoke(input: { handoffId: string; reason: string }): Promise<unknown>;
}
