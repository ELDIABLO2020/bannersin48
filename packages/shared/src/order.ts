import { z } from "zod";
import { materialSchema } from "./material";
import { finishingSchema } from "./finishing";
import { dimensionsSchema } from "./dimensions";
import { quantitySchema } from "./quantity";
import { addressSchema } from "./address";

/**
 * Order status state machine from the plan §18.2.
 */
export const orderStatusSchema = z.enum([
  "AWAITING_PAYMENT",
  "AWAITING_PROOF_APPROVAL",
  "CANCELLATION_WINDOW",
  "READY_FOR_TRANSFER",
  "TRANSFERRED_TO_PRODUCTION",
  "IN_PRODUCTION",
  "SHIPPED",
  "DELIVERED",
  "EXCEPTION",
  "CANCELLED",
  "REFUNDED",
]);

export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const orderLineSchema = z
  .object({
    id: z.string(),
    material: materialSchema,
    dimensions: dimensionsSchema,
    finishing: finishingSchema,
    quantity: quantitySchema,
    artworkId: z.string().optional(),
    unitProduct: z.number().nonnegative(),
    addons: z.number().nonnegative(),
    productSubtotal: z.number().nonnegative(),
    shipping: z.number().nonnegative(),
    totalBeforeTax: z.number().nonnegative(),
    billableSqFt: z.number().int().nonnegative(),
    billableDims: z.object({ widthFt: z.number().int(), heightFt: z.number().int() }),
  })
  .strict();

export type OrderLine = z.infer<typeof orderLineSchema>;

export const orderSchema = z
  .object({
    id: z.string(),
    orderNumber: z.string(),
    userId: z.string().optional(),
    email: z.string().email(),
    lines: z.array(orderLineSchema).min(1),
    status: orderStatusSchema,
    subtotal: z.number().nonnegative(),
    shipping: z.number().nonnegative(),
    tax: z.number().nonnegative().default(0),
    rewardsDiscount: z.number().nonnegative().default(0),
    total: z.number().nonnegative(),
    shipTo: addressSchema.optional(),
    artworkIds: z.array(z.string()),
    guaranteedDeliveryDate: z.string(),
    guaranteedDeliveryDow: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    proofApprovedAt: z.string().optional(),
    cancellationWindowExpiresAt: z.string().optional(),
    fedexTracking: z
      .object({
        trackingNumber: z.string(),
        service: z.string(),
        status: z.string(),
        lastUpdate: z.string(),
      })
      .optional(),
    productionPackage: z
      .object({
        orderId: z.string(),
        generatedAt: z.string(),
        handedOffAt: z.string().optional(),
      })
      .optional(),
  })
  .strict();

export type Order = z.infer<typeof orderSchema>;

/**
 * Human-readable labels for the timeline UI.
 */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  AWAITING_PAYMENT: "Awaiting Payment",
  AWAITING_PROOF_APPROVAL: "Awaiting Proof Approval",
  CANCELLATION_WINDOW: "Cancellation Window",
  READY_FOR_TRANSFER: "Ready for Transfer",
  TRANSFERRED_TO_PRODUCTION: "Sent to Production",
  IN_PRODUCTION: "In Production",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  EXCEPTION: "Exception",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

/**
 * Timeline checkpoints rendered on the order detail page.
 * Each maps to a status that "completes" that checkpoint.
 */
export const ORDER_TIMELINE: ReadonlyArray<{ key: string; label: string; completedBy: OrderStatus[] }> = [
  { key: "paid", label: "Payment received", completedBy: ["AWAITING_PROOF_APPROVAL", "CANCELLATION_WINDOW", "READY_FOR_TRANSFER", "TRANSFERRED_TO_PRODUCTION", "IN_PRODUCTION", "SHIPPED", "DELIVERED", "REFUNDED"] },
  { key: "proof", label: "Proof approved", completedBy: ["CANCELLATION_WINDOW", "READY_FOR_TRANSFER", "TRANSFERRED_TO_PRODUCTION", "IN_PRODUCTION", "SHIPPED", "DELIVERED", "REFUNDED"] },
  { key: "transfer", label: "Sent to production", completedBy: ["TRANSFERRED_TO_PRODUCTION", "IN_PRODUCTION", "SHIPPED", "DELIVERED"] },
  { key: "production", label: "In production", completedBy: ["IN_PRODUCTION", "SHIPPED", "DELIVERED"] },
  { key: "shipped", label: "Shipped", completedBy: ["SHIPPED", "DELIVERED"] },
  { key: "delivered", label: "Delivered", completedBy: ["DELIVERED"] },
];
