import { z } from 'zod';

/** zod schemas for persisted exam sessions. Used by storage, export/import and tests. */

export const KeySchema = z.union([
  z.object({ type: z.enum(['multiple_choice', 'multiple_response']), answer: z.array(z.string().max(200)).max(50) }),
  z.object({ type: z.literal('ordering'), answer: z.array(z.string().max(200)).max(50) }),
  z.object({ type: z.literal('matching'), answer: z.record(z.string().max(200), z.string().max(200)) }),
]);

export const ResponseSchema = z.union([
  z.string().max(200),
  z.null(),
  z.array(z.union([z.string().max(200), z.null()])).max(60),
  z.record(z.string().max(200), z.union([z.string().max(200), z.null()])),
]);

export const GradeResultSchema = z.enum(['correct', 'incorrect', 'unanswered_incorrect', 'ungradable']);

export const ExamResultSchema = z.object({
  correct: z.number().int().min(0),
  scored: z.number().int().min(0),
  percent: z.number().nullable(),
  per_question: z.record(z.string(), GradeResultSchema),
  time_used_ms: z.number().min(0),
});
export type ExamResult = z.infer<typeof ExamResultSchema>;

export const SessionSchema = z.object({
  id: z.string().min(1).max(100),
  status: z.enum(['in_progress', 'submitted']),
  /** "standard" = 65 q / 170 min; "shorter" = standard but fewer questions (pool too small); "custom" = Practice configuration */
  kind: z.enum(['standard', 'shorter', 'custom']),
  seed: z.string().max(200),
  basis: z.enum(['research', 'source']),
  research_version: z.string().max(100),
  question_ids: z.array(z.string().regex(/^Q\d{3}$/)).min(1).max(143),
  keys: z.record(z.string(), KeySchema.nullable()),
  ungradable_ids: z.array(z.string()),
  include_ungradable: z.boolean(),
  duration_ms: z.number().positive(),
  allow_pause: z.boolean(),
  started_at: z.number(),
  deadline: z.number(),
  paused_at: z.number().nullable(),
  paused_total_ms: z.number().min(0),
  current_index: z.number().int().min(0),
  responses: z.record(z.string(), ResponseSchema),
  flags: z.array(z.string()),
  submitted_at: z.number().nullable(),
  submit_reason: z.enum(['user', 'timeout', 'expired_on_load']).nullable(),
  result: ExamResultSchema.nullable(),
  app_version: z.string().max(50),
  updated_at: z.number(),
});
export type ExamSession = z.infer<typeof SessionSchema>;
