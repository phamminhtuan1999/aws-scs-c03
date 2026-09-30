import { z } from 'zod';

/** zod schemas for the read-only data contracts (docs/APP_SPEC.md section 1). */

export const QTYPES = ['multiple_choice', 'multiple_response', 'ordering', 'matching'] as const;
export type QType = (typeof QTYPES)[number];

const qid = z.string().regex(/^Q\d{3}$/);
const imageFile = z.string().regex(/^images\/[A-Za-z0-9_.-]+\.(png|jpg|jpeg|gif|webp)$/);

export const TextBlockSchema = z.object({ id: z.string(), type: z.literal('text'), text: z.string() });
export const ImageBlockSchema = z.object({
  id: z.string(),
  type: z.literal('image'),
  file: imageFile,
  label: z.string(),
  width: z.number(),
  height: z.number(),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  role: z.enum(['stem', 'choice', 'answer']),
});
export const BlockSchema = z.discriminatedUnion('type', [TextBlockSchema, ImageBlockSchema]);
export type Block = z.infer<typeof BlockSchema>;
export type TextBlock = z.infer<typeof TextBlockSchema>;
export type ImageBlock = z.infer<typeof ImageBlockSchema>;

export const ChoiceSchema = z.object({ id: z.string(), letter: z.string(), blocks: z.array(BlockSchema) });
export type Choice = z.infer<typeof ChoiceSchema>;

export const QuestionSchema = z.object({
  id: qid,
  number: z.number().int(),
  type: z.enum(QTYPES),
  topic: z.string(),
  source_file: z.string(),
  source_question_id: z.string(),
  choose: z.number().int().nullable(),
  stem: z.array(BlockSchema),
  choices: z.array(ChoiceSchema),
  content_hash: z.string(),
});
export type Question = z.infer<typeof QuestionSchema>;

export const BankSchema = z.object({
  exam: z.string(),
  questions: z.array(QuestionSchema).min(1),
  images: z.record(
    z.string(),
    z.object({ question_id: qid, role: z.enum(['stem', 'choice', 'answer']), sha256: z.string() }),
  ),
});
export type Bank = z.infer<typeof BankSchema>;

// ---- hotspot (ordering / matching UI layer) --------------------------------
const OrderingStepSchema = z.object({
  id: z.string(),
  text: z.string(),
  source_block: z.string().optional(),
  bullet_stripped: z.boolean().optional(),
});
const OrderingHotspotSchema = z.object({
  kind: z.literal('ordering'),
  slots: z.number().int().min(1),
  steps: z.array(OrderingStepSchema).min(1),
  reuse: z.boolean(),
  rule_source_text: z.string().nullish(),
  stem_image: z.string().nullish(),
  source_notes: z.array(z.string()).default([]),
  ui_labels_note: z.string().nullish(),
});
const MatchingHotspotSchema = z.object({
  kind: z.literal('matching'),
  prompts: z.array(z.object({ id: z.string(), text: z.string(), source: z.string().optional() })).min(1),
  responses: z
    .array(z.object({ id: z.string(), text: z.string(), source_block: z.string().optional(), bullet_stripped: z.boolean().optional() }))
    .min(1),
  reuse: z.boolean(),
  rule_source_text: z.string().nullish(),
  reuse_note: z.string().nullish(),
  stem_image: z.string().nullish(),
  source_notes: z.array(z.string()).default([]),
});
export const HotspotEntrySchema = z.discriminatedUnion('kind', [OrderingHotspotSchema, MatchingHotspotSchema]);
export type OrderingHotspot = z.infer<typeof OrderingHotspotSchema>;
export type MatchingHotspot = z.infer<typeof MatchingHotspotSchema>;
export type Hotspot = z.infer<typeof HotspotEntrySchema>;
export const HotspotFileSchema = z.object({ questions: z.record(qid, HotspotEntrySchema) });

// ---- source keys ------------------------------------------------------------
export const SourceKeySchema = z.object({
  type: z.enum(QTYPES),
  choice_ids: z.array(z.string()).optional(),
  sequence: z.array(z.string()).optional(),
  pairs: z.record(z.string(), z.string()).optional(),
  gradable: z.boolean(),
  ungradable_reason: z.string().nullish(),
  answer_image: imageFile.nullish(),
  derivation: z.string().nullish(),
});
export type SourceKey = z.infer<typeof SourceKeySchema>;
export const SourceKeysFileSchema = z.object({ keys: z.record(qid, SourceKeySchema) });

