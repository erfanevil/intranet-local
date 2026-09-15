import {
  pgTable,
  serial,
  integer,
  text,
  varchar,
  timestamp,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ *
 * Authentication (phone-number only — Sefareshchi never uses email)
 * ------------------------------------------------------------------ */

/** Merchant accounts. `phone` is the single identity key (normalized 09xxxxxxxxx). */
export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    phone: varchar("phone", { length: 15 }).notNull().unique(),
    firstName: varchar("first_name", { length: 80 }).notNull(),
    lastName: varchar("last_name", { length: 80 }).notNull(),
    storeName: varchar("store_name", { length: 160 }).notNull(),
    /** bcrypt hash — plain passwords are never stored. */
    passwordHash: text("password_hash").notNull(),
    phoneVerifiedAt: timestamp("phone_verified_at", { withTimezone: true }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("users_phone_idx").on(table.phone)],
);

export type User = typeof users.$inferSelect;

export const otpPurposeEnum = pgEnum("otp_purpose", ["register", "reset"]);

/**
 * One-time codes. Only an HMAC-SHA256 digest of the code is persisted,
 * so a database leak never exposes usable OTPs.
 */
export const otpCodes = pgTable(
  "otp_codes",
  {
    id: serial("id").primaryKey(),
    phone: varchar("phone", { length: 15 }).notNull(),
    purpose: otpPurposeEnum("purpose").notNull(),
    codeHash: text("code_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    attempts: integer("attempts").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("otp_codes_phone_purpose_idx").on(table.phone, table.purpose)],
);

/**
 * Short-lived proof that a phone number passed OTP verification.
 * Required to complete registration / password reset.
 */
export const verificationTokens = pgTable(
  "verification_tokens",
  {
    id: serial("id").primaryKey(),
    phone: varchar("phone", { length: 15 }).notNull(),
    purpose: otpPurposeEnum("purpose").notNull(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("verification_tokens_hash_idx").on(table.tokenHash)],
);

/** Sliding-window counters backing OTP + login rate limits. */
export const authAttempts = pgTable(
  "auth_attempts",
  {
    id: serial("id").primaryKey(),
    /** e.g. "otp:register:09120000000" or "login:09120000000" */
    bucket: varchar("bucket", { length: 120 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("auth_attempts_bucket_created_idx").on(table.bucket, table.createdAt)],
);

/**
 * Early-access / waitlist signups collected from the landing page CTAs
 * (the previous static site pointed every CTA at a dead coming-soon.html).
 */
export const leads = pgTable(
  "leads",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    storeName: varchar("store_name", { length: 160 }),
    instagram: varchar("instagram", { length: 120 }),
    phone: varchar("phone", { length: 32 }).notNull(),
    plan: varchar("plan", { length: 40 }).default("pro").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("leads_phone_idx").on(table.phone)],
);

export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;

/**
 * Demo order-tracking data powering the public /track experience,
 * mirroring shipments a customer would follow after buying in Instagram DMs.
 */
export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "paid",
  "preparing",
  "sent",
  "delivered",
]);

export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    trackingCode: varchar("tracking_code", { length: 24 }).notNull().unique(),
    customerName: varchar("customer_name", { length: 120 }).notNull(),
    productName: varchar("product_name", { length: 200 }).notNull(),
    amountToman: integer("amount_toman").notNull(),
    status: orderStatusEnum("status").default("pending").notNull(),
    city: varchar("city", { length: 80 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("orders_tracking_code_idx").on(table.trackingCode)],
);

export const orderEvents = pgTable(
  "order_events",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    status: orderStatusEnum("status").notNull(),
    note: varchar("note", { length: 240 }),
    happenedAt: timestamp("happened_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("order_events_order_idx").on(table.orderId)],
);

export type Order = typeof orders.$inferSelect;
export type OrderEvent = typeof orderEvents.$inferSelect;
