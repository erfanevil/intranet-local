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
  canNotify: boolean("can_notify").default(false).notNull(),
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

// Multiple attachments per message (up to 5)
export const messageAttachments = pgTable("message_attachments", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").notNull().references(() => messages.id, { onDelete: "cascade" }),
  filename: varchar("filename", { length: 500 }).notNull(),
  originalName: varchar("original_name", { length: 500 }).notNull(),
  size: integer("size").notNull(),
  mimeType: varchar("mime_type", { length: 200 }).notNull(),
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

// Contact Groups for SMS notifications
export const contactGroups = pgTable("contact_groups", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  color: varchar("color", { length: 20 }).default("#3b82f6"),
  createdById: integer("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Contacts for SMS notifications
export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  position: varchar("position", { length: 200 }),
  organization: varchar("organization", { length: 200 }),
  notes: text("notes"),
  createdById: integer("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Contact-Group relationship (many-to-many)
export const contactGroupMembers = pgTable("contact_group_members", {
  id: serial("id").primaryKey(),
  contactId: integer("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  groupId: integer("group_id").notNull().references(() => contactGroups.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// SMS Campaigns / Bulk Messages
export const smsCampaigns = pgTable("sms_campaigns", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  message: text("message").notNull(),
  senderId: integer("sender_id").notNull().references(() => users.id),
  totalRecipients: integer("total_recipients").default(0).notNull(),
  sentCount: integer("sent_count").default(0).notNull(),
  failedCount: integer("failed_count").default(0).notNull(),
  status: varchar("status", { length: 50 }).notNull().default("pending"), // pending, sending, completed, failed
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Individual SMS logs
export const smsLogs = pgTable("sms_logs", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").references(() => smsCampaigns.id, { onDelete: "cascade" }),
  contactId: integer("contact_id").references(() => contacts.id, { onDelete: "set null" }),
  phone: varchar("phone", { length: 20 }).notNull(),
  recipientName: varchar("recipient_name", { length: 200 }),
  message: text("message").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("pending"), // pending, sent, failed
  errorMessage: text("error_message"),
  kavenegarMessageId: varchar("kavenegar_message_id", { length: 100 }),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
