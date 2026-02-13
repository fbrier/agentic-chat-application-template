/**
 * Database setup script for workshop environments.
 *
 * Creates all application tables with optional TABLE_PREFIX for multi-tenant use.
 * The `users` table is always shared (unprefixed) since it syncs from Supabase Auth.
 *
 * Usage:
 *   bun run db:setup              # No prefix (default)
 *   TABLE_PREFIX=cole bun run db:setup  # Creates cole_projects, cole_chat_conversations, etc.
 *
 * Or set TABLE_PREFIX in your .env file and run:
 *   bun run db:setup
 */
import postgres from "postgres";

const databaseUrl = process.env["DATABASE_URL"];
if (!databaseUrl) {
  console.error("Missing DATABASE_URL environment variable.");
  console.error("Copy .env.example to .env and fill in your database URL.");
  process.exit(1);
}

const prefix = process.env["TABLE_PREFIX"] ? `${process.env["TABLE_PREFIX"]}_` : "";
const p = (name: string) => `${prefix}${name}`;

const sql = postgres(databaseUrl, { prepare: false });

async function setup() {
  console.log(
    prefix
      ? `Setting up database with prefix "${prefix}"...`
      : "Setting up database (no prefix)...",
  );

  // 1. Shared users table (never prefixed — syncs from Supabase Auth)
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS "users" (
      "id" uuid PRIMARY KEY,
      "email" text NOT NULL,
      "display_name" text,
      "avatar_url" text,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    )
  `);
  console.log("  users");

  // 2. Projects table
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS "${p("projects")}" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "name" text NOT NULL,
      "slug" text NOT NULL,
      "description" text,
      "is_public" boolean DEFAULT false NOT NULL,
      "owner_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL,
      CONSTRAINT "${p("projects")}_slug_unique" UNIQUE("slug")
    )
  `);
  console.log(`  ${p("projects")}`);

  // 3. Chat conversations table
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS "${p("chat_conversations")}" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "title" text NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    )
  `);
  console.log(`  ${p("chat_conversations")}`);

  // 4. Chat messages table
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS "${p("chat_messages")}" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "conversation_id" uuid NOT NULL REFERENCES "${p("chat_conversations")}"("id") ON DELETE CASCADE,
      "role" text NOT NULL,
      "content" text NOT NULL,
      "image_url" text,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    )
  `);
  console.log(`  ${p("chat_messages")}`);

  // 5. Migration: add image_url to existing chat_messages tables
  await sql.unsafe(`
    ALTER TABLE "${p("chat_messages")}"
    ADD COLUMN IF NOT EXISTS "image_url" text
  `);
  console.log(`  ${p("chat_messages")} (image_url migration)`);

  console.log("\nDone! All tables created.");

  if (prefix) {
    console.log(
      `\nYour tables: ${p("projects")}, ${p("chat_conversations")}, ${p("chat_messages")}`,
    );
    console.log("Shared table: users");
  }

  await sql.end();
}

setup().catch((err) => {
  console.error("Setup failed:", err);
  process.exit(1);
});
