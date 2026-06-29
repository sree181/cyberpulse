import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, uniqueIndex } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Persisted threat events for 24h timeline replay.
 * Stores a rolling window of events so the timeline scrubber can replay actual attacks.
 * Events older than 24h are pruned by the cleanup procedure.
 */
export const threatEvents = mysqlTable("threat_events", {
  id: int("id").autoincrement().primaryKey(),
  eventId: varchar("eventId", { length: 64 }).notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  attackType: varchar("attackType", { length: 64 }).notNull(),
  severity: varchar("severity", { length: 16 }).notNull(),
  sourceIp: varchar("sourceIp", { length: 45 }).notNull(),
  sourceCountry: varchar("sourceCountry", { length: 64 }).notNull(),
  sourceCity: varchar("sourceCity", { length: 128 }),
  sourceLat: text("sourceLat").notNull(), // stored as string for precision
  sourceLng: text("sourceLng").notNull(),
  targetName: varchar("targetName", { length: 128 }),
  targetLat: text("targetLat").notNull(),
  targetLng: text("targetLng").notNull(),
  port: int("port"),
  protocol: varchar("protocol", { length: 16 }),
});

export type ThreatEventRow = typeof threatEvents.$inferSelect;
export type InsertThreatEvent = typeof threatEvents.$inferInsert;

/**
 * Aggregated timeline bins for efficient 24h histogram queries.
 * Each row = one 5-minute bin with event count and severity breakdown.
 */
export const timelineBins = mysqlTable("timeline_bins", {
  id: int("id").autoincrement().primaryKey(),
  binStart: timestamp("binStart").notNull(),
  eventCount: int("eventCount").notNull().default(0),
  criticalCount: int("criticalCount").notNull().default(0),
  highCount: int("highCount").notNull().default(0),
  mediumCount: int("mediumCount").notNull().default(0),
  lowCount: int("lowCount").notNull().default(0),
}, (table) => ({
  binStartIdx: uniqueIndex("bin_start_idx").on(table.binStart),
}));

export type TimelineBinRow = typeof timelineBins.$inferSelect;
export type InsertTimelineBin = typeof timelineBins.$inferInsert;