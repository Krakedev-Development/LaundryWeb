import {
  Actor,
  advanceOperational,
  Handoff,
  HandoffAudit,
  HandoffType,
  migrateOrder,
  operationalStage,
  WorkflowOrder,
  handoffTypesFor,
} from "./fulfillment";

export interface HandoffState {
  orders: WorkflowOrder[];
  handoffs: Handoff[];
  handoffAudits: HandoffAudit[];
}
export interface Confirmation {
  ticket: string;
  count?: number;
  recipient?: string;
  relationship?: string;
  notes?: string;
  overrideReason?: string;
}
export interface HandoffPort {
  read(): HandoffState;
  transaction(work: (state: HandoffState) => void): void;
  actor(id: string): Actor;
  paid(order: WorkflowOrder): boolean;
  intakeAllowed?(order: WorkflowOrder): boolean;
  declaredCount(order: WorkflowOrder): number;
  blocked?(order: WorkflowOrder): boolean;
  random(): string;
  confirmed(
    state: HandoffState,
    order: WorkflowOrder,
    handoff: Handoff,
    actor: Actor,
  ): void;
  resolved?(
    state: HandoffState,
    order: WorkflowOrder,
    actor: Actor,
    reason: string,
  ): void;
}
export interface Verification {
  ticket: string;
  handoff: Handoff;
  order: WorkflowOrder;
  localValidation: true;
  warning: string;
}
const trivialCode = (code: string) =>
  /^(\d)\1{5}$/.test(code) ||
  [
    "123456",
    "234567",
    "345678",
    "456789",
    "567890",
    "654321",
    "543210",
    "987654",
    "876543",
    "765432",
  ].includes(code);
const inbound = (type: HandoffType) =>
  ["CUSTOMER_TO_FACILITY", "CUSTOMER_TO_DRIVER", "DRIVER_TO_FACILITY"].includes(
    type,
  );
const drivers = (type: HandoffType) =>
  ["CUSTOMER_TO_DRIVER", "DRIVER_TO_CUSTOMER"].includes(type);
const customerTransfers = (type: HandoffType) =>
  ["FACILITY_TO_CUSTOMER", "DRIVER_TO_CUSTOMER"].includes(type);

