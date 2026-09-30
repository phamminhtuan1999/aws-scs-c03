import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fixtureReviews } from '../tests/helpers/fixtures';
import {
  answerCurrent,
  drawIds,
  expect,
  expectNoBrokenImages,
  expectNoHorizontalScroll,
  hotspot,
  keyAnswer,
  questionsById,
  snap,
  startCustom,
  test,
} from './helpers';

const FEEDBACK_WORDS = ['Giải thích', 'Grading basis', 'Source key', 'Researched answer', 'Research details'];

test.describe('home', () => {
  test('identity line, the four entry cards and the secondary links', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Independent practice tool — not affiliated with, endorsed by, or a copy of AWS or Pearson VUE.')).toBeVisible();
    await expect(page.getByRole('link', { name: /Practice in order \(Q001 → Q143\)/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Exam simulation \(65 questions \/ 170 minutes\)/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Study \(custom set\)/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Custom exam/ })).toBeVisible();
    for (const n of ['Question bank', 'Research coverage', 'History & stats', 'Saved tips', 'Settings', 'Export / Import']) {
      await expect(page.getByRole('link', { name: n, exact: true }).first()).toBeVisible();
    }
    await snap(page, 'desktop-01-home');
  });
});

test.describe('study', () => {
  test('nothing about the answer exists in the DOM before Check answer; it appears only after', async ({ page }) => {
    await page.goto('/#/bank/Q001');
    await expect(page.getByRole('button', { name: 'Check answer' })).toBeVisible();
    const before = await page.locator('body').innerHTML();
    for (const w of FEEDBACK_WORDS) expect(before, w).not.toContain(w);
    await expect(page.locator('[data-feedback], [data-answer-image], .verdict')).toHaveCount(0);
    await page.getByRole('radio', { name: 'Choice A' }).check();
    await expect(page.locator('[data-feedback]')).toHaveCount(0);
    await snap(page, 'desktop-study-01-before-check');
    await page.getByRole('button', { name: 'Check answer' }).click();
    await expect(page.locator('[data-feedback="Q001"]')).toBeVisible();
    await expect(page.getByText('Giải thích')).toBeVisible();
    // The independent r2 pass found no complete literal answer for Q001.
    // Its original C key remains visible without being called a verified answer.
    await expect(page.locator('p.answer-line')).toContainText('Source key (not verified): C');
    await expect(page.getByText('✓ Correct', { exact: true })).toHaveCount(0);
    await expect(page.getByText('✗ Incorrect', { exact: true })).toHaveCount(0);
    await expect(page.locator('p.answer-line')).toContainText('You chose: A');
    await expect(page.getByRole('radio', { name: 'Choice A' })).toBeDisabled();
    await snap(page, 'desktop-study-02-after-check-real-research', { fullPage: true });
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page.locator('[data-feedback]')).toHaveCount(0);
  });

  test('image-policy choices (Q004) and ordering/matching answers show the green source answer image only after checking', async ({ page }) => {
    for (const qid of ['Q004', 'Q005', 'Q081']) {
      await page.goto(`/#/bank/${qid}`);
      await expect(page.getByRole('button', { name: 'Check answer' })).toBeVisible();
      await expect(page.locator('[data-answer-image]')).toHaveCount(0);
      await expectNoBrokenImages(page);
      if (qid === 'Q004') {
        await expect(page.locator('[data-choice-id] img')).toHaveCount(4);
        await snap(page, 'desktop-study-03-policy-image-choices', { fullPage: true });
      } else {
        await snap(page, `desktop-study-04-${qid.toLowerCase()}-before-check`, { fullPage: true });
      }
      await page.getByRole('button', { name: 'Check answer' }).click();
      await expect(page.locator('[data-feedback]')).toBeVisible();
      if (qid !== 'Q004') {
        await expect(page.locator('[data-answer-image]')).toHaveCount(1);
        await expect(page.getByText('Source answer image', { exact: true })).toBeVisible();
        await expectNoBrokenImages(page);
        await snap(page, `desktop-study-05-${qid.toLowerCase()}-answer-image`, { fullPage: true });
      }
    }
  });

  test('verified research that DIFFERS from the source key (test-only fixture): graded by research, difference shown', async ({ page }) => {
    await page.route('**/data/question_reviews.json', (route) => route.fulfill({ json: fixtureReviews() }));
    await page.goto('/#/bank/Q003');
    await page.getByRole('radio', { name: 'Choice A' }).check();
    await page.getByRole('button', { name: 'Check answer' }).click();
    await expect(page.getByText('✓ Correct')).toBeVisible();
    await expect(page.getByText(/Source key:\s*B\s*\(differs — see research\)/)).toBeVisible();
    await expect(page.getByText('FIXTURE_WHY_CORRECT_Q003')).toBeVisible();
    await snap(page, 'desktop-study-06-FIXTURE-verified-differs-from-source');
  });

  test('disputed (test-only fixture) never says "wrong" and shows source key and research separately', async ({ page }) => {
    await page.route('**/data/question_reviews.json', (route) => route.fulfill({ json: fixtureReviews() }));
    await page.goto('/#/bank/Q013');
    for (const l of ['A', 'E']) await page.getByRole('checkbox', { name: `Choice ${l}` }).check();
    await page.getByRole('button', { name: 'Check answer' }).click();
    await expect(page.getByText('No settled conclusion yet')).toBeVisible();
    const t = await page.locator('.feedback').innerText();
    expect(t).not.toMatch(/Incorrect|✗|\bwrong\b/i);
    await expect(page.getByText(/Source key — not technically verified/).first()).toBeVisible();
    await expect(page.getByText(/Research conclusion — status Disputed/)).toBeVisible();
    await snap(page, 'desktop-study-07-FIXTURE-disputed');
  });

  test('study set picker: ID range, resume position after reload, bookmark + save tip', async ({ page }) => {
    await page.goto('/#/study');
    await snap(page, 'desktop-study-08-picker');
    await page.getByRole('radio', { name: /Question IDs or ranges/ }).check();
    await page.locator('#ids').fill('Q003-Q005, Q010');
    await expect(page.getByText(/4\s+questions in this set/)).toBeVisible();
    await page.getByRole('button', { name: 'Start studying' }).click();
    await expect(page.getByRole('heading', { name: /^Q003/ })).toBeVisible();
    await expect(page.getByText('Question 1 of 4')).toBeVisible();
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByRole('heading', { name: /^Q004/ })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: /^Q004/ })).toBeVisible();
    await page.getByRole('button', { name: 'Bookmark' }).click();
    await page.getByRole('button', { name: 'Save tip' }).click();
    await page.getByLabel(/Tip for Q004/).fill('remember the Region condition <i>always</i>');
    await page.locator('form.tip-form').getByRole('button', { name: 'Save tip' }).click();
    await page.goto('/#/tips');
    await expect(page.getByText('remember the Region condition <i>always</i>')).toBeVisible();
    await expect(page.locator('.tip-text i')).toHaveCount(0);
    await snap(page, 'desktop-tips');
    // the wrong-last-time and flagged sets reflect activity
    await page.goto('/#/study');
    await page.getByRole('radio', { name: 'Flagged / bookmarked' }).check();
    await expect(page.getByText(/1\s+question in this set/)).toBeVisible();
  });
});

