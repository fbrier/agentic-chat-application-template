import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Table name prefix for multi-tenant workshop environments.
 * Set TABLE_PREFIX=yourname in .env to prefix all app tables (e.g., yourname_projects).
 * The users table is always shared (unprefixed) since it syncs from Supabase Auth.
 * If TABLE_PREFIX is not set, no prefix is applied.
 */
const tablePrefix = process.env["TABLE_PREFIX"] ? `${process.env["TABLE_PREFIX"]}_` : "";
export const t = (name: string) => `${tablePrefix}${name}`;

/**
 * Base timestamp columns for all tables.
 * Usage: ...timestamps
 */
export const timestamps = {
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
};

/**
 * Users table - syncs with Supabase Auth via database trigger.
 *
 * To set up the trigger in Supabase SQL Editor:
 *
 * ```sql
 * -- Function to sync auth.users to public.users
 * CREATE OR REPLACE FUNCTION public.handle_new_user()
 * RETURNS trigger AS $$
 * BEGIN
 *   INSERT INTO public.users (id, email)
 *   VALUES (NEW.id, NEW.email);
 *   RETURN NEW;
 * END;
 * $$ LANGUAGE plpgsql SECURITY DEFINER;
 *
 * -- Trigger on auth.users insert
 * CREATE OR REPLACE TRIGGER on_auth_user_created
 *   AFTER INSERT ON auth.users
 *   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
 * ```
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey(), // References auth.users(id)
  email: text("email").notNull(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  ...timestamps,
});

/**
 * Projects table - stores project information with ownership.
 */
export const projects = pgTable(t("projects"), {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  isPublic: boolean("is_public").notNull().default(false),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  ...timestamps,
});

/**
 * Conversations table - stores chat conversations.
 * No owner since auth is not required.
 */
export const chatConversations = pgTable(t("chat_conversations"), {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  ...timestamps,
});

/**
 * Messages table - stores individual chat messages within conversations.
 */
export const chatMessages = pgTable(t("chat_messages"), {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => chatConversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  ...timestamps,
});