/** All mutations go through one repository transaction. Verification never transfers custody. */
export class HandoffService {
  private tickets = new Map<
    string,
    {
      id: string;
      generation: number;
      actorId: string;
      override?: boolean;
      reason?: string;
    }
  >();
  constructor(private port: HandoffPort) {}
  private audit(
    state: HandoffState,
    handoff: Handoff,
    actor: Actor,
    action: string,
    reason?: string,
  ) {
    state.handoffAudits.push({
      id: `AUD-${this.port.random()}`,
      handoffId: handoff.id,
      orderId: handoff.orderId,
      action,
      actorId: actor.id,
      actorRole: actor.role,
      at: new Date().toISOString(),
      reason,
      localValidation: true,
    });
  }
  private allowed(
    order: WorkflowOrder,
    h: Handoff,
    actor: Actor,
    override = false,
  ) {
    if (!this.port.paid(order) && !(inbound(h.type) && this.port.intakeAllowed?.(order)))
      throw new Error("El pago debe estar confirmado.");
    if (order.facilityId !== h.facilityId)
      throw new Error("La sede del pedido cambió; revisa la transferencia.");
    if (order.intakeHold && !order.intakeHold.resolvedAt && !inbound(h.type))
      throw new Error(
        "Resuelve la diferencia de prendas antes de liberar el pedido.",
      );
    if (!inbound(h.type) && this.port.blocked?.(order)) throw new Error('Resuelve las incidencias pendientes antes de liberar o completar el pedido.');
    if (["DRIVER_TO_FACILITY", "FACILITY_TO_DRIVER"].includes(h.type)) {
      const leg =
        h.type === "DRIVER_TO_FACILITY"
          ? order.fulfillment!.inbound
          : order.fulfillment!.outbound;
      if (
        !leg.driverId ||
        !leg.driverAssignmentId ||
        h.driverAssignmentId !== leg.driverAssignmentId
      )
        throw new Error(
          "La transferencia debe corresponder a la asignación vigente del chofer.",
        );
    }
    if (
      override &&
      (actor.role !== "ADMIN" || actor.facilityId !== h.facilityId)
    )
      throw new Error("El override requiere un administrador de esta sede.");
    if (drivers(h.type)) {
      const leg = inbound(h.type)
        ? order.fulfillment!.inbound
        : order.fulfillment!.outbound;
      if (
        !leg.driverId ||
        !leg.driverAssignmentId ||
        (!override && (actor.role !== "DRIVER" || actor.id !== leg.driverId)) ||
        h.driverAssignmentId !== leg.driverAssignmentId
      )
        throw new Error(
          "Solo el chofer asignado puede confirmar esta transferencia.",
        );
    } else if (
      !["ADMIN", "SUPERVISOR"].includes(actor.role) ||
      actor.facilityId !== h.facilityId
    )
      throw new Error("Selecciona un operador autorizado de esta sede.");
    const stage = operationalStage(order);
    const valid: Record<HandoffType, boolean> = {
      CUSTOMER_TO_FACILITY:
        order.fulfillment!.inbound.method === "CUSTOMER" &&
        order.status === "AWAITING_INTAKE",
      CUSTOMER_TO_DRIVER: stage === "ARRIVED_FOR_PICKUP",
      DRIVER_TO_FACILITY: stage === "ARRIVED_AT_FACILITY",
      FACILITY_TO_DRIVER:
        order.status === "READY" &&
        order.fulfillment!.outbound.method === "DRIVER" &&
        order.fulfillment!.outbound.milestone === "ASSIGNED",
      DRIVER_TO_CUSTOMER:
        stage === "ARRIVED_FOR_DELIVERY" &&
        this.used(order.id, "FACILITY_TO_DRIVER"),
      FACILITY_TO_CUSTOMER:
        order.status === "READY" && order.fulfillment!.outbound.method === "CUSTOMER",
    };
    if (!valid[h.type])
      throw new Error("Esta transferencia no corresponde a la etapa actual.");
  }
  private used(orderId: string, type: HandoffType) {
    return this.port
      .read()
      .handoffs.some(
        (h) => h.orderId === orderId && h.type === type && h.status === "USED",
      );
  }
  initialize(
    state: HandoffState,
    order: WorkflowOrder,
    fixture = false,
    legacy = false,
  ) {
    migrateOrder(order);
    const types = handoffTypesFor(order.fulfillment!.mode);
    types.forEach((type, index) => {
      const existing = state.handoffs.find((h) => h.orderId === order.id && h.type === type && !['REVOKED','EXPIRED'].includes(h.status));
      const ids = (inbound(type) ? order.fulfillment!.inbound : order.fulfillment!.outbound).handoffIds;
      if (existing) { if (!ids.includes(existing.id)) ids.push(existing.id); return; }
      let code: string;
      if (fixture && ['SOL-STORE-001','SOL-HOME-001'].includes(order.id))
        code = String(
          (order.id === "SOL-STORE-001" ? 583214 : 726483) + index * 137,
        );
      else {
        let tries = 0;
        do {
          code = String(
            100000 + (parseInt(this.port.random().slice(0, 10), 16) % 900000),
          );
          if (++tries > 100)
            throw new Error("No se pudo generar un código único.");
        } while (
          trivialCode(code) ||
          state.handoffs.some((h) => h.fallbackCode === code)
        );
      }
      const now = new Date().toISOString();
      const id = fixture && ['SOL-STORE-001','SOL-HOME-001'].includes(order.id)
        ? `HND-${order.id}-${index + 1}`
        : `HND-${this.port.random()}`;
      const h: Handoff = {
        id,
        orderId: order.id,
        type,
        facilityId: order.facilityId,
        qrToken: fixture && ['SOL-STORE-001','SOL-HOME-001'].includes(order.id)
          ? `demo-${order.id}-${type}-e7b451cf6d924a08`
          : this.port.random(),
        fallbackCode: code,
        generation: 1 + Math.max(0, ...state.handoffs.filter(h => h.orderId === order.id && h.type === type).map(h => h.generation)),
        status: "PENDING",
        attempts: 0,
        maxAttempts: 5,
        createdAt: now,
        updatedAt: now,
      };
      state.handoffs.push(h);
      (inbound(type)
        ? order.fulfillment!.inbound
        : order.fulfillment!.outbound
      ).handoffIds.push(id);
      if (legacy) {
        const f = order.fulfillment!;
        const completed =
          (type === "CUSTOMER_TO_DRIVER" &&
            (f.inbound.status === "COMPLETED" ||
              ["COLLECTED", "TO_FACILITY", "ARRIVED_AT_FACILITY"].includes(
                f.inbound.milestone,
              ))) ||
          (type === "DRIVER_TO_FACILITY" && f.inbound.status === "COMPLETED") ||
          (type === "FACILITY_TO_DRIVER" &&
            ["EN_ROUTE", "ARRIVED", "DELIVERED"].includes(
              f.outbound.milestone,
            )) ||
          (type === "DRIVER_TO_CUSTOMER" && order.status === "COMPLETED");
        if (completed) {
          h.status = "USED";
          h.usedAt = now;
          h.usedByUserId = "LEGACY-MIGRATION";
          this.audit(
            state,
            h,
            { id: "LEGACY-MIGRATION", role: "SYSTEM", name: "Migración local" },
            "LEGACY_CUSTODY_IMPORTED",
            "La etapa anterior acredita una transferencia previa; no fue verificada mediante QR.",
          );
        }
      }
    });
    this.refresh(state, order);
  }
  refresh(state: HandoffState, order: WorkflowOrder) {
    if (!order.fulfillment) return;
    const stage = operationalStage(order);
    state.handoffs
      .filter(
        (h) =>
          h.orderId === order.id && ["PENDING", "ACTIVE"].includes(h.status),
      )
      .forEach((h) => {
        const leg = inbound(h.type)
          ? order.fulfillment!.inbound
          : order.fulfillment!.outbound;
        h.driverAssignmentId = leg.driverAssignmentId;
        const active =
          (this.port.paid(order) || (inbound(h.type) && this.port.intakeAllowed?.(order))) &&
          !order.quarantineReason &&
          !(order.intakeHold && !order.intakeHold.resolvedAt) &&
          ((h.type === "CUSTOMER_TO_FACILITY" &&
            order.fulfillment!.inbound.method === "CUSTOMER" &&
            order.status === "AWAITING_INTAKE") ||
            (h.type === "CUSTOMER_TO_DRIVER" &&
              stage === "ARRIVED_FOR_PICKUP") ||
            (h.type === "DRIVER_TO_FACILITY" &&
              stage === "ARRIVED_AT_FACILITY") ||
            (h.type === "FACILITY_TO_DRIVER" &&
              order.status === "READY" &&
              leg.milestone === "ASSIGNED") ||
            (h.type === "DRIVER_TO_CUSTOMER" &&
              stage === "ARRIVED_FOR_DELIVERY") ||
            (h.type === "FACILITY_TO_CUSTOMER" &&
              order.status === "READY" &&
              order.fulfillment!.outbound.method === "CUSTOMER"));
        if (active && h.status === "PENDING") {
          h.status = "ACTIVE";
          h.activatedAt = new Date().toISOString();
          h.updatedAt = h.activatedAt;
        } else if (!active && h.status === "ACTIVE") h.status = "PENDING";
      });
  }
  payload(h: Handoff) {
    return `laundry://handoff/${encodeURIComponent(h.id)}?t=${encodeURIComponent(h.qrToken)}`;
  }
  activeCodesForPresenter(orderId:string,actorId:string):Handoff[] {
    const actor=this.port.actor(actorId);const state=this.port.read();const o=state.orders.find(o=>o.id===orderId);
    if(!o)return [];
    return state.handoffs.filter(h=>h.orderId===orderId&&h.status==='ACTIVE'&&(
      actor.role==='CLIENT'&&actor.id===o.customerId&&['CUSTOMER_TO_DRIVER','DRIVER_TO_CUSTOMER','CUSTOMER_TO_FACILITY','FACILITY_TO_CUSTOMER'].includes(h.type) ||
      actor.role==='DRIVER'&&['DRIVER_TO_FACILITY','FACILITY_TO_DRIVER'].includes(h.type)&&(inbound(h.type)?o.fulfillment!.inbound:o.fulfillment!.outbound).driverId===actor.id
    ));
  }
  verify(
    input: string,
    actorId: string,
    expectedHandoffId?: string,
  ): Verification {
    const actor = this.port.actor(actorId);
    const value = input.trim();
    const state = this.port.read();
    let h: Handoff | undefined;
    if (/^\d{6}$/.test(value))
      h = state.handoffs.find((h) => h.fallbackCode === value);
    else {
      const match = /^laundry:\/\/handoff\/([^?]+)\?t=([^&]+)$/.exec(value);
      if (match) {
        try {
          h = state.handoffs.find(
            (h) =>
              h.id === decodeURIComponent(match[1]) &&
              h.qrToken === decodeURIComponent(match[2]),
          );
        } catch {
          /* Invalid input is handled below. */
        }
      }
    }
    if (!h || (expectedHandoffId && h.id !== expectedHandoffId)) {
      if (expectedHandoffId)
        this.port.transaction((next) => {
          const expected = next.handoffs.find(
            (h) => h.id === expectedHandoffId,
          );
          if (!expected || expected.status !== "ACTIVE") return;
          const order = next.orders.find((o) => o.id === expected.orderId)!;
          this.allowed(order, expected, actor);
          expected.attempts++;
          if (expected.attempts >= expected.maxAttempts)
            expected.status = "LOCKED";
          this.audit(
            next,
            expected,
            actor,
            "INVALID_CODE",
            `Intento ${expected.attempts}/${expected.maxAttempts}`,
          );
        });
      throw new Error(
        "Código no encontrado o no corresponde al pedido seleccionado.",
      );
    }
    if (h.status !== "ACTIVE")
      throw new Error(
        (
          {
            USED: "Este código ya fue utilizado.",
            REVOKED: "Este código fue revocado.",
            LOCKED: "Código bloqueado: solicita regeneración al administrador.",
            EXPIRED: "Código vencido.",
            PENDING: "El código todavía no está habilitado.",
          } as Record<string, string>
        )[h.status] ?? "Código no disponible.",
      );
    if (h.expiresAt && Date.parse(h.expiresAt) <= Date.now())
      throw new Error("Código vencido.");
    const order = state.orders.find((o) => o.id === h!.orderId)!;
    this.allowed(order, h, actor);
    const ticket = this.port.random();
    this.tickets.set(ticket, { id: h.id, generation: h.generation, actorId });
    this.port.transaction((next) =>
      this.audit(
        next,
        next.handoffs.find((v) => v.id === h!.id)!,
        actor,
        "VERIFIED",
      ),
    );
    return {
      ticket,
      handoff: h,
      order,
      localValidation: true,
      warning:
        "Validación local de demostración. La cita orienta la atención; una llegada fuera del horario reservado muestra advertencia.",
    };
  }
  confirm(actorId: string, input: Confirmation): void {
    const ticket = this.tickets.get(input.ticket);
    if (!ticket || ticket.actorId !== actorId)
      throw new Error("Verifica el código antes de confirmar.");
    const actor = this.port.actor(actorId);
    this.port.transaction((state) => {
      const h = state.handoffs.find((h) => h.id === ticket.id);
      if (!h || h.generation !== ticket.generation)
        throw new Error("El código cambió; verifícalo nuevamente.");
      if (h.status === "USED" && h.usedByUserId === actorId) return;
      if (
        ticket.override
          ? !["ACTIVE", "LOCKED", "EXPIRED"].includes(h.status)
          : h.status !== "ACTIVE"
      )
        throw new Error("El código ya no está disponible.");
      const order = state.orders.find((o) => o.id === h.orderId)!;
      this.allowed(order, h, actor, ticket.override);
      if (
        !ticket.override &&
        h.expiresAt &&
        Date.parse(h.expiresAt) <= Date.now()
      )
        throw new Error("Código vencido.");
      if (
        inbound(h.type) &&
        (!Number.isInteger(input.count) || input.count! < 1)
      )
        throw new Error("Registra una cantidad válida de prendas recibidas.");
      if (
        customerTransfers(h.type) &&
        (!input.recipient?.trim() ||
          input.recipient.trim().length < 3 ||
          !/\p{L}/u.test(input.recipient) ||
          !input.relationship?.trim())
      )
        throw new Error("Registra quién retira y su relación o autorización.");
      if (
        input.overrideReason !== undefined &&
        (actor.role !== "ADMIN" || input.overrideReason.trim().length < 5)
      )
        throw new Error(
          "El administrador debe indicar un motivo válido de override.",
        );
      const now = new Date().toISOString();
      h.status = "USED";
      h.usedAt = now;
      h.usedByUserId = actorId;
      h.updatedAt = now;
      const declared = this.port.declaredCount(order);
      h.receipt = {
        count: input.count,
        declaredCount: inbound(h.type) ? declared : undefined,
        recipient: input.recipient?.trim(),
        relationship: input.relationship?.trim(),
        notes: input.notes?.trim(),
        localValidation: true,
      };
      if (h.type === "CUSTOMER_TO_DRIVER")
        advanceOperational(order, "PICKED_UP");
      else if (
        h.type === "CUSTOMER_TO_FACILITY" ||
        h.type === "DRIVER_TO_FACILITY"
      )
        advanceOperational(order, "AT_FACILITY");
      else if (h.type === "FACILITY_TO_DRIVER") {
        order.fulfillment!.outbound.milestone = "RELEASED";
        order.fulfillment!.outbound.status = "IN_PROGRESS";
        order.fulfillment!.outbound.startedAt = now;
      } else {
        advanceOperational(order, "COMPLETED");
        order.fulfillment!.outbound.status = "COMPLETED";
        order.fulfillment!.outbound.milestone = "DELIVERED";
        order.fulfillment!.outbound.completedAt = now;
      }
      if (inbound(h.type) && input.count !== declared) {
        order.intakeHold = {
          handoffId: h.id,
          declared,
          received: input.count!,
          description: `Declaradas ${declared}, recibidas ${input.count}. ${input.notes ?? ""}`,
          createdAt: now,
        };
        order.status = "INCIDENT";
      }
      order.updatedAt = now;
      this.audit(
        state,
        h,
        actor,
        ticket.override || input.overrideReason
          ? "CONFIRMED_OVERRIDE"
          : "CONFIRMED",
        ticket.reason ?? input.overrideReason ?? input.notes,
      );
      this.port.confirmed(state, order, h, actor);
      this.refresh(state, order);
    });
  }
  verifyAdministrativeOverride(
    id: string,
    actorId: string,
    reason: string,
  ): Verification {
    const actor = this.port.actor(actorId);
    const state = this.port.read();
    const h = state.handoffs.find((h) => h.id === id);
    if (actor.role !== "ADMIN" || reason.trim().length < 5)
      throw new Error(
        "El administrador debe indicar un motivo válido de override.",
      );
    if (!h || !["ACTIVE", "LOCKED", "EXPIRED"].includes(h.status))
      throw new Error(
        "No se permite override de códigos utilizados, pendientes o revocados.",
      );
    if (
      state.handoffs.some(
        (v) =>
          v.orderId === h.orderId &&
          v.type === h.type &&
          v.generation > h.generation,
      )
    )
      throw new Error("Existe una generación más reciente.");
    const order = state.orders.find((o) => o.id === h.orderId)!;
    this.allowed(order, h, actor, true);
    const ticket = this.port.random();
    this.tickets.set(ticket, {
      id: h.id,
      generation: h.generation,
      actorId,
      override: true,
      reason: reason.trim(),
    });
    this.port.transaction((next) =>
      this.audit(
        next,
        next.handoffs.find((v) => v.id === id)!,
        actor,
        "OVERRIDE_VERIFIED",
        reason.trim(),
      ),
    );
    return {
      ticket,
      handoff: h,
      order,
      localValidation: true,
      warning:
        "Override administrativo local. Confirma la entrega física y registra la recepción; pago, sede, etapa y uso único siguen vigentes.",
    };
  }
  regenerate(id: string, actorId: string, reason: string): Handoff {
    const actor = this.port.actor(actorId);
    if (actor.role !== "ADMIN" || reason.trim().length < 5)
      throw new Error(
        "El administrador debe indicar el motivo de regeneración.",
      );
    let replacement!: Handoff;
    this.port.transaction((state) => {
      const old = state.handoffs.find((h) => h.id === id);
      if (!old) throw new Error("Transferencia no encontrada.");
      if (old.status === "USED")
        throw new Error("Una transferencia utilizada no se puede regenerar.");
      const order = state.orders.find((o) => o.id === old.orderId)!;
      this.allowed(order, old, actor, true);
      if (actor.facilityId !== old.facilityId)
        throw new Error("Selecciona la sede correspondiente.");
      if (
        state.handoffs.some(
          (h) =>
            h.orderId === old.orderId &&
            h.type === old.type &&
            h.generation > old.generation,
        )
      )
        throw new Error("Existe una generación más reciente.");
      let code = "";
      let attempts = 0;
      do {
        code = String(
          100000 + (parseInt(this.port.random().slice(0, 10), 16) % 900000),
        );
        if (++attempts > 100)
          throw new Error("No se pudo generar un código único.");
      } while (
        trivialCode(code) ||
        state.handoffs.some((h) => h.fallbackCode === code)
      );
      const now = new Date().toISOString();
      old.status = "REVOKED";
      old.updatedAt = now;
      replacement = {
        ...old,
        id: `HND-${this.port.random()}`,
        qrToken: this.port.random(),
        fallbackCode: code,
        generation: old.generation + 1,
        previousHandoffId: old.id,
        status: "ACTIVE",
        attempts: 0,
        activatedAt: now,
        expiresAt: undefined,
        createdAt: now,
        updatedAt: now,
      };
      state.handoffs.push(replacement);
      (inbound(old.type)
        ? order.fulfillment!.inbound
        : order.fulfillment!.outbound
      ).handoffIds.push(replacement.id);
      this.audit(state, old, actor, "REGENERATED", reason.trim());
      this.audit(
        state,
        replacement,
        actor,
        "CREATED_REPLACEMENT",
        reason.trim(),
      );
    });
    return replacement;
  }
  revoke(id: string, actorId: string, reason: string) {
    const actor = this.port.actor(actorId);
    if (actor.role !== "ADMIN" || reason.trim().length < 5)
      throw new Error("El administrador debe indicar el motivo de revocación.");
    this.port.transaction((state) => {
      const h = state.handoffs.find((h) => h.id === id);
      if (!h || h.status === "USED" || h.status === "REVOKED")
        throw new Error("No se puede revocar esta transferencia.");
      if (actor.facilityId !== h.facilityId)
        throw new Error("Sede incorrecta.");
      h.status = "REVOKED";
      h.updatedAt = new Date().toISOString();
      this.audit(state, h, actor, "REVOKED", reason.trim());
    });
  }
  resolve(orderId: string, actorId: string, reason: string) {
    const actor = this.port.actor(actorId);
    this.port.transaction((state) => {
      const o = state.orders.find((o) => o.id === orderId);
      if (!o?.intakeHold || o.intakeHold.resolvedAt)
        throw new Error("No hay una diferencia pendiente.");
      if (
        !["ADMIN", "SUPERVISOR"].includes(actor.role) ||
        actor.facilityId !== o.facilityId ||
        reason.trim().length < 5
      )
        throw new Error("Un operador de la sede debe registrar la resolución.");
      o.intakeHold.resolvedAt = new Date().toISOString();
      o.intakeHold.resolvedBy = actorId;
      o.intakeHold.resolution = reason.trim();
      advanceOperational(
        o,
        o.fulfillment!.inbound.status === "COMPLETED"
          ? "AT_FACILITY"
          : "PICKED_UP",
      );
      this.audit(
        state,
        state.handoffs.find((h) => h.id === o.intakeHold!.handoffId)!,
        actor,
        "INCIDENT_RESOLVED",
        reason.trim(),
      );
      this.port.resolved?.(state, o, actor, reason.trim());
      this.refresh(state, o);
    });
  }
}