test.describe('practice in order', () => {
  test('starts at Q001, remembers the position, shows n / 143 checked and resumes after a reload', async ({ page }) => {
    await page.goto('/#/practice');
    await expect(page.getByText('0 / 143')).toBeVisible();
    await snap(page, 'desktop-practice-01-home');
    await page.getByRole('button', { name: 'Start at Q001' }).click();
    await expect(page.getByRole('heading', { name: /^Q001/ })).toBeVisible();
    await page.getByRole('radio', { name: 'Choice C' }).check();
    await page.getByRole('button', { name: 'Check answer' }).click();
    await expect(page.locator('[data-feedback="Q001"]')).toBeVisible();
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByRole('heading', { name: /^Q002/ })).toBeVisible();
    await expect(page.getByText(/1 \/ 143\s*checked/)).toBeVisible();
    await snap(page, 'desktop-practice-02-q002');
    await page.reload();
    await expect(page.getByRole('heading', { name: /^Q002/ })).toBeVisible();
    await page.goto('/#/practice');
    await expect(page.getByRole('button', { name: 'Resume at Q002' })).toBeVisible();
    await expect(page.getByText(/1 \/ 143/)).toBeVisible();
    await page.getByLabel('Jump to Q…').fill('143');
    await page.getByRole('button', { name: 'Go' }).click();
    await expect(page.getByRole('heading', { name: /^Q143/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Finish' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Next', exact: true })).toHaveCount(0);
  });
});

