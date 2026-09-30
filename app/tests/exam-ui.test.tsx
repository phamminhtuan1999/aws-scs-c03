import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { FakeClock, setClock } from '../src/time/clock';
import { listSessions, loadSession, getActiveSessionId } from '../src/storage/slots';
import { submitActive } from '../src/ui/exam/active';
import { EXAM_NAME } from '../src/version';
import { loadRealData, allPendingReviews } from './helpers/data';
import { MARK, fixtureReviews } from './helpers/fixtures';
import { renderApp } from './helpers/render';
import { makeActiveExam } from './helpers/session';

const T0 = Date.UTC(2026, 0, 1, 12, 0, 0);
const MIN = 60_000;
const fx = () => loadRealData(fixtureReviews());
const pending = () => loadRealData(allPendingReviews());
const body = () => document.body.textContent ?? '';
const ids5 = ['Q001', 'Q013', 'Q002', 'Q079', 'Q004'];

async function next(user: ReturnType<typeof userEvent.setup>, n: number) {
  await user.click(screen.getByRole('button', { name: 'Next' }));
  await waitFor(() => expect(screen.getByTestId('question-counter')).toHaveTextContent(`Question ${n} of 5`));
}

async function answerAll(user: ReturnType<typeof userEvent.setup>, wrongLast = true) {
  // Q001 (MC) -> C (correct)
  await user.click(screen.getByRole('radio', { name: 'Choice C' }));
  await next(user, 2);
  // Q013 (MR) -> A, E (correct)
  await user.click(await screen.findByRole('checkbox', { name: 'Choice A' }));
  await user.click(screen.getByRole('checkbox', { name: 'Choice E' }));
  await next(user, 3);
  // Q002 ordering -> S1, S5, S3 (correct)
  await user.selectOptions(await screen.findByRole('combobox', { name: 'Step 1' }), 'Q002:S1');
  await user.selectOptions(screen.getByRole('combobox', { name: 'Step 2' }), 'Q002:S5');
  await user.selectOptions(screen.getByRole('combobox', { name: 'Step 3' }), 'Q002:S3');
  await next(user, 4);
  // Q079 matching -> R2, R6, R1 (correct)
  const rows = await screen.findAllByRole('combobox', { name: /Response for row/ });
  await user.selectOptions(rows[0], 'Q079:R2');
  await user.selectOptions(rows[1], 'Q079:R6');
  await user.selectOptions(rows[2], 'Q079:R1');
  await next(user, 5);
  // Q004 (policy images) -> A (source key is C => wrong)
  await user.click(await screen.findByRole('radio', { name: wrongLast ? 'Choice A' : 'Choice C' }));
}

