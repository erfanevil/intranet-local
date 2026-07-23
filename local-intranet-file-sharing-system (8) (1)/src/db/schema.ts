import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  displayName: varchar("display_name", { length: 200 }).notNull(),
  position: varchar("position", { length: 200 }).notNull().default("کارمند"),
  phone: varchar("phone", { length: 20 }),
  avatar: varchar("avatar", { length: 500 }),
  signature: varchar("signature", { length: 500 }),
  canSign: boolean("can_sign").default(false).notNull(),
  password: varchar("password", { length: 255 }).notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  isOnline: boolean("is_online").default(false).notNull(),
  lastSeen: timestamp("last_seen").defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  filename: varchar("filename", { length: 500 }).notNull(),
  originalName: varchar("original_name", { length: 500 }).notNull(),
  mimeType: varchar("mime_type", { length: 200 }).notNull(),
  size: integer("size").notNull(),
  senderId: integer("sender_id").notNull().references(() => users.id),
  receiverId: integer("receiver_id").notNull().references(() => users.id),
  isRead: boolean("is_read").default(false).notNull(),
  senderArchived: boolean("sender_archived").default(false).notNull(),
  receiverArchived: boolean("receiver_archived").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  subject: varchar("subject", { length: 500 }).notNull(),
  body: text("body").notNull(),
  attachmentFilename: varchar("attachment_filename", { length: 500 }),
  attachmentOriginalName: varchar("attachment_original_name", { length: 500 }),
  attachmentSize: integer("attachment_size"),
  senderId: integer("sender_id").notNull().references(() => users.id),
  receiverId: integer("receiver_id").notNull().references(() => users.id),
  isRead: boolean("is_read").default(false).notNull(),
  senderArchived: boolean("sender_archived").default(false).notNull(),
  receiverArchived: boolean("receiver_archived").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const chats = pgTable("chats", {
  id: serial("id").primaryKey(),
  message: text("message").notNull(),
  senderId: integer("sender_id").notNull().references(() => users.id),
  receiverId: integer("receiver_id").notNull().references(() => users.id),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const signatureRequests = pgTable("signature_requests", {
  id: serial("id").primaryKey(),
  documentFilename: varchar("document_filename", { length: 500 }).notNull(),
  documentOriginalName: varchar("document_original_name", { length: 500 }).notNull(),
  signedFilename: varchar("signed_filename", { length: 500 }),
  description: text("description"),
  senderId: integer("sender_id").notNull().references(() => users.id),
  signerId: integer("signer_id").notNull().references(() => users.id),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  signedAt: timestamp("signed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