test.describe('bank, coverage, settings', () => {
  test('bank search by Qxxx and text, and filters', async ({ page }) => {
    await page.goto('/#/bank');
    await expect(page.getByTestId('bank-count')).toHaveText('143 of 143 questions');
    await page.getByLabel(/Search by Qxxx/).fill('Q042');
    await expect(page.getByTestId('bank-count')).toHaveText(/^1 of 143/);
    await expect(page.getByRole('link', { name: 'Q042', exact: true })).toBeVisible();
    await page.getByLabel(/Search by Qxxx/).fill('hotspot');
    const n = Number(/^(\d+)/.exec(await page.getByTestId('bank-count').innerText())![1]);
    expect(n).toBeGreaterThanOrEqual(7);
    await page.getByLabel(/Search by Qxxx/).fill('');
    await page.getByLabel('Type').selectOption('matching');
    await expect(page.getByTestId('bank-count')).toHaveText(/^4 of 143/);
    await page.getByLabel('Type').selectOption('');
    await page.getByLabel('My progress').selectOption('unattempted');
    await expect(page.getByTestId('bank-count')).toHaveText(/^143 of 143/);
    await snap(page, 'desktop-bank');
    await page.getByRole('link', { name: 'Q007', exact: true }).click();
    await expect(page.getByRole('heading', { name: /^Q007/ })).toBeVisible();
    await expect(page.locator('[data-feedback]')).toHaveCount(0);
  });

  test('research coverage reflects the served question_reviews.json; pending is never shown as verified', async ({ page }) => {
    const reviews = await (await page.request.get('/data/question_reviews.json')).json();
    const entries = Object.entries<any>(reviews.questions);
    const by: Record<string, number> = { verified: 0, disputed: 0, ambiguous: 0, outdated: 0, unresolved: 0, pending: 0 };
    let gradable = 0;
    let differs = 0;
    let units = 0;
    for (const [id, r] of entries) {
      by[r.status] += 1;
      if (r.gradable_by_research) gradable += 1;
      if (r.differs_from_source) differs += 1;
      const q = questionsById[id];
      const hs = hotspot[id];
      const valid = new Set<string>(q.choices.map((c: any) => c.id));
      if (hs?.kind === 'ordering') hs.steps.forEach((s: any) => valid.add(s.id));
      if (hs?.kind === 'matching') [...hs.prompts, ...hs.responses].forEach((s: any) => valid.add(s.id));
      units += new Set((r.option_reviews ?? []).map((o: any) => o.unit_id).filter((u: string) => valid.has(u))).size;
    }
    await page.goto('/#/coverage');
    await expect(page.getByRole('heading', { name: 'Research coverage' })).toBeVisible();
    for (const [st, n] of Object.entries(by)) await expect(page.locator(`li[data-status="${st}"] .stat-num`)).toHaveText(String(n));
    await expect(page.getByTestId('gradable-count')).toHaveText(String(gradable));
    await expect(page.getByTestId('differs-count')).toHaveText(String(differs));
    await expect(page.getByTestId('units-count')).toHaveText(`${units} / 628`);
    await expect(page.locator('tbody tr')).toHaveCount(143);
    // a question that is still pending must never carry a "verified" badge
    const pendingId = entries.find(([, r]) => r.status === 'pending')?.[0];
    if (pendingId) {
      const row = page.locator('tbody tr', { has: page.getByRole('link', { name: pendingId, exact: true }) });
      await expect(row.locator('.badge')).toHaveText('pending');
    }
    await snap(page, 'desktop-coverage');
    // detail page
    const firstId = entries[0][0];
    await page.getByRole('link', { name: firstId, exact: true }).first().click();
    await expect(page.getByRole('heading', { name: new RegExp(`Research record: ${firstId}`) })).toBeVisible();
    await snap(page, 'desktop-coverage-detail', { fullPage: true });
  });

  test('coverage detail of a verified question lists per-option verdicts, references, dates and both verdicts (real research)', async ({ page }) => {
    const reviews = await (await page.request.get('/data/question_reviews.json')).json();
    const v = Object.entries<any>(reviews.questions).find(([, r]) => r.status === 'verified');
    test.skip(!v, 'no verified question in the research file yet');
    const [id, r] = v!;
    await page.goto(`/#/coverage/${id}`);
    await expect(page.getByRole('heading', { name: /Per-option reviews/ })).toBeVisible();
    await expect(page.locator('.data-table tbody tr').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: /References and evidence/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Independent \(blind\) verdict vs final/ })).toBeVisible();
    if (r.references?.[0]?.quote) await expect(page.getByText(r.references[0].quote.slice(0, 30), { exact: false }).first()).toBeVisible();
    await snap(page, 'desktop-coverage-detail-verified', { fullPage: true });
  });

  test('settings persist across a reload: text size, high contrast and colour scheme', async ({ page }) => {
    await page.goto('/#/settings');
    await page.getByRole('radio', { name: 'Larger' }).check();
    await page.getByRole('checkbox', { name: 'High contrast' }).check();
    await page.getByLabel('Color scheme').selectOption('white-on-black');
    await expect(page.locator('html')).toHaveAttribute('data-font', '2');
    await expect(page.locator('html')).toHaveAttribute('data-scheme', 'white-on-black');
    await snap(page, 'desktop-settings-white-on-black');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-font', '2');
    await expect(page.locator('html')).toHaveAttribute('data-contrast', 'high');
    await expect(page.locator('html')).toHaveAttribute('data-scheme', 'white-on-black');
    const fs2 = await page.evaluate(() => getComputedStyle(document.documentElement).fontSize);
    expect(fs2).toBe('20px');
    await page.getByLabel('Color scheme').selectOption('black-on-light-yellow');
    await snap(page, 'desktop-settings-black-on-light-yellow');
  });
});