describe('exam chrome', () => {
  it('title bar, tool bar and bottom navigation; only "Question i of n" (no ids, topic or research status)', async () => {
    setClock(new FakeClock(T0));
    makeActiveExam(fx(), ids5, { minutes: 30 });
    renderApp(fx(), '#/exam/run');
    expect(await screen.findByRole('heading', { name: EXAM_NAME })).toBeInTheDocument();
    expect(screen.getByTestId('question-counter')).toHaveTextContent('Question 1 of 5');
    expect(screen.getByRole('timer')).toHaveTextContent('00:30:00');
    expect(screen.getByText(/Time remaining/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Flag for review/ })).toBeInTheDocument();
    expect(screen.getByLabelText(/Color scheme/)).toBeInTheDocument();
    for (const n of ['Help', 'End exam', 'Review screen', 'Previous', 'Next']) expect(screen.getByRole('button', { name: n })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(body()).not.toMatch(/\bQ\d{3}\b/);
    expect(body()).not.toMatch(/Topic 1|verified|pending|disputed|Source key/i);
    // no site navigation inside an exam
    expect(screen.queryByRole('navigation', { name: 'Main' })).toBeNull();
  });

  it('a custom exam is labelled "Practice configuration"; the standard kind is not', async () => {
    setClock(new FakeClock(T0));
    makeActiveExam(pending(), ['Q001', 'Q004'], { kind: 'custom' });
    renderApp(pending(), '#/exam/run');
    expect(await screen.findByText('Practice configuration')).toBeInTheDocument();
  });

  it('the timer counts down from the stored deadline', async () => {
    const clock = new FakeClock(T0);
    setClock(clock);
    makeActiveExam(pending(), ['Q001', 'Q004'], { minutes: 30 });
    clock.advance(5 * MIN + 1000);
    renderApp(pending(), '#/exam/run');
    await waitFor(() => expect(screen.getByRole('timer')).toHaveTextContent('00:24:59'));
  });

  it('Alt+N / Alt+P / Alt+F / Alt+R shortcuts', async () => {
    const user = userEvent.setup();
    setClock(new FakeClock(T0));
    makeActiveExam(pending(), ['Q001', 'Q004', 'Q006'], {});
    renderApp(pending(), '#/exam/run');
    await screen.findByTestId('question-counter');
    await user.keyboard('{Alt>}n{/Alt}');
    expect(screen.getByTestId('question-counter')).toHaveTextContent('Question 2 of 3');
    await user.keyboard('{Alt>}f{/Alt}');
    expect(screen.getByRole('button', { name: /Flag for review/ })).toHaveAttribute('aria-pressed', 'true');
    await user.keyboard('{Alt>}p{/Alt}');
    expect(screen.getByTestId('question-counter')).toHaveTextContent('Question 1 of 3');
    await user.keyboard('{Alt>}r{/Alt}');
    expect(await screen.findByRole('heading', { name: 'Review screen' })).toBeInTheDocument();
  });
});

