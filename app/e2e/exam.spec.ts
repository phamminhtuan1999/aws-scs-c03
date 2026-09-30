import {
  answerCurrent,
  drawIds,
  expect,
  expectNoBrokenImages,
  expectNoHorizontalScroll,
  jumpTo,
  keyAnswer,
  questionsById,
  snap,
  sourceKeys,
  startCustom,
  test,
} from './helpers';

test.describe('exam simulation', () => {
  test('custom exam over the whole bank: MC, MR, policy images, ordering, matching -> review -> end -> results -> per-question review', async ({ page, errors }) => {
    test.setTimeout(240_000);
    const seed = 'e2e-all';
    await startCustom(page, { count: 143, seed, includeUngradable: true, minutes: 120 });
    const order = drawIds(143, seed, true);
    const at = (qid: string) => order.indexOf(qid);
    await expect(page.getByText('Practice configuration', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: /AWS Certified Security/ })).toBeVisible();
    await expect(page.getByTestId('timer')).toHaveText(/^(01:5\d:\d\d|02:00:00)$/);
    await snap(page, 'desktop-exam-01-first-question');
    // no ids / research status anywhere in the exam UI
    expect(await page.locator('body').innerText()).not.toMatch(/\bQ\d{3}\b|Topic 1|verified|pending|Source key/i);

    const answered: Record<string, any> = {};
    const go = async (qid: string, value?: any, shot?: string) => {
      await jumpTo(page, at(qid));
      if (value !== undefined) {
        await answerCurrent(page, qid, value);
        answered[qid] = value;
      }
      if (shot) {
        await expectNoBrokenImages(page);
        await snap(page, shot);
      }
    };

    // multiple choice with a stem image (policy) and image choices
    await go('Q001', keyAnswer('Q001'), 'desktop-exam-02-mc-policy-stem-image');
    await go('Q004', keyAnswer('Q004'), 'desktop-exam-03-policy-image-choices');
    await expect(page.locator('[data-choice-id] img')).toHaveCount(4);
    await go('Q007', keyAnswer('Q007'));
    await go('Q088', ['Q088:A']); // source key is B -> wrong
    // multiple response
    await go('Q013', keyAnswer('Q013'), 'desktop-exam-04-multiple-response');
    await expect(page.getByText('2 selected')).toBeVisible();
    // ordering: correct, reversed, and incomplete
    await go('Q002', keyAnswer('Q002'), 'desktop-exam-05-ordering');
    const rev = [...keyAnswer('Q005')].reverse();
    await go('Q005', rev);
    await go('Q073', [keyAnswer('Q073')[0]]); // only step 1 -> incomplete
    // matching: correct, one wrong pair, unanswered, and the unscorable Q008
    await go('Q079', keyAnswer('Q079'), 'desktop-exam-06-matching');
    const p81 = { ...keyAnswer('Q081') };
    const k81 = Object.keys(p81);
    [p81[k81[0]], p81[k81[1]]] = [p81[k81[1]], p81[k81[0]]];
    await go('Q081', p81);
    await go('Q082');
    await go('Q008', keyAnswer('Q008'));
    // Q008 has a key but is not scorable; the app still lets you answer it
    expect(sourceKeys.Q008.gradable).toBe(false);

    // flag / unflag
    await jumpTo(page, at('Q004'));
    const flag = page.getByRole('button', { name: /Flag for review/ });
    await flag.click();
    await expect(flag).toHaveAttribute('aria-pressed', 'true');
    await flag.click();
    await expect(flag).toHaveAttribute('aria-pressed', 'false');
    await jumpTo(page, at('Q013'));
    await flag.click();
    await jumpTo(page, at('Q088'));
    await flag.click();

    // review screen
    await page.getByRole('button', { name: 'Review screen' }).click();
    await expect(page.getByRole('heading', { name: 'Review screen' })).toBeVisible();
    const nAnswered = Object.keys(answered).length; // Q082 not answered
    await expect(page.locator('.review-summary')).toContainText(`Answered: ${nAnswered - 1}`); // Q073 is incomplete, counted separately
    await expect(page.locator('.review-summary')).toContainText('Incomplete: 1');
    await expect(page.locator('.review-summary')).toContainText('Flagged for review: 2');
    await page.getByRole('button', { name: /^Flagged/ }).click();
    await expect(page.locator('button.review-cell')).toHaveCount(2);
    await snap(page, 'desktop-exam-07-review-flagged-filter');
    await page.getByRole('button', { name: /^All/ }).click();
    await expect(page.locator('button.review-cell')).toHaveCount(143);
    await snap(page, 'desktop-exam-08-review-all');
    // jump back from the review grid
    await page.locator(`button.review-cell[aria-label^="Question ${at('Q002') + 1},"]`).click();
    await expect(page.getByRole('combobox', { name: 'Step 1', exact: true })).toHaveValue(keyAnswer('Q002')[0]); // answer kept

    // zoom dialog: keyboard, focus restore
    await jumpTo(page, at('Q004'));
    const zoomBtn = page.getByRole('button', { name: 'Zoom image' }).first();
    await zoomBtn.focus();
    await page.keyboard.press('Enter');
    const dlg = page.getByRole('dialog', { name: 'Image viewer' });
    await expect(dlg).toBeVisible();
    await dlg.getByRole('button', { name: 'Zoom in' }).click();
    await expect(dlg.getByText('150%')).toBeVisible();
    await snap(page, 'desktop-exam-09-zoom-dialog');
    await page.keyboard.press('Escape');
    await expect(dlg).toBeHidden();
    await expect(zoomBtn).toBeFocused();

    // End exam dialog
    await page.getByRole('button', { name: 'End exam' }).click();
    const end = page.getByRole('alertdialog', { name: 'End exam?' });
    await expect(end).toContainText('unanswered question');
    await expect(end).toContainText('2 flagged for review');
    await snap(page, 'desktop-exam-10-end-dialog');
    await end.getByRole('button', { name: 'Return to exam' }).click();
    await expect(end).toBeHidden();
    await page.getByRole('button', { name: 'End exam' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'End exam' }).click();

    // results
    await expect(page.getByRole('heading', { name: 'Exam results' })).toBeVisible();
    await expect(page.getByTestId('score')).toContainText('Raw score: 6 / 142 (4.2%)');
    await expect(page.getByText('Raw practice score — not an AWS scaled score; does not predict a pass.')).toBeVisible();
    await expect(page.getByText(/By source key — not guaranteed technically correct \(research_version/)).toBeVisible();
    await expect(page.locator('dl.kv')).toContainText('correct 6 · incorrect 4 · unanswered 132 · flagged 2 · not scored 1');
    await expect(page.getByRole('heading', { name: 'Not scored (1)' })).toBeVisible();
    await snap(page, 'desktop-results-01-summary');
    await snap(page, 'desktop-results-02-full', { fullPage: true });

    // per-question review with the source answer image (ordering)
    const row = page.locator('tbody tr', { has: page.getByRole('cell', { name: 'Q002', exact: true }) });
    await row.getByRole('link', { name: 'Review' }).click();
    await expect(page.getByRole('heading', { name: /Review: question \d+ of 143/ })).toBeVisible();
    await expect(page.getByText('✓ Matches the source key (scored against the source key)')).toBeVisible();
    await expect(page.locator('[data-answer-image]')).toHaveCount(1);
    await expect(page.getByText('Source answer image', { exact: true })).toBeVisible();
    await expectNoBrokenImages(page);
    await snap(page, 'desktop-results-03-review-ordering-answer-image', { fullPage: true });
    // wrong policy-image question
    await page.goto(`/#/exam/results/${await sessionId(page)}/${at('Q088') + 1}`);
    await expect(page.getByText('✗ Differs from the source key (scored against the source key)')).toBeVisible();
    await expect(page.locator('p.answer-line')).toContainText('Answer: B');
    await expect(page.locator('p.answer-line')).toContainText('You chose: A');
    await snap(page, 'desktop-results-04-review-wrong-policy-choice');
    // Q008: shown, not scored
    await page.goto(`/#/exam/results/${await sessionId(page)}/${at('Q008') + 1}`);
    await expect(page.getByText(/Not scorable\./)).toBeVisible();
    await expect(page.locator('[data-answer-image]')).toHaveCount(1);
    await snap(page, 'desktop-results-05-review-q008-not-scorable', { fullPage: true });
    // matching review annotations
    await page.goto(`/#/exam/results/${await sessionId(page)}/${at('Q081') + 1}`);
    await expect(page.getByText('✗ Differs from the source key (scored against the source key)')).toBeVisible();
    await expect(page.locator('.match-row .badge').first()).toBeVisible();
    await expectNoBrokenImages(page);
    await expectNoHorizontalScroll(page);
    expect(errors).toEqual([]);

    // history lists the exam
    await page.goto('/#/history');
    await expect(page.getByRole('heading', { name: 'History & stats' })).toBeVisible();
    await expect(page.locator('tbody tr').first()).toContainText('6 / 142');
    await snap(page, 'desktop-history');
  });

  test('refresh mid-exam restores answers, the current question, flags and keeps the timer running', async ({ page }) => {
    await startCustom(page, { count: 5, seed: 'refresh', minutes: 60 });
    const order = drawIds(5, 'refresh');
    // answer question 1 by its type
    const first = order[0];
    await answerCurrent(page, first, keyAnswer(first));
    await page.getByRole('button', { name: /Flag for review/ }).click();
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByTestId('question-counter')).toHaveText('Question 3 of 5');
    const before = await page.getByTestId('timer').innerText();
    await page.waitForTimeout(2200);
    await page.reload();
    await expect(page.getByTestId('question-counter')).toHaveText('Question 3 of 5');
    const after = await page.getByTestId('timer').innerText();
    expect(after <= before, `timer must not reset: ${before} -> ${after}`).toBe(true);
    expect(after.startsWith('00:5')).toBe(true); // nowhere near a reset to 01:00:00
    await jumpTo(page, 0);
    await expect(page.getByRole('button', { name: /Flag for review/ })).toHaveAttribute('aria-pressed', 'true');
    const q = questionsById[first];
    if (q.type === 'multiple_choice') await expect(page.getByRole('radio', { name: `Choice ${keyAnswer(first)[0].split(':')[1]}` })).toBeChecked();
    else if (q.type === 'multiple_response') await expect(page.locator('input:checked')).toHaveCount(keyAnswer(first).length);
    else await expect(page.getByRole('combobox', { name: /Step 1|Response for row 1/ }).first()).not.toHaveValue('');
  });

  test('timeout auto-submits exactly once and locks the exam (page.clock)', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-03-01T10:00:00Z') });
    await startCustom(page, { count: 3, seed: 'timeout', minutes: 1 });
    const order = drawIds(3, 'timeout');
    await answerCurrent(page, order[0], keyAnswer(order[0]));
    await expect(page.getByTestId('timer')).toHaveText(/^00:00:(59|5\d)$|^00:01:00$/);
    await page.clock.fastForward('01:30');
    await expect(page.getByRole('heading', { name: 'Exam results' })).toBeVisible();
    await expect(page.getByText('Time ran out: the exam was submitted automatically')).toBeVisible();
    const sessions = await page.evaluate(() => {
      const out: any[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)!;
        if (k.startsWith('scs-c03-trainer:v1:session:')) out.push(JSON.parse(localStorage.getItem(k)!).data);
      }
      return out;
    });
    expect(sessions).toHaveLength(1);
    expect(sessions[0].status).toBe('submitted');
    expect(sessions[0].submit_reason).toBe('timeout');
    const stamp = sessions[0].updated_at;
    await page.clock.fastForward('05:00'); // many more ticks: nothing changes
    const again = await page.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find((k) => k.includes(':session:'))!)!).data.updated_at);
    expect(again).toBe(stamp);
    // the exam cannot be reopened
    await page.goto('/#/exam/run');
    await expect(page.getByTestId('question-counter')).toHaveCount(0);
  });

  test('an exam that expired while the tab was closed is graded on load (expired_on_load)', async ({ page }) => {
    await startCustom(page, { count: 3, seed: 'expire-on-load', minutes: 1 });
    // "close the tab" and come back after the deadline: rewrite the stored deadline into the past
    await page.evaluate(() => {
      const k = Object.keys(localStorage).find((x) => x.includes(':session:'))!;
      const env = JSON.parse(localStorage.getItem(k)!);
      env.data.started_at -= 3600_000;
      env.data.deadline -= 3600_000;
      localStorage.setItem(k, JSON.stringify(env));
    });
    await page.goto('/#/');
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Exam results' })).toBeVisible();
    await expect(page.getByText('Time ran out while the app was closed')).toBeVisible();
  });

  test('while an exam is running other areas are locked ("Exam in progress") and nothing leaks', async ({ page }) => {
    await startCustom(page, { count: 3, seed: 'locked', minutes: 30 });
    for (const hash of ['#/bank', '#/bank/Q001', '#/coverage', '#/coverage/Q002', '#/study', '#/practice', '#/history', '#/data', '#/']) {
      await page.goto(`/${hash}`);
      await expect(page.getByRole('heading', { name: 'Exam in progress' }), hash).toBeVisible();
      await expect(page.locator('[data-block-id]')).toHaveCount(0);
      await expect(page.getByRole('navigation', { name: 'Main' })).toHaveCount(0);
    }
    await snap(page, 'desktop-exam-in-progress-lock');
    await page.getByRole('button', { name: 'Return to exam' }).click();
    await expect(page.getByTestId('question-counter')).toBeVisible();
    // the exam is still the same one (timer kept running, not restarted)
    await expect(page.getByTestId('timer')).toHaveText(/^00:(29|30):/);
  });

  test('standard start screen: default basis is "By research"; shorter exam or explicit switch when the pool is small', async ({ page }) => {
    await page.goto('/#/exam');
    await expect(page.getByRole('radio', { name: /^By research/ })).toBeChecked();
    const reviews = await (await page.request.get('/data/question_reviews.json')).json();
    const eligible = Object.entries<any>(reviews.questions).filter(([id, r]) => r.gradable_by_research && sourceKeys[id].gradable).length;
    await expect(page.getByText(`Eligible questions: ${eligible} of 143`)).toBeVisible();
    await expect(page.getByText('Eligible questions: 142 of 143')).toBeVisible();
    await snap(page, 'desktop-exam-start-default-research');
    if (eligible < 65) {
      await expect(page.getByText(new RegExp(`Only ${eligible} question`))).toBeVisible();
      await expect(page.getByRole('button', { name: /Switch to By source key — not guaranteed technically correct/ })).toBeVisible();
      if (eligible > 0) await expect(page.getByRole('button', { name: new RegExp(`Take a shorter exam \\(${eligible} question`) })).toBeVisible();
      await expect(page.getByRole('button', { name: /^Start exam/ })).toHaveCount(0);
      await page.getByRole('button', { name: /Switch to By source key/ }).click();
    } else {
      await page.getByRole('radio', { name: /^By source key/ }).check();
    }
    await expect(page.getByRole('radio', { name: /^By source key/ })).toBeChecked();
    await snap(page, 'desktop-exam-start-source-basis');
    await page.getByLabel(/^Seed/).fill('e2e-standard');
    await page.getByRole('button', { name: 'Start exam (65 questions, 170 minutes)' }).click();
    await expect(page.getByTestId('question-counter')).toHaveText('Question 1 of 65');
    await expect(page.getByTestId('timer')).toHaveText(/^02:49:|^02:50:00$/);
    await expect(page.getByRole('button', { name: /Pause timer/ })).toHaveCount(0);
    await expect(page.getByText('Practice configuration')).toHaveCount(0); // the standard exam is not a "practice configuration"
    await snap(page, 'desktop-exam-standard-first-question');
    // quick finish: everything unanswered = incorrect, 65 scored
    await page.getByRole('button', { name: 'End exam' }).click();
    await expect(page.getByRole('alertdialog')).toContainText('65 unanswered');
    await page.getByRole('alertdialog').getByRole('button', { name: 'End exam' }).click();
    await expect(page.getByTestId('score')).toContainText('Raw score: 0 / 65 (0.0%)');
  });

  test('ordering and matching are fully keyboard operable (drop-downs, swap, clear)', async ({ page }) => {
    const seed = 'kbd';
    await startCustom(page, { count: 143, seed, includeUngradable: true });
    const order = drawIds(143, seed, true);
    await jumpTo(page, order.indexOf('Q002'));
    const step1 = page.getByRole('combobox', { name: 'Step 1', exact: true });
    await step1.focus();
    await page.keyboard.press('ArrowDown'); // native select: choose the first step
    await expect(step1).not.toHaveValue('');
    const v1 = await step1.inputValue();
    // the chosen step is disabled in the other slots (reuse:false)
    const other = page.getByRole('combobox', { name: 'Step 2', exact: true });
    await expect(other.locator(`option[value="${v1}"]`)).toBeDisabled();
    await page.getByRole('button', { name: 'Move step 1 down' }).focus();
    await page.keyboard.press('Enter');
    await expect(other).toHaveValue(v1);
    await expect(step1).toHaveValue('');
    await page.getByRole('button', { name: 'Clear step 2' }).focus();
    await page.keyboard.press('Space');
    await expect(other).toHaveValue('');
    await snap(page, 'desktop-exam-ordering-keyboard');
    await jumpTo(page, order.indexOf('Q079'));
    const row1 = page.getByRole('combobox', { name: 'Response for row 1' });
    await row1.selectOption({ index: 2 });
    const chosen = await row1.inputValue();
    await expect(page.getByRole('combobox', { name: 'Response for row 2' }).locator(`option[value="${chosen}"]`)).toBeDisabled();
    await expect(page.getByRole('combobox', { name: 'Response for row 2' }).locator(`option[value="${chosen}"]`)).toContainText('(used in row 1)');
  });
});

async function sessionId(page: import('@playwright/test').Page): Promise<string> {
  return page.evaluate(() => {
    const k = Object.keys(localStorage).find((x) => x.includes(':session:'))!;
    return k.split(':session:')[1];
  });
}