test.describe('export / import', () => {
  test('round trip: export, clear, import (replace), and bad / hostile files are rejected or inert', async ({ page }) => {
    // make some progress: a finished 3-question exam, a study attempt, a bookmark and a tip
    await startCustom(page, { count: 3, seed: 'exp', minutes: 30 });
    await page.getByRole('button', { name: 'End exam' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'End exam' }).click();
    await expect(page.getByRole('heading', { name: 'Exam results' })).toBeVisible();
    await page.goto('/#/bank/Q001');
    await page.getByRole('radio', { name: 'Choice A' }).check();
    await page.getByRole('button', { name: 'Check answer' }).click();
    await page.getByRole('button', { name: 'Bookmark' }).click();
    await page.getByRole('button', { name: 'Save tip' }).click();
    await page.getByLabel(/Tip for Q001/).fill('tip <img src=x onerror="window.__pwned=1">');
    await page.locator('form.tip-form').getByRole('button', { name: 'Save tip' }).click();

    await page.goto('/#/data');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export progress (JSON)' }).click()]);
    const file = path.join(os.tmpdir(), `scs-export-${Date.now()}.json`);
    await dl.saveAs(file);
    const exported = JSON.parse(fs.readFileSync(file, 'utf8'));
    expect(exported.format).toBe('scs-c03-trainer-progress');
    expect(exported.version).toBe(1);
    expect(exported.data.sessions).toHaveLength(1);
    expect(Object.keys(exported.data).sort()).toEqual(['bookmarks', 'practice', 'sessions', 'settings', 'study', 'tips']);
    expect(exported.data.tips).toHaveLength(1);
    await snap(page, 'desktop-data-export');

    // wipe and confirm the wipe
    await page.evaluate(() => localStorage.clear());
    await page.goto('/#/history');
    await page.reload();
    await expect(page.getByText(/No finished exams yet/)).toBeVisible();

    // import (replace)
    await page.goto('/#/data');
    await page.setInputFiles('#import-file', file);
    await expect(page.getByRole('region', { name: 'Import preview' })).toContainText('1 finished exam');
    await snap(page, 'desktop-data-import-preview');
    await page.getByRole('button', { name: 'Replace existing data' }).click();
    await expect(page.getByTestId('transfer-status')).toContainText('Import finished');
    await page.goto('/#/history');
    await expect(page.locator('tbody tr').first()).toContainText('Practice configuration');
    await page.goto('/#/tips');
    await expect(page.getByText('tip <img src=x onerror="window.__pwned=1">')).toBeVisible(); // literal text
    expect(await page.evaluate(() => (window as unknown as Record<string, unknown>).__pwned)).toBeUndefined();
    await expect(page.locator('.tip-text img')).toHaveCount(0);

    // a second import in merge mode does not duplicate anything
    await page.goto('/#/data');
    await page.setInputFiles('#import-file', file);
    await page.getByRole('button', { name: 'Merge into existing data' }).click();
    await expect(page.getByTestId('transfer-status')).toContainText('merged');
    await page.goto('/#/history');
    await expect(page.locator('tbody tr')).toHaveCount(1);

    // bad files: wrong version, wrong format, unknown question id, not JSON
    const bad = async (name: string, content: string, expectText: RegExp) => {
      await page.goto('/#/data');
      await page.setInputFiles('#import-file', { name, mimeType: 'application/json', buffer: Buffer.from(content) });
      await expect(page.getByTestId('import-error')).toContainText(expectText);
      await expect(page.getByRole('button', { name: 'Replace existing data' })).toHaveCount(0);
    };
    await bad('v2.json', JSON.stringify({ ...exported, version: 2 }), /Unsupported progress file version/);
    await bad('fmt.json', JSON.stringify({ ...exported, format: 'other' }), /not a progress file/);
    await bad('qid.json', JSON.stringify({ ...exported, data: { ...exported.data, bookmarks: { bookmarked: ['Q999'], flagged: [] } } }), /unknown question IDs/);
    await bad('junk.json', '<html><script>alert(1)</script>', /not valid JSON/);
    await snap(page, 'desktop-data-import-error');
    // existing data untouched by the failed imports
    await page.goto('/#/history');
    await expect(page.locator('tbody tr')).toHaveCount(1);
  });
});