describe('exam flow: answer, flag, review, end, results, per-question review', () => {
  it('runs a five-question exam (MC, MR, ordering, matching, policy-image MC) end to end', async () => {
    const user = userEvent.setup();
    setClock(new FakeClock(T0));
    const data = fx();
    makeActiveExam(data, ids5, { minutes: 30 });
    renderApp(data, '#/exam/run');
    await screen.findByTestId('question-counter');

    await answerAll(user);
    // navigation never graded anything
    expect(body()).not.toMatch(/Correct|Incorrect|Raw score/);
    // Q004 shows four image choices
    expect(document.querySelectorAll('[data-choice-id] img')).toHaveLength(4);

    // flag / unflag
    const flag = screen.getByRole('button', { name: /Flag for review/ });
    await user.click(flag);
    expect(flag).toHaveAttribute('aria-pressed', 'true');
    await user.click(flag);
    expect(flag).toHaveAttribute('aria-pressed', 'false');
    await user.click(flag);

    // review screen
    await user.click(screen.getByRole('button', { name: 'Review screen' }));
    expect(await screen.findByRole('heading', { name: 'Review screen' })).toBeInTheDocument();
    expect(screen.getByText(/Answered:/).textContent).toMatch(/Answered: 5 · Unanswered: 0 · Flagged for review: 1/);
    expect(screen.getByRole('button', { name: 'Question 5, answered, flagged for review' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Flagged (1)' }));
    expect(document.querySelectorAll('.review-cell')).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'All (5)' }));
    // jump to question 3
    await user.click(screen.getByRole('button', { name: /^Question 3, answered/ }));
    await waitFor(() => expect(screen.getByTestId('question-counter')).toHaveTextContent('Question 3 of 5'));
    expect(screen.getByRole('combobox', { name: 'Step 1' })).toHaveValue('Q002:S1'); // answer kept
    // Return to question from the review screen
    await user.click(screen.getByRole('button', { name: 'Review screen' }));
    await user.click(await screen.findByRole('button', { name: 'Return to question' }));
    expect(await screen.findByRole('combobox', { name: 'Step 1' })).toBeInTheDocument();

    // End exam: confirm dialog with counts, can return
    await user.click(screen.getByRole('button', { name: 'End exam' }));
    const dlg = await screen.findByRole('alertdialog', { name: 'End exam?' });
    expect(dlg).toHaveTextContent('0 unanswered question');
    expect(dlg).toHaveTextContent('1 flagged for review');
    await user.click(within(dlg).getByRole('button', { name: 'Return to exam' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(loadSession('test-exam')!.status).toBe('in_progress');
    await user.click(screen.getByRole('button', { name: 'End exam' }));
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'End exam' }));

    // results
    expect(await screen.findByRole('heading', { name: 'Exam results' })).toBeInTheDocument();
    expect(screen.getByTestId('score')).toHaveTextContent('Raw score: 4 / 5 (80.0%)');
    expect(body()).toContain('Raw practice score — not an AWS scaled score; does not predict a pass.');
    expect(body()).toContain('By source key — not guaranteed technically correct (research_version rTEST)');
    expect(body()).toMatch(/correct 4 · incorrect 1 · unanswered 0 · flagged 1 · not scored 0/);
    expect(body()).toContain('Ended by you');
    expect(getActiveSessionId()).toBeNull();
    const s = loadSession('test-exam')!;
    expect(s.status).toBe('submitted');
    expect(s.result?.per_question).toEqual({ Q001: 'correct', Q013: 'correct', Q002: 'correct', Q079: 'correct', Q004: 'incorrect' });

    // per-question review shows explanations only now
    await user.click(screen.getByRole('link', { name: 'Review question by question' }));
    expect(await screen.findByText(/Review: question 1 of 5/)).toBeInTheDocument();
    expect(body()).toContain(MARK.why('Q001'));
    expect(body()).toContain('✓ Matches the source key (scored against the source key)');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByText(/question 2 of 5/);
    await act(async () => {
      window.location.hash = '#/exam/results/test-exam/5';
    });
    await screen.findByText(/question 5 of 5/);
    expect(body()).toContain('✗ Differs from the source key (scored against the source key)');
    expect(body()).toMatch(/Answer:\s*C/);
    expect(body()).toMatch(/You chose:\s*A/);
  });

  it('unanswered gradable questions are incorrect; ungradable (Q008) is shown but excluded from the denominator', async () => {
    const user = userEvent.setup();
    setClock(new FakeClock(T0));
    const data = pending();
    makeActiveExam(data, ['Q001', 'Q008', 'Q004'], { includeUngradable: true });
    renderApp(data, '#/exam/run');
    await user.click(await screen.findByRole('radio', { name: 'Choice C' })); // Q001 right
    await user.click(screen.getByRole('button', { name: 'End exam' }));
    const dlg = await screen.findByRole('alertdialog');
    expect(dlg).toHaveTextContent('2 unanswered'); // Q008 and Q004
    await user.click(within(dlg).getByRole('button', { name: 'End exam' }));
    expect(await screen.findByTestId('score')).toHaveTextContent('Raw score: 1 / 2 (50.0%)');
    expect(body()).toMatch(/Not scored \(1\)/);
    expect(body()).toMatch(/not counted as wrong/);
    expect(body()).toMatch(/unanswered 1/);
    expect(body()).toMatch(/not scored 1/);
  });

  it('the End-exam dialog also reports incomplete ordering answers and closes with Escape', async () => {
    const user = userEvent.setup();
    setClock(new FakeClock(T0));
    makeActiveExam(pending(), ['Q002', 'Q004'], {});
    renderApp(pending(), '#/exam/run');
    await user.selectOptions(await screen.findByRole('combobox', { name: 'Step 1' }), 'Q002:S1');
    await user.click(screen.getByRole('button', { name: 'End exam' }));
    const dlg = await screen.findByRole('alertdialog');
    expect(dlg).toHaveTextContent('1 unanswered');
    expect(dlg).toHaveTextContent('1 incomplete ordering/matching');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.getByRole('button', { name: 'End exam' })).toHaveFocus(); // focus restored to the opener
  });
});

