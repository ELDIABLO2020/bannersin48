import { z } from "zod";
import { materialSchema } from "./material";
import { finishingSchema } from "./finishing";
import { dimensionsSchema } from "./dimensions";
import { quantitySchema } from "./quantity";
import { addressSchema } from "./address";
import { colorMatchingSchema } from "./artwork";

/** Authoritative V1 order state machine (matches Prisma/Nest). */
export const orderStatusSchema = z.enum([
  "RECEIVED",
  "AWAITING_PAYMENT",
  "IN_PROCESSING",
  "ACCEPTED",
  "SHIPPED",
  "DELIVERED",
  "ON_HOLD",
  "CANCELLED",
]);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const paymentStatusSchema = z.enum([
  "PENDING_PAYMENT",
  "MARKED_PAID",
  "PAID",
  "REFUNDED",
]);
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

export const orderEventSchema = z
  .object({
    id: z.string(),
    fromStatus: orderStatusSchema.nullable(),
    toStatus: orderStatusSchema,
    actorId: z.string().nullable(),
    note: z.string().nullable(),
    createdAt: z.string(),
  })
  .strict();
export type OrderEvent = z.infer<typeof orderEventSchema>;

export const orderLineSchema = z
  .object({
    id: z.string(),
    productId: z.string().optional(),
    productSlug: z.string().optional(),
    description: z.string().optional(),
    material: materialSchema,
    printSides: z.string().nullable().optional(),
    dimensions: dimensionsSchema,
    finishing: finishingSchema,
    quantity: quantitySchema,
    artworkId: z.string().nullable(),
    colorMatching: colorMatchingSchema.optional(),
    unitProduct: z.number().nonnegative(),
    addons: z.number().nonnegative(),
    productSubtotal: z.number().nonnegative(),
    shipping: z.number().nonnegative(),
    totalBeforeTax: z.number().nonnegative(),
    billableSqFt: z.number().nonnegative(),
    billableDims: z.object({ widthFt: z.number(), heightFt: z.number() }),
  })
  .strict();
export type OrderLine = z.infer<typeof orderLineSchema>;

export const orderSchema = z
  .object({
    id: z.string(),
    orderNumber: z.string(),
    userId: z.string().optional(),
    lines: z.array(orderLineSchema).min(1),
    status: orderStatusSchema,
    paymentStatus: paymentStatusSchema,
    currency: z.literal("USD"),
    subtotal: z.number().nonnegative(),
    shipping: z.number().nonnegative(),
    tax: z.number().nonnegative().default(0),
    rewardsDiscount: z.number().nonnegative().default(0),
    total: z.number().nonnegative(),
    shipTo: addressSchema.optional(),
    artworkIds: z.array(z.string()),
    guaranteedDeliveryDate: z.string(),
    guaranteedDeliveryDow: z.string(),
    proofConfirmedAt: z.string().nullable(),
    placedAt: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
    events: z.array(orderEventSchema),
    fedexTracking: z
      .object({
        trackingNumber: z.string(),
        service: z.string(),
        status: z.string(),
        lastUpdate: z.string(),
        labelDownloadUrl: z.string().nullable(),
      })
      .optional(),
  })
  .strict();
export type Order = z.infer<typeof orderSchema>;

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  RECEIVED: "Order received · Payment pending",
  AWAITING_PAYMENT: "Awaiting payment",
  IN_PROCESSING: "Payment confirmed · In processing",
  ACCEPTED: "Accepted · Tracking ready",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  ON_HOLD: "On hold",
  CANCELLED: "Cancelled",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING_PAYMENT: "Payment pending",
  MARKED_PAID: "Payment confirmed",
  PAID: "Paid",
  REFUNDED: "Refunded",
};

export const ORDER_TIMELINE: ReadonlyArray<{
  key: string;
  label: string;
  completedBy: OrderStatus[];
}> = [
  {
    key: "received",
    label: "Order received",
    completedBy: ["RECEIVED", "AWAITING_PAYMENT", "IN_PROCESSING", "ACCEPTED", "SHIPPED", "DELIVERED", "ON_HOLD"],
  },
  {
    key: "paid",
    label: "Payment confirmed",
    completedBy: ["IN_PROCESSING", "ACCEPTED", "SHIPPED", "DELIVERED"],
  },
  { key: "accepted", label: "Accepted · tracking ready", completedBy: ["ACCEPTED", "SHIPPED", "DELIVERED"] },
  { key: "shipped", label: "Shipped", completedBy: ["SHIPPED", "DELIVERED"] },
  { key: "delivered", label: "Delivered", completedBy: ["DELIVERED"] },
];
