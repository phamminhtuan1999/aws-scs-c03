import { expect, test as base, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const TRAINER = path.resolve(here, '..', '..');
export const SHOTS = path.join(TRAINER, 'reports', 'screenshots');
fs.mkdirSync(SHOTS, { recursive: true });

export const readJson = (rel: string) => JSON.parse(fs.readFileSync(path.join(TRAINER, rel), 'utf8'));
export const sourceKeys: Record<string, any> = readJson('data/keys/source_keys.json').keys;
export const bank: any = readJson('data/normalized/bank.json');
export const hotspot: Record<string, any> = readJson('data/interactions/hotspot.json').questions;
export const questionsById: Record<string, any> = Object.fromEntries(bank.questions.map((q: any) => [q.id, q]));
export const allIds: string[] = bank.questions.map((q: any) => q.id);
import { drawQuestionIds } from '../src/session/prng';
/** The questions the app draws for a custom exam on the source basis (unscorable Q008 only when included). */
export const drawIds = (count: number, seed: string, includeUngradable = false) =>
  drawQuestionIds(includeUngradable ? allIds : allIds.filter((id) => sourceKeys[id].gradable), count, seed);

/** Fails a test on any console error, page error, failed request or broken image. */
export const test = base.extend<{ errors: string[] }>({
  errors: async ({ page }, use) => {
    const errors: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(`console.error: ${m.text()}`);
    });
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('requestfailed', (r) => errors.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`));
    page.on('response', (r) => {
      if (r.status() >= 400) errors.push(`HTTP ${r.status()}: ${r.url()}`);
    });
    await use(errors);
    expect(errors, 'console / network errors').toEqual([]);
  },
});
export { expect };

export async function snap(page: Page, name: string, opts: { fullPage?: boolean } = {}) {
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: opts.fullPage ?? false });
}

/** Every <img> on the page loaded (no broken images). */
export async function expectNoBrokenImages(page: Page) {
  const bad = await page.evaluate(async () => {
    const imgs = Array.from(document.images);
    await Promise.all(imgs.map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = () => r(null); }))));
    return imgs.filter((i) => !(i.complete && i.naturalWidth > 0)).map((i) => i.getAttribute('src'));
  });
  expect(bad, 'broken images').toEqual([]);
}

export async function expectNoHorizontalScroll(page: Page) {
  const r = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  expect(r.sw, `horizontal scroll: scrollWidth ${r.sw} > clientWidth ${r.cw}`).toBeLessThanOrEqual(r.cw + 1);
}

// ---- driving the exam -----------------------------------------------------------------------------

export interface CustomOpts {
  basis?: 'research' | 'source';
  count: number;
  minutes?: number;
  seed?: string;
  includeUngradable?: boolean;
  pause?: boolean;
}

export async function startCustom(page: Page, o: CustomOpts) {
  await page.goto('/#/exam/custom');
  if ((o.basis ?? 'source') === 'source') await page.getByRole('radio', { name: /^By source key/ }).check();
  else await page.getByRole('radio', { name: /^By research/ }).check();
  if (o.includeUngradable) await page.getByRole('checkbox', { name: /Include not-scorable questions/ }).check();
  if (o.pause) await page.getByRole('checkbox', { name: /Allow pausing the timer/ }).check();
  await page.getByLabel(/Number of questions/).fill(String(o.count));
  await page.getByLabel(/Duration in minutes/).fill(String(o.minutes ?? 60));
  if (o.seed) await page.getByLabel('Seed').fill(o.seed);
  await page.getByRole('button', { name: 'Start custom exam' }).click();
  await expect(page.getByTestId('question-counter')).toHaveText(`Question 1 of ${o.count}`);
}

export const letterOf = (choiceId: string) => choiceId.split(':')[1];

/** Answer the question currently on screen with the given answer value (choice ids / step ids / pairs). */
export async function answerCurrent(page: Page, qid: string, value: any) {
  const q = questionsById[qid];
  if (q.type === 'multiple_choice') {
    await page.getByRole('radio', { name: `Choice ${letterOf(value[0])}` }).check();
  } else if (q.type === 'multiple_response') {
    for (const id of value) await page.getByRole('checkbox', { name: `Choice ${letterOf(id)}` }).check();
  } else if (q.type === 'ordering') {
    for (let i = 0; i < value.length; i++) await page.getByRole('combobox', { name: `Step ${i + 1}`, exact: true }).selectOption(value[i]);
  } else {
    const prompts = hotspot[qid].prompts as { id: string }[];
    for (let i = 0; i < prompts.length; i++) await page.getByRole('combobox', { name: `Response for row ${i + 1}` }).selectOption(value[prompts[i].id]);
  }
}

export const keyAnswer = (qid: string) => {
  const k = sourceKeys[qid];
  return k.type === 'ordering' ? k.sequence : k.type === 'matching' ? k.pairs : k.choice_ids;
};

/** Jump to question index `i` (0-based) through the Review screen. */
export async function jumpTo(page: Page, i: number) {
  await page.getByRole('button', { name: 'Review screen' }).click();
  await page.getByRole('heading', { name: 'Review screen' }).waitFor();
  await page.locator(`button.review-cell[aria-label^="Question ${i + 1},"]`).click();
  await expect(page.getByTestId('question-counter')).toHaveText(new RegExp(`^Question ${i + 1} of `));
}