describe('leak tests: nothing about answers/research before submission', () => {
  const LEAK_WORDS = ['Source key', 'Researched answer', 'Research details', 'Giải thích', 'Vì sao đúng', 'Mẹo nhớ', 'Nguồn AWS', 'Keyword', 'Grading basis', 'Research pending', 'Research conclusion'];
  const expectNoLeak = (where: string) => {
    const t = body();
    expect(t, `${where}: fixture text leaked`).not.toContain('FIXTURE_');
    for (const w of LEAK_WORDS) expect(t, `${where}: "${w}"`).not.toContain(w);
    expect(document.querySelector('[data-answer-image], .answer-image, [data-feedback], .verdict'), where).toBeNull();
    for (const img of Array.from(document.querySelectorAll('img'))) {
      expect(img.getAttribute('src'), where).not.toMatch(/Q(002|005|008|073|079|081|082)_image_02|_image_02\.png/);
    }
    expect(t, `${where}: question id visible`).not.toMatch(/\bQ\d{3}\b/);
  };

  it('question, review screen, every dialog and the zoom viewer stay clean; other routes are locked', async () => {
    const user = userEvent.setup();
    setClock(new FakeClock(T0));
    const data = fx(); // has verified / disputed research with explanations for all of these
    makeActiveExam(data, ['Q001', 'Q003', 'Q013', 'Q002', 'Q079'], {});
    renderApp(data, '#/exam/run');
    await screen.findByTestId('question-counter');
    expectNoLeak('question 1');
    await user.click(screen.getByRole('radio', { name: 'Choice C' }));
    expectNoLeak('question 1 answered');

    await user.click(screen.getAllByRole('button', { name: 'Zoom image' })[0]);
    expectNoLeak('zoom viewer');
    await user.keyboard('{Escape}');

    await user.click(screen.getByRole('button', { name: 'Help' }));
    expectNoLeak('help dialog');
    await user.click(screen.getByRole('button', { name: 'Close' }));

    await user.click(screen.getByRole('button', { name: 'Review screen' }));
    await screen.findByRole('heading', { name: 'Review screen' });
    expectNoLeak('review screen');
    await user.click(screen.getAllByRole('button', { name: 'End exam' })[0]);
    expectNoLeak('end dialog');
    await user.click(screen.getByRole('button', { name: 'Return to exam' }));

    // every question of the exam
    await user.click(screen.getByRole('button', { name: 'Return to question' }));
    for (let i = 0; i < 4; i++) {
      await user.click(screen.getByRole('button', { name: 'Next' }));
      expectNoLeak(`question ${i + 2}`);
    }

    // direct URLs to other areas show "Exam in progress" and nothing else
    for (const hash of ['#/bank', '#/bank/Q001', '#/coverage', '#/coverage/Q001', '#/study', '#/study/run', '#/practice', '#/practice/Q001', '#/history', '#/tips', '#/data', '#/settings', '#/', '#/exam', '#/exam/custom', '#/exam/results/test-exam']) {
      await act(async () => {
        window.location.hash = hash;
      });
      expect(await screen.findByRole('heading', { name: 'Exam in progress' }), hash).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Return to exam' })).toBeInTheDocument();
      expect(document.body.textContent, hash).not.toContain('FIXTURE_');
      expect(document.querySelector('[data-block-id]'), hash).toBeNull();
      expect(screen.queryByRole('navigation', { name: 'Main' }), hash).toBeNull();
    }
    await user.click(screen.getByRole('button', { name: 'Return to exam' }));
    expect(await screen.findByTestId('question-counter')).toBeInTheDocument();
  });

  it('after submission the explanation and research become visible in the per-question review', async () => {
    const user = userEvent.setup();
    setClock(new FakeClock(T0));
    const data = fx();
    makeActiveExam(data, ['Q001', 'Q003'], {});
    renderApp(data, '#/exam/run');
    await screen.findByTestId('question-counter');
    expectNoLeak('before submit');
    await user.click(screen.getByRole('button', { name: 'End exam' }));
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'End exam' }));
    await screen.findByRole('heading', { name: 'Exam results' });
    await act(async () => {
      window.location.hash = '#/exam/results/test-exam/2';
    });
    await screen.findByText(/question 2 of 2/);
    expect(body()).toContain(MARK.why('Q003'));
    expect(body()).toMatch(/Source key:\s*B\s*\(differs — see research\)|Answer:/);
  });
});