test.describe('mobile', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('home, exam question, review screen (360-375px), results and coverage fit without horizontal scroll', async ({ page }) => {
    await page.goto('/');
    await expectNoHorizontalScroll(page);
    await snap(page, 'mobile-01-home');
    const seed = 'mobile';
    await startCustom(page, { count: 6, seed, minutes: 30 });
    await expectNoHorizontalScroll(page);
    await snap(page, 'mobile-02-exam-first-question');
    // answer the first question, then open the review screen
    const ids = drawIds(6, seed);
    await answerCurrent(page, ids[0], keyAnswer(ids[0]));
    await page.getByRole('button', { name: /Flag for review/ }).click();
    await page.getByRole('button', { name: 'Review screen' }).click();
    await expect(page.getByRole('heading', { name: 'Review screen' })).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expect(page.locator('button.review-cell')).toHaveCount(6);
    await snap(page, 'mobile-03-review-screen');
    // footer never covers content: scroll to the bottom and compare positions
    await page.getByRole('button', { name: 'Return to question' }).click();
    // Returning to the question runs a focus/scroll-to-top effect. Wait for that
    // render to settle while checking the actual footer gap, rather than racing it.
    await expect.poll(async () => page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
      const nav = document.querySelector('.exam-bottomnav')!.getBoundingClientRect();
      const main = document.querySelector('.exam-main')!;
      const last = main.lastElementChild!.getBoundingClientRect();
      return nav.top - last.bottom;
    }), { message: 'the fixed footer must not cover the last element' }).toBeGreaterThanOrEqual(0);
    await snap(page, 'mobile-04-exam-scrolled-bottom');
    await page.getByRole('button', { name: 'End exam' }).click();
    await snap(page, 'mobile-05-end-dialog');
    await page.getByRole('alertdialog').getByRole('button', { name: 'End exam' }).click();
    await expect(page.getByRole('heading', { name: 'Exam results' })).toBeVisible();
    await expectNoHorizontalScroll(page);
    await snap(page, 'mobile-06-results');
    await page.goto('/#/coverage');
    await expectNoHorizontalScroll(page);
    await snap(page, 'mobile-07-coverage');
    await page.goto('/#/bank/Q002');
    await expectNoHorizontalScroll(page);
    await snap(page, 'mobile-08-study-ordering', { fullPage: true });
  });

  test('360px wide review screen', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await startCustom(page, { count: 12, seed: 'w360', minutes: 30 });
    await page.getByRole('button', { name: 'Review screen' }).click();
    await expectNoHorizontalScroll(page);
    await snap(page, 'mobile-09-review-360px');
  });
});
