import { pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const sabitoKnowledge = pgTable("sabito_preview_knowledge", {
  id: serial("id").primaryKey(),
  owner: text("owner").notNull(),
  platform: text("platform").notNull().default("bca"),
  questionKey: text("question_key").notNull(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("sabito_preview_knowledge_owner_question").on(table.owner, table.platform, table.questionKey)]);

export const insertSabitoKnowledgeSchema = createInsertSchema(sabitoKnowledge).omit({ id: true, updatedAt: true });
export type InsertSabitoKnowledge = z.infer<typeof insertSabitoKnowledgeSchema>;
export type SabitoKnowledge = typeof sabitoKnowledge.$inferSelect;
