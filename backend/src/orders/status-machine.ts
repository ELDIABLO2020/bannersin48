import { BadRequestException } from "@nestjs/common";
import type { OrderStatus } from "@prisma/client";

/**
 * The §4 status machine, enforced here (service layer). Every transition is
 * recorded in order_events by OrdersService.transition.
 */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  RECEIVED: ["IN_PROCESSING", "ON_HOLD", "CANCELLED"],
  AWAITING_PAYMENT: ["IN_PROCESSING", "ON_HOLD", "CANCELLED"],
  IN_PROCESSING: ["ACCEPTED", "ON_HOLD", "CANCELLED"],
  ACCEPTED: ["SHIPPED", "ON_HOLD", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  ON_HOLD: ["IN_PROCESSING", "ACCEPTED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

/** Statuses a customer may still cancel in (before payment is marked). */
export const CUSTOMER_CANCELLABLE_STATUSES: OrderStatus[] = ["RECEIVED", "AWAITING_PAYMENT"];

export function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new BadRequestException({
      code: "INVALID_STATUS_TRANSITION",
      message: `An order cannot move from ${from} to ${to}.`,
    });
  }
}
