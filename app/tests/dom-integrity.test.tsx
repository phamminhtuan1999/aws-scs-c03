/**
 * DOM integrity: every one of the 143 questions is rendered by the real question component and compared with
 * data/original/question_bank.json, which is read DIRECTLY from disk (not through the app's loader).
 * Only whitespace collapsing is applied (same rule as the normaliser): runs of space/tab/CR/LF, trimmed.
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { cleanup } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { QuestionView } from '../src/ui/question/QuestionView';
import { loadRealData, allPendingReviews, readJson, TRAINER_ROOT } from './helpers/data';
import { collapse, renderWithData } from './helpers/render';

const original = readJson('data/original/question_bank.json');
const data = loadRealData(allPendingReviews());
const sha = (file: string) => createHash('sha256').update(fs.readFileSync(path.join(TRAINER_ROOT, 'data/original', file))).digest('hex');

const answerFiles = new Set<string>(original.questions.flatMap((q: any) => (q.answer ?? []).filter((b: any) => b.type === 'image').map((b: any) => b.file)));

describe('bank and images vs original (independent of the app loader)', () => {
  it('143 questions, ids in order, types and choice counts match', () => {
    expect(original.questions).toHaveLength(143);
    expect(data.questions).toHaveLength(143);
    expect(data.allIds).toEqual(original.questions.map((q: any) => q.id));
    const types = (qs: any[], k: string) => qs.reduce((m: any, q) => ({ ...m, [q[k]]: (m[q[k]] ?? 0) + 1 }), {});
    expect(types(data.questions, 'type')).toEqual(types(original.questions, 'question_type'));
    const origChoices = original.questions.reduce((n: number, q: any) => n + q.choices.length, 0);
    const appChoices = data.questions.reduce((n, q) => n + q.choices.length, 0);
    expect(origChoices).toBe(572);
    expect(appChoices).toBe(572);
  });

  it('all 35 images: file present, sha256 equals the original block and the app table, roles are right', () => {
    const origBlocks: any[] = original.questions.flatMap((q: any) => [
      ...q.stem,
      ...q.choices.flatMap((c: any) => c.blocks),
      ...(q.answer ?? []),
    ]).filter((b: any) => b.type === 'image');
    const files = new Set(origBlocks.map((b) => b.file));
    expect(files.size).toBe(35);
    expect(Object.keys(data.bank.images).sort()).toEqual([...files].sort());
    for (const b of origBlocks) {
      expect(sha(b.file)).toBe(b.sha256);
      expect(data.bank.images[b.file].sha256).toBe(b.sha256);
    }
    const answerRole = Object.entries(data.bank.images).filter(([, v]) => v.role === 'answer').map(([f]) => f).sort();
    expect(answerRole).toEqual([...answerFiles].sort());
    expect(answerRole).toHaveLength(7);
    // image -> question id mapping
    for (const q of original.questions) {
      for (const b of [...q.stem, ...q.choices.flatMap((c: any) => c.blocks), ...(q.answer ?? [])]) {
        if (b.type === 'image') expect(data.bank.images[b.file].question_id).toBe(q.id);
      }
    }
  });
});

describe('143/143 questions render verbatim (stem + choices)', () => {
  let ok = 0;
  it('renders every question and compares each block with the original', () => {
    const failures: string[] = [];
    const seenImages = new Set<string>();
    for (const oq of original.questions) {
      const { container } = renderWithData(<QuestionView data={data} qid={oq.id} response={null} onChange={() => {}} />, data);
      try {
        // stem blocks, in order
        const stemEls = Array.from(container.querySelectorAll('.stem > [data-block-id]'));
        expect(stemEls.length, `${oq.id} stem block count`).toBe(oq.stem.length);
        oq.stem.forEach((b: any, i: number) => {
          const el = stemEls[i] as HTMLElement;
          expect(el.getAttribute('data-block-id')).toBe(`${oq.id}:stem:${i}`);
          if (b.type === 'text') expect(collapse(el.textContent ?? ''), `${oq.id} stem ${i}`).toBe(collapse(b.text));
          else {
            const img = el.querySelector('img')!;
            expect(img.getAttribute('data-file')).toBe(b.file);
            expect(img.getAttribute('src')).toBe(`./data/${b.file}`);
            expect(el.getAttribute('data-image-role')).toBe('stem');
            seenImages.add(b.file);
          }
        });
        // choices, in order
        const rows = Array.from(container.querySelectorAll('[data-choice-id]'));
        expect(rows.length, `${oq.id} choice count`).toBe(oq.choices.length);
        oq.choices.forEach((c: any, ci: number) => {
          const row = rows[ci] as HTMLElement;
          expect(row.getAttribute('data-choice-id')).toBe(`${oq.id}:${c.letter}`);
          expect(row.querySelector('.choice-letter')!.textContent).toBe(`${c.letter}.`);
          const blocks = Array.from(row.querySelectorAll('[data-block-id]'));
          expect(blocks.length, `${oq.id}:${c.letter} block count`).toBe(c.blocks.length);
          c.blocks.forEach((b: any, bi: number) => {
            const el = blocks[bi] as HTMLElement;
            expect(el.getAttribute('data-block-id')).toBe(`${oq.id}:${c.letter}:${bi}`);
            if (b.type === 'text') expect(collapse(el.textContent ?? ''), `${oq.id}:${c.letter}:${bi}`).toBe(collapse(b.text));
            else {
              expect(el.querySelector('img')!.getAttribute('data-file')).toBe(b.file);
              expect(el.getAttribute('data-image-role')).toBe('choice');
              seenImages.add(b.file);
            }
          });
        });
        // no answer image may appear before grading
        for (const img of Array.from(container.querySelectorAll('img'))) {
          const f = img.getAttribute('data-file') ?? '';
          expect(answerFiles.has(f), `${oq.id} shows answer image ${f}`).toBe(false);
          expect(answerFiles.has((img.getAttribute('src') ?? '').replace('./data/', ''))).toBe(false);
        }
        expect(container.querySelector('.answer-image, [data-answer-image]')).toBeNull();
        ok += 1;
      } catch (e) {
        failures.push(`${oq.id}: ${(e as Error).message}`);
      }
      cleanup();
    }
    console.log(`DOM integrity: ${ok}/143 questions rendered verbatim; ${seenImages.size} distinct stem/choice images displayed`);
    expect(failures).toEqual([]);
    expect(ok).toBe(143);
    expect(seenImages.size).toBe(28); // 35 images minus the 7 answer images
  });

  it('the policy/code image questions (Q004, Q007, Q088) show all four choice images', () => {
    for (const id of ['Q004', 'Q007', 'Q088']) {
      const { container } = renderWithData(<QuestionView data={data} qid={id} response={null} onChange={() => {}} />, data);
      const imgs = container.querySelectorAll('[data-choice-id] img');
      expect(imgs, id).toHaveLength(4);
      imgs.forEach((i) => expect(i.getAttribute('src')).toMatch(/^\.\/data\/images\/.*\.png$/));
      cleanup();
    }
  });
});

describe('ordering / matching option layers match the source text', () => {
  const hot = readJson('data/interactions/hotspot.json').questions;
  const origById = new Map<string, any>(original.questions.map((q: any) => [q.id, q]));

  it('every step / response / prompt comes from the original question and control rows appear in the DOM', () => {
    let checked = 0;
    for (const [qid, hs] of Object.entries<any>(hot)) {
      const oq = origById.get(qid);
      const stemTexts: string[] = oq.stem.filter((b: any) => b.type === 'text').map((b: any) => collapse(b.text));
      const stripBullet = (t: string) => t.replace(/^[^\p{L}\p{N}]+\s+/u, '');
      const findInStem = (text: string) => stemTexts.some((s) => s === text || stripBullet(s) === text);
      const { container } = renderWithData(<QuestionView data={data} qid={qid} response={null} onChange={() => {}} />, data);
      if (hs.kind === 'ordering') {
        for (const st of hs.steps) expect(findInStem(st.text), `${qid} step ${st.id}`).toBe(true);
        const selects = container.querySelectorAll('.ordering select');
        expect(selects).toHaveLength(hs.slots);
        const opts = Array.from(selects[0].querySelectorAll('option')).map((o) => o.textContent);
        expect(opts).toEqual(['Select…', ...hs.steps.map((s: any) => s.text)]); // source order, none dropped
      } else {
        const rows: string[] = oq.image_question_rows.map(collapse);
        expect(hs.prompts.map((p: any) => p.text)).toEqual(rows);
        for (const r of hs.responses) expect(findInStem(r.text), `${qid} response ${r.id}`).toBe(true);
        const selects = container.querySelectorAll('.matching select');
        expect(selects).toHaveLength(hs.prompts.length);
        const labels = Array.from(container.querySelectorAll('.match-prompt-text')).map((e) => e.textContent);
        expect(labels).toEqual(rows);
      }
      // the stem (verbatim, including the listed options and the dropdown image) is rendered above the control
      expect(container.querySelectorAll('.stem > [data-block-id]')).toHaveLength(oq.stem.length);
      checked += 1;
      cleanup();
    }
    expect(checked).toBe(7);
  });
});