describe('timer, restore, expiry, two tabs', () => {
  it('refresh mid-exam restores the answers, the current question, flags and the remaining time', async () => {
    const user = userEvent.setup();
    const clock = new FakeClock(T0);
    setClock(clock);
    const data = pending();
    makeActiveExam(data, ['Q001', 'Q004', 'Q006'], { minutes: 30 });
    const first = renderApp(data, '#/exam/run');
    await user.click(await screen.findByRole('radio', { name: 'Choice B' }));
    await user.click(screen.getByRole('button', { name: /Flag for review/ }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(screen.getByTestId('question-counter')).toHaveTextContent('Question 3 of 3'));
    first.unmount(); // "close the tab"
    clock.advance(7 * MIN + 1000); // 7 minutes pass while the app is closed
    renderApp(data, '#/exam/run'); // "reopen"
    await waitFor(() => expect(screen.getByTestId('question-counter')).toHaveTextContent('Question 3 of 3'));
    expect(screen.getByRole('timer')).toHaveTextContent('00:22:59');
    await user.click(screen.getByRole('button', { name: 'Previous' }));
    await user.click(screen.getByRole('button', { name: 'Previous' }));
    expect(await screen.findByRole('radio', { name: 'Choice B' })).toBeChecked();
    expect(screen.getByRole('button', { name: /Flag for review/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('timeout while open: auto-submits exactly once and shows the results', async () => {
    const clock = new FakeClock(T0);
    setClock(clock);
    const data = pending();
    makeActiveExam(data, ['Q001', 'Q004'], { minutes: 1 });
    renderApp(data, '#/exam/run');
    await screen.findByTestId('question-counter');
    await act(async () => {
      clock.advance(61_000);
    });
    await screen.findByRole('heading', { name: 'Exam results' }, { timeout: 4000 });
    const s = loadSession('test-exam')!;
    expect(s.status).toBe('submitted');
    expect(s.submit_reason).toBe('timeout');
    expect(s.submitted_at).toBe(T0 + MIN); // graded at the deadline, not later
    expect(body()).toContain('Time ran out: the exam was submitted automatically');
    const stamp = s.updated_at;
    await new Promise((r) => setTimeout(r, 1500)); // more ticks: nothing else may change
    expect(loadSession('test-exam')!.updated_at).toBe(stamp);
    expect(listSessions()).toHaveLength(1);
  });

  it('an exam that expired while the app was closed is graded once on load and locked', async () => {
    const clock = new FakeClock(T0);
    setClock(clock);
    const data = pending();
    makeActiveExam(data, ['Q001', 'Q004'], { minutes: 10 });
    clock.advance(3 * 60 * MIN); // three hours later
    renderApp(data, '#/');
    await screen.findByRole('heading', { name: 'Exam results' }, { timeout: 4000 });
    const s = loadSession('test-exam')!;
    expect(s.status).toBe('submitted');
    expect(s.submit_reason).toBe('expired_on_load');
    expect(body()).toContain('Time ran out while the app was closed');
    expect(getActiveSessionId()).toBeNull();
    // locked: visiting the exam run route again does not reopen it
    await act(async () => {
      window.location.hash = '#/exam/run';
    });
    await waitFor(() => expect(screen.queryByTestId('question-counter')).toBeNull());
  });

  it('submission is idempotent and a second tab submitting ends the exam here too', async () => {
    const user = userEvent.setup();
    setClock(new FakeClock(T0));
    const data = pending();
    makeActiveExam(data, ['Q001', 'Q004'], {});
    renderApp(data, '#/exam/run');
    await user.click(await screen.findByRole('radio', { name: 'Choice C' }));
    // "another tab" ends the exam
    let a;
    await act(async () => {
      a = submitActive('user');
    });
    const b = submitActive('timeout'); // second submit: no-op
    expect(b).toBeNull(); // no active exam any more
    expect(loadSession('test-exam')).toEqual(a);
    expect(loadSession('test-exam')!.submit_reason).toBe('user');
    await screen.findByRole('heading', { name: 'Exam results' });
    expect(screen.getByTestId('score')).toHaveTextContent('1 / 2');
  });

  it('custom exam with pause: the question is hidden and the timer frozen while paused', async () => {
    const user = userEvent.setup();
    const clock = new FakeClock(T0);
    setClock(clock);
    const data = pending();
    makeActiveExam(data, ['Q001', 'Q004'], { minutes: 30, allowPause: true });
    renderApp(data, '#/exam/run');
    expect(await screen.findByText('Practice configuration — pause enabled')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Pause timer' }));
    expect(await screen.findByRole('heading', { name: 'Exam paused' })).toBeInTheDocument();
    expect(document.querySelector('[data-block-id]')).toBeNull(); // no reading the question while paused
    clock.advance(20 * MIN);
    await new Promise((r) => setTimeout(r, 1100));
    expect(screen.getByRole('timer')).toHaveTextContent('00:30:00');
    await user.click(screen.getByRole('button', { name: 'Resume timer' }));
    expect(await screen.findByRole('radio', { name: 'Choice A' })).toBeInTheDocument();
    expect(loadSession('test-exam')!.deadline).toBe(T0 + 50 * MIN);
  });

  it('spoken timer warnings at 15 and 5 minutes (aria-live)', async () => {
    const clock = new FakeClock(T0);
    setClock(clock);
    makeActiveExam(pending(), ['Q001', 'Q004'], { minutes: 20 });
    renderApp(pending(), '#/exam/run');
    await screen.findByTestId('question-counter');
    expect(screen.getByTestId('timer-announcement')).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByTestId('timer-announcement')).toHaveTextContent('');
    await act(async () => {
      clock.advance(5 * MIN + 1000);
    });
    await waitFor(() => expect(screen.getByTestId('timer-announcement')).toHaveTextContent('15 minutes remaining.'), { timeout: 3000 });
    await act(async () => {
      clock.advance(10 * MIN);
    });
    await waitFor(() => expect(screen.getByTestId('timer-announcement')).toHaveTextContent('5 minutes remaining.'), { timeout: 3000 });
  });
});

describe('exam start screens', () => {
  it('default basis is "By research"; with nothing verified the pool is 0 and the user must choose explicitly', async () => {
    const user = userEvent.setup();
    const data = pending();
    renderApp(data, '#/exam');
    expect(await screen.findByRole('heading', { name: /Exam simulation — 65 questions \/ 170 minutes/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /^By research/ })).toBeChecked();
    expect(body()).toContain('Eligible questions: 0 of 143');
    expect(body()).toContain('Eligible questions: 142 of 143');
    expect(body()).toMatch(/Only 0 questions can be graded by research right now/);
    expect(screen.queryByRole('button', { name: /Take a shorter exam/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Start exam/ })).toBeNull();
    await user.click(screen.getByRole('button', { name: /Switch to By source key — not guaranteed technically correct/ }));
    expect(screen.getByRole('radio', { name: /By source key — not guaranteed technically correct/ })).toBeChecked();
    await user.clear(screen.getByLabelText(/^Seed/));
    await user.type(screen.getByLabelText(/^Seed/), 'fixed-seed');
    await user.click(screen.getByRole('button', { name: 'Start exam (65 questions, 170 minutes)' }));
    const s = await waitFor(() => {
      const x = listSessions()[0];
      expect(x).toBeTruthy();
      return x;
    });
    expect(s.kind).toBe('standard');
    expect(s.basis).toBe('source');
    expect(s.question_ids).toHaveLength(65);
    expect(new Set(s.question_ids).size).toBe(65);
    expect(s.question_ids).not.toContain('Q008'); // ungradable is excluded from the default draw
    expect(s.duration_ms).toBe(170 * MIN);
    expect(s.research_version).toBe('r1');
    expect(s.allow_pause).toBe(false);
    expect(s.seed).toBe('fixed-seed');
    expect(await screen.findByTestId('question-counter')).toHaveTextContent('Question 1 of 65');
    expect(screen.queryByRole('button', { name: 'Pause timer' })).toBeNull(); // no pause in the simulation
  });

  it('with only a few verified questions it offers a shorter exam or an explicit switch; never mixes bases', async () => {
    const user = userEvent.setup();
    const data = fx(); // 4 verified & gradable by research
    renderApp(data, '#/exam');
    await screen.findByText(/Only 4 questions can be graded by research right now/);
    const short = screen.getByRole('button', { name: 'Take a shorter exam (4 questions)' });
    expect(screen.getByText(/4 questions in 11 minutes/)).toBeInTheDocument();
    await user.click(short);
    const s = await waitFor(() => {
      const x = listSessions()[0];
      expect(x).toBeTruthy();
      return x;
    });
    expect(s.kind).toBe('shorter');
    expect(s.basis).toBe('research');
    expect([...s.question_ids].sort()).toEqual(['Q001', 'Q002', 'Q003', 'Q079']);
    expect(s.duration_ms).toBe(11 * MIN);
    expect(s.research_version).toBe('rTEST');
    expect(s.ungradable_ids).toEqual([]);
    // researched key for Q003 (differs from source) is what the snapshot holds
    expect(s.keys.Q003).toEqual({ type: 'multiple_choice', answer: ['Q003:A'] });
    expect(await screen.findByText('Practice configuration')).toBeInTheDocument();
  });

  it('the same seed gives the same questions', async () => {
    const user = userEvent.setup();
    const data = pending();
    const draw = async () => {
      const r = renderApp(data, '#/exam');
      await user.click(await screen.findByRole('radio', { name: /^By source key/ }));
      await user.clear(screen.getByLabelText(/^Seed/));
      await user.type(screen.getByLabelText(/^Seed/), 'same');
      await user.click(screen.getByRole('button', { name: /Start exam/ }));
      const s = await waitFor(() => {
        const x = listSessions().at(-1);
        expect(x).toBeTruthy();
        return x!;
      });
      r.unmount();
      await act(async () => {
        submitActive('user');
      });
      return s.question_ids;
    };
    const a = await draw();
    const b = await draw();
    expect(a).toEqual(b);
  });

  it('custom exam lists exactly which IDs will not be scored and excludes them from the denominator', async () => {
    const user = userEvent.setup();
    const data = pending();
    renderApp(data, '#/exam/custom');
    expect(await screen.findByText('Practice configuration')).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: /^By source key/ }));
    await user.click(screen.getByRole('checkbox', { name: /Include not-scorable questions/ }));
    await user.clear(screen.getByLabelText(/Number of questions/));
    await user.type(screen.getByLabelText(/Number of questions/), '143');
    expect(body()).toMatch(/These 1 question will be shown but not scored and are excluded from the\s*denominator: Q008\./);
    expect(body()).toContain('142 of 143 questions will be scored');
    expect(body()).toContain('Practice configuration — pause enabled');
    await user.click(screen.getByRole('checkbox', { name: /Allow pausing the timer/ }));
    await user.click(screen.getByRole('button', { name: 'Start custom exam' }));
    const s = await waitFor(() => {
      const x = listSessions()[0];
      expect(x).toBeTruthy();
      return x;
    });
    expect(s.kind).toBe('custom');
    expect(s.include_ungradable).toBe(true);
    expect(s.allow_pause).toBe(true);
    expect(s.question_ids).toHaveLength(143);
    expect(s.ungradable_ids).toEqual(['Q008']);
  });

  it('custom exam on the research basis with no verified answers warns that nothing can be scored', async () => {
    const user = userEvent.setup();
    renderApp(pending(), '#/exam/custom');
    await user.click(await screen.findByRole('checkbox', { name: /Include not-scorable questions/ }));
    expect(body()).toMatch(/0 of 20 questions will be scored/);
    expect(body()).toMatch(/Nothing in this draw can be scored by research yet/);
  });

  it('custom exam validates the number of questions', async () => {
    const user = userEvent.setup();
    renderApp(pending(), '#/exam/custom');
    await user.click(await screen.findByRole('radio', { name: /^By source key/ }));
    await user.clear(screen.getByLabelText(/Number of questions/));
    await user.type(screen.getByLabelText(/Number of questions/), '500');
    expect(screen.getByRole('button', { name: 'Start custom exam' })).toBeDisabled();
    expect(screen.getAllByRole('alert')[0]).toHaveTextContent(/between 1 and 142/);
  });
});