// ---- research reviews (lenient: the file grows while research progresses) ---------
export const STATUSES = ['verified', 'disputed', 'ambiguous', 'outdated', 'unresolved', 'pending'] as const;
export type ReviewStatus = (typeof STATUSES)[number];

/** Answer value shapes: choice types -> sorted choice IDs; ordering -> step IDs in order; matching -> {promptId: responseId}. */
export const AnswerValueSchema = z.union([z.array(z.string()), z.record(z.string(), z.string())]).nullable();
export type AnswerValue = z.infer<typeof AnswerValueSchema>;

const ConfidenceSchema = z.object({
  level: z.enum(['high', 'medium', 'low']),
  reason_vi: z.string().nullish(),
  open_issues: z.array(z.string()).nullish(),
});
const OptionReviewSchema = z.object({
  unit_id: z.string(),
  unit_type: z.string(),
  verdict: z.string(),
  reason_vi: z.string().nullish(),
  reference_ids: z.array(z.string()).nullish(),
  requirement_ids: z.array(z.string()).nullish(),
  evidence_kind: z.string().nullish(),
  position: z.number().nullish(),
  matched_response: z.string().nullish(),
  used_for: z.array(z.string()).nullish(),
});
const ReferenceSchema = z.object({
  id: z.string(),
  url: z.string(),
  title: z.string(),
  section: z.string().nullish(),
  accessed_at: z.string().nullish(),
  page_last_updated: z.string().nullish(),
  quote: z.string().nullish(),
  supports: z.string().nullish(),
  kind: z.string().nullish(),
  snapshot_id: z.string().nullish(),
  read_via: z.string().nullish(),
});
export type Reference = z.infer<typeof ReferenceSchema>;
export type OptionReview = z.infer<typeof OptionReviewSchema>;

export const ReviewSchema = z.object({
  status: z.enum(STATUSES),
  researched_answer: AnswerValueSchema.default(null),
  source_answer: AnswerValueSchema.default(null),
  comparison: z.string().nullish(),
  differs_from_source: z.boolean().default(false),
  confidence: ConfidenceSchema.nullish(),
  option_reviews: z.array(OptionReviewSchema).default([]),
  references: z.array(ReferenceSchema).default([]),
  explanation_vi: z
    .object({ why_correct: z.string().nullish(), others: z.record(z.string(), z.string()).nullish() })
    .nullish(),
  keywords: z.array(z.object({ phrase: z.string(), meaning_vi: z.string().nullish() })).default([]),
  memory_tip_vi: z.string().nullish(),
  tags: z
    .object({
      domains: z.array(z.string()).default([]),
      services: z.array(z.string()).default([]),
      reason_vi: z.string().nullish(),
    })
    .nullish(),
  source_issues: z
    .array(z.object({ type: z.string().nullish(), location: z.string().nullish(), detail_vi: z.string().nullish() }))
    .default([]),
  requirements: z.array(z.object({ id: z.string(), text_vi: z.string().nullish(), kind: z.string().nullish() })).default([]),
  image_transcriptions: z.array(z.unknown()).default([]),
  researched_at: z.string().nullish(),
  last_reviewed_at: z.string().nullish(),
  independent_verdict: z
    .object({
      answer: AnswerValueSchema.optional(),
      proposed_status: z.string().nullish(),
      confidence: ConfidenceSchema.nullish(),
      reference_ids: z.array(z.string()).nullish(),
      recorded_at: z.string().nullish(),
    })
    .nullish(),
  reconciliation_vi: z.string().nullish(),
  history: z
    .array(
      z.object({
        version: z.string().nullish(),
        date: z.string().nullish(),
        change: z.string().nullish(),
        previous_answer: AnswerValueSchema.optional(),
      }),
    )
    .default([]),
  research_version: z.string().nullish(),
  source_key_gradable: z.boolean().default(true),
  source_key_ungradable_reason: z.string().nullish(),
  gradable_by_research: z.boolean().default(false),
});
export type Review = z.infer<typeof ReviewSchema>;

export const ReviewsFileSchema = z.object({
  research_version: z.string(),
  generated_at: z.string().nullish(),
  questions: z.record(z.string(), z.unknown()),
});

export const ManifestSchema = z.object({
  files: z.record(z.string(), z.string()),
  research_version: z.string().nullable(),
  generated_at: z.string(),
});
export type Manifest = z.infer<typeof ManifestSchema>;
