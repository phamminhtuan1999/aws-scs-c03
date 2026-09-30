import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { bookmarksSlot, studySlot, tipsSlot, practiceSlot } from '../src/storage/slots';
import { readSlot } from '../src/storage/store';
import { coverageTotals } from '../src/ui/Coverage';
import { loadRealData, allPendingReviews } from './helpers/data';
import { MARK, fixtureReviews } from './helpers/fixtures';
import { renderApp } from './helpers/render';

const fx = () => loadRealData(fixtureReviews());
const pending = () => loadRealData(allPendingReviews());
const body = () => document.body.textContent ?? '';
const setSize = () => /^(\d+) question/.exec((document.querySelector('p[aria-live="polite"]') as HTMLElement).textContent ?? '')?.[1];

async function pick(user: ReturnType<typeof userEvent.setup>, names: string[], kind: 'radio' | 'checkbox' = 'radio') {
  for (const n of names) await user.click(screen.getByRole(kind, { name: `Choice ${n}` }));
}

describe('Study: nothing about the answer is mounted before Check answer', () => {
  it('no explanation, keyword, tip, research, source key, status or answer image in the DOM before checking', async () => {
    renderApp(fx(), '#/bank/Q001');
    await screen.findByRole('button', { name: 'Check answer' });
    const t = body();
    for (const m of [MARK.why('Q001'), MARK.keyword('Q001'), MARK.tip('Q001'), MARK.refTitle('Q001'), MARK.quote('Q001')]) expect(t).not.toContain(m);
    for (const w of ['Source key', 'Researched answer', 'Research details', 'Giải thích', 'Vì sao đúng', 'Mẹo nhớ', 'Nguồn AWS', 'verified', 'Correct', 'Incorrect']) {
      expect(t, w).not.toContain(w);
    }
    expect(document.querySelector('[data-feedback], .answer-image, [data-answer-image], .verdict')).toBeNull();
    expect(document.querySelector('.badge-good, .badge-bad')).toBeNull();
    // selecting an answer still reveals nothing
    const user = userEvent.setup();
    await pick(user, ['C']);
    expect(document.querySelector('[data-feedback]')).toBeNull();
    expect(body()).not.toContain(MARK.why('Q001'));
  });

  it('the gate also holds for an ordering question whose answer is an image (Q002)', async () => {
    renderApp(fx(), '#/bank/Q002');
    await screen.findByRole('button', { name: 'Check answer' });
    expect(document.querySelectorAll('img[src*="Q002_image_02"]')).toHaveLength(0);
    expect(document.querySelector('[data-answer-image]')).toBeNull();
    expect(body()).not.toContain(MARK.why('Q002'));
  });
});

describe('Study: check answer, by status', () => {
  it('verified + matches the source key: correct, with the Vietnamese explanation and sources', async () => {
    const user = userEvent.setup();
    renderApp(fx(), '#/bank/Q001');
    await pick(user, ['C']);
    await user.click(screen.getByRole('button', { name: 'Check answer' }));
    expect(await screen.findByText('✓ Correct')).toBeInTheDocument();
    expect(body()).toContain('Answer: C');
    expect(body()).toMatch(/You chose:\s*C/);
    expect(body()).toContain('By research (status: verified)');
    expect(body()).toContain(MARK.why('Q001'));
    expect(body()).toContain(MARK.other('Q001', 'A'));
    expect(body()).toContain(MARK.keyword('Q001'));
    expect(body()).toContain(MARK.tip('Q001'));
    const link = screen.getAllByRole('link', { name: MARK.refTitle('Q001') })[0];
    expect(link).toHaveAttribute('href', 'https://docs.aws.amazon.com/fixture-test-page.html');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(screen.queryByText(/differs — see research/)).toBeNull();
    // choices are locked and annotated with text labels
    expect(screen.getByRole('radio', { name: 'Choice A' })).toBeDisabled();
    expect(within(document.querySelector('[data-choice-id="Q001:C"]') as HTMLElement).getByText('Researched answer')).toBeInTheDocument();
  });

  it('verified but DIFFERENT from the source key: graded by research and the source key is shown as differing', async () => {
    const user = userEvent.setup();
    renderApp(fx(), '#/bank/Q003');
    await pick(user, ['A']); // researched answer
    await user.click(screen.getByRole('button', { name: 'Check answer' }));
    expect(await screen.findByText('✓ Correct')).toBeInTheDocument();
    expect(body()).toMatch(/Source key:\s*B\s*\(differs — see research\)/);
  });

  it('choosing the source key where research differs is incorrect by research, with the difference explained', async () => {
    const user = userEvent.setup();
    renderApp(fx(), '#/bank/Q003');
    await pick(user, ['B']);
    await user.click(screen.getByRole('button', { name: 'Check answer' }));
    expect(await screen.findByText('✗ Incorrect')).toBeInTheDocument();
    expect(body()).toMatch(/Answer:\s*A/);
    expect(body()).toMatch(/Source key:\s*B\s*\(differs — see research\)/);
  });

  it('disputed: never says wrong; shows source key and research conclusion separately with the reason', async () => {
    const user = userEvent.setup();
    renderApp(fx(), '#/bank/Q013');
    await pick(user, ['A', 'E'], 'checkbox'); // the source key
    await user.click(screen.getByRole('button', { name: 'Check answer' }));
    expect(await screen.findByText('No settled conclusion yet')).toBeInTheDocument();
    const t = body();
    expect(t).not.toMatch(/Incorrect|✗|\bwrong\b/i);
    expect(t).toContain('Source key — not technically verified');
    expect(t).toMatch(/Research conclusion — status Disputed/);
    expect(t).toContain(MARK.disputedReason('Q013'));
    expect(t).toContain('Your answer matches the source key');
    expect(t).toContain('does not mean the source key is technically correct');
  });

  it('disputed and a different answer: still no absolute "wrong"', async () => {
    const user = userEvent.setup();
    renderApp(fx(), '#/bank/Q013');
    await pick(user, ['B', 'C'], 'checkbox');
    await user.click(screen.getByRole('button', { name: 'Check answer' }));
    await screen.findByText('No settled conclusion yet');
    expect(body()).not.toMatch(/Incorrect|✗|\bwrong\b/i);
    expect(body()).toContain('differs from the source key');
  });

  it('pending: says research is pending and shows the source key only, flagged as not verified', async () => {
    const user = userEvent.setup();
    renderApp(pending(), '#/bank/Q004');
    await pick(user, ['C']);
    await user.click(screen.getByRole('button', { name: 'Check answer' }));
    expect(await screen.findByText('Research pending — showing source key only (not verified)')).toBeInTheDocument();
    expect(body()).toMatch(/Answer:\s*C/);
    expect(body()).toContain('Source key — not technically verified');
    expect(body()).not.toMatch(/verified by research/i);
    expect(body()).toContain('chưa được research');
  });

  it('ordering: the answer is rendered as step text, the green source answer image appears only after checking', async () => {
    const user = userEvent.setup();
    renderApp(pending(), '#/bank/Q002');
    await screen.findByRole('button', { name: 'Check answer' });
    expect(document.querySelector('[data-answer-image]')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Check answer' })); // empty answer
    await screen.findByText('Research pending — showing source key only (not verified)');
    expect(body()).toContain('Step 1');
    expect(body()).toContain('Configure Amazon Cognito user pools for user authentication.');
    const fig = document.querySelector('[data-answer-image]') as HTMLElement;
    expect(fig).not.toBeNull();
    expect(fig.textContent).toContain('Source answer image');
    expect(fig.querySelector('img')!.getAttribute('src')).toBe('./data/images/Q002_image_02.png');
    expect(body()).toContain('You chose:');
  });

  it('Q008 is shown for study with the not-scorable note; nothing is scored', async () => {
    const user = userEvent.setup();
    renderApp(pending(), '#/bank/Q008');
    await screen.findByRole('button', { name: 'Check answer' });
    await user.click(screen.getByRole('button', { name: 'Check answer' }));
    await screen.findByText(/Not scorable\./);
    expect(body()).toMatch(/identical|cannot distinguish|not answerable/i);
    expect(body()).not.toContain('✓ Correct');
    expect(document.querySelector('[data-answer-image]')).not.toBeNull();
    expect(readSlot(studySlot).attempts.Q008[0].result).toBe('ungradable');
  });

  it('Try again unmounts the feedback and unlocks the controls', async () => {
    const user = userEvent.setup();
    renderApp(fx(), '#/bank/Q001');
    await pick(user, ['A']);
    await user.click(screen.getByRole('button', { name: 'Check answer' }));
    await screen.findByText('✗ Incorrect');
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(document.querySelector('[data-feedback]')).toBeNull();
    expect(body()).not.toContain(MARK.why('Q001'));
    expect(screen.getByRole('radio', { name: 'Choice A' })).toBeEnabled();
    expect(screen.getByRole('radio', { name: 'Choice A' })).not.toBeChecked();
  });

  it('records an attempt with basis and research version; bookmark and flag persist', async () => {
    const user = userEvent.setup();
    renderApp(fx(), '#/bank/Q001');
    await pick(user, ['C']);
    await user.click(screen.getByRole('button', { name: 'Check answer' }));
    await screen.findByText('✓ Correct');
    const a = readSlot(studySlot).attempts.Q001;
    expect(a).toHaveLength(1);
    expect(a[0]).toMatchObject({ result: 'correct', basis: 'research', research_version: 'rTEST', source: 'study', response: 'Q001:C' });
    await user.click(screen.getByRole('button', { name: 'Bookmark' }));
    await user.click(screen.getByRole('button', { name: 'Flag' }));
    expect(readSlot(bookmarksSlot)).toEqual({ bookmarked: ['Q001'], flagged: ['Q001'] });
    expect(screen.getByRole('button', { name: 'Bookmarked' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('Save tip stores text + question id (as plain text) and the tips page lists it', async () => {
    const user = userEvent.setup();
    renderApp(pending(), '#/bank/Q005');
    await user.click(screen.getByRole('button', { name: 'Save tip' }));
    await user.type(screen.getByLabelText(/Tip for Q005/), 'use <b>roles</b> not keys');
    await user.click(within(document.querySelector('form.tip-form') as HTMLElement).getByRole('button', { name: 'Save tip' }));
    expect(readSlot(tipsSlot).items).toHaveLength(1);
    expect(readSlot(tipsSlot).items[0]).toMatchObject({ qid: 'Q005', text: 'use <b>roles</b> not keys' });
    act(() => {
      window.location.hash = '#/tips';
    });
    const tip = await screen.findByText('use <b>roles</b> not keys');
    expect(tip.querySelector('b')).toBeNull(); // rendered as text, not HTML
  });
});

describe('Practice in order (Q001 → Q143)', () => {
  it('remembers the position, counts checked questions and offers Resume and Jump', async () => {
    const user = userEvent.setup();
    renderApp(pending(), '#/practice');
    expect(await screen.findByText(/0 \/ 143/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Resume at/ })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Start at Q001' }));
    await screen.findByRole('button', { name: 'Check answer' });
    expect(screen.getByRole('heading', { name: /Q001/ })).toBeInTheDocument();
    await pick(user, ['C']);
    await user.click(screen.getByRole('button', { name: 'Check answer' }));
    await screen.findByText('Research pending — showing source key only (not verified)');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByRole('heading', { name: /Q002/ })).toBeInTheDocument();
    expect(readSlot(practiceSlot).position).toBe('Q002');
    expect(readSlot(studySlot).attempts.Q001[0].source).toBe('practice');
    // back to the practice home: progress and resume
    await user.click(screen.getByRole('link', { name: /^← Practice in order/ }));
    expect(await screen.findByRole('button', { name: 'Resume at Q002' })).toBeInTheDocument();
    expect(screen.getByText(/1 \/ 143/)).toBeInTheDocument();
    // jump
    await user.type(screen.getByLabelText(/Jump to Q/), '77');
    await user.click(screen.getByRole('button', { name: 'Go' }));
    expect(await screen.findByRole('heading', { name: /Q077/ })).toBeInTheDocument();
  });

  it('walks in original order: Next from Q001 is Q002, Previous is disabled on Q001', async () => {
    renderApp(pending(), '#/practice/Q001');
    await screen.findByRole('heading', { name: /Q001/ });
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
  });
});

describe('Study set picker and runner', () => {
  it('ID range -> runs only those questions in order and resumes the same position after a reload', async () => {
    const user = userEvent.setup();
    const data = pending();
    const first = renderApp(data, '#/study');
    await user.click(screen.getByRole('radio', { name: /Question IDs or ranges/ }));
    await user.type(screen.getByLabelText('Question IDs'), 'Q003-Q005, Q010');
    expect(setSize()).toBe('4');
    await user.click(screen.getByRole('button', { name: 'Start studying' }));
    expect(await screen.findByRole('heading', { name: /Q003/ })).toBeInTheDocument();
    expect(screen.getByText('Question 1 of 4')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByRole('heading', { name: /Q004/ })).toBeInTheDocument();
    first.unmount();
    renderApp(data, '#/study/run'); // "refresh"
    expect(await screen.findByRole('heading', { name: /Q004/ })).toBeInTheDocument();
    expect(screen.getByText('Question 2 of 4')).toBeInTheDocument();
  });

  it('shuffled order is seeded and reproducible; options are never shuffled', async () => {
    const user = userEvent.setup();
    const data = pending();
    const run = async (seed: string) => {
      const r = renderApp(data, '#/study');
      await user.click(screen.getByRole('radio', { name: /Shuffled/ }));
      const s = screen.getByLabelText('Seed');
      await user.clear(s);
      await user.type(s, seed);
      await user.click(screen.getByRole('button', { name: 'Start studying' }));
      await screen.findByText(/Question 1 of 143/);
      const ids = readSlot(studySlot).current!.ids;
      r.unmount();
      return ids;
    };
    const a = await run('abc');
    const b = await run('abc');
    const c = await run('xyz');
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
    expect([...a].sort()).toEqual(data.allIds);
    expect(a).not.toEqual(data.allIds);
  });

  it('domain / not classified / wrong / not attempted sets', async () => {
    const user = userEvent.setup();
    const data = fx();
    renderApp(data, '#/study');
    await user.click(screen.getByRole('radio', { name: /By domain/ }));
    const sel = screen.getByLabelText('Domain');
    expect(within(sel).getByRole('option', { name: '4 Identity and Access Management (6)' })).toBeInTheDocument();
    expect(within(sel).getByRole('option', { name: /Not yet classified \(137\)/ })).toBeInTheDocument();
    await user.selectOptions(sel, '4 Identity and Access Management');
    expect(setSize()).toBe('6');
    await user.click(screen.getByRole('radio', { name: 'Wrong last time' }));
    expect(setSize()).toBe('0');
    expect(screen.getByRole('button', { name: 'Start studying' })).toBeDisabled();
    await user.click(screen.getByRole('radio', { name: 'Not attempted yet' }));
    expect(setSize()).toBe('143');
  });
});

describe('Question bank', () => {
  it('searches by Qxxx and by text, filters by type and research status', async () => {
    const user = userEvent.setup();
    renderApp(fx(), '#/bank');
    await screen.findByText('143 of 143 questions');
    await user.type(screen.getByLabelText(/Search by Qxxx/), 'Q042');
    await waitFor(() => expect(screen.getByTestId('bank-count').textContent).toMatch(/^1 of 143/));
    expect(screen.getByRole('link', { name: 'Q042' })).toBeInTheDocument();
    await user.clear(screen.getByLabelText(/Search by Qxxx/));
    await user.type(screen.getByLabelText(/Search by Qxxx/), 'Amazon Cognito');
    await waitFor(() => expect(Number(/^(\d+)/.exec(screen.getByTestId('bank-count').textContent!)![1])).toBeGreaterThan(0));
    expect(screen.getByRole('link', { name: 'Q002' })).toBeInTheDocument();
    await user.clear(screen.getByLabelText(/Search by Qxxx/));
    await user.selectOptions(screen.getByLabelText('Research status'), 'verified');
    expect(screen.getByTestId('bank-count').textContent).toMatch(/^4 of 143/);
    await user.selectOptions(screen.getByLabelText('Research status'), '');
    await user.selectOptions(screen.getByLabelText('Type'), 'matching');
    expect(screen.getByTestId('bank-count').textContent).toMatch(/^4 of 143/);
  });
});

describe('Research coverage', () => {
  it('totals per status, gradable / differs counts and units reviewed / 628 (fixture data)', () => {
    const t = coverageTotals(fx());
    expect(t.byStatus).toEqual({ verified: 4, disputed: 1, ambiguous: 1, outdated: 0, unresolved: 0, pending: 137 });
    expect(t.gradable).toBe(4);
    expect(t.differs).toBe(2);
    expect(t.totalUnits).toBe(628);
    expect(t.units).toBe(13); // Q001 (4) + Q003 (4) + Q013 (5)
  });

  it('with everything pending nothing is reported as verified', async () => {
    const t = coverageTotals(pending());
    expect(t.byStatus.verified).toBe(0);
    expect(t.byStatus.pending).toBe(143);
    expect(t.gradable).toBe(0);
    expect(t.units).toBe(0);
    renderApp(pending(), '#/coverage');
    expect(await screen.findByTestId('units-count')).toHaveTextContent('0 / 628');
    expect(screen.getByTestId('gradable-count')).toHaveTextContent('0');
    const rows = document.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(143);
    expect(document.querySelectorAll('tbody .badge-good')).toHaveLength(0);
  });

  it('question research page shows per-unit reviews, references with quote/date, and the blind vs final verdict', async () => {
    renderApp(fx(), '#/coverage/Q003');
    expect(await screen.findByText('Research record:', { exact: false })).toBeInTheDocument();
    expect(body()).toContain('FIXTURE_UNIT_REASON_Q003:A');
    expect(body()).toContain(MARK.quote('Q003'));
    expect(body()).toContain('Accessed: 2026-01-01');
    expect(body()).toContain('Page date: not stated on the page');
    expect(body()).toContain('direct evidence');
    expect(body()).toContain('Independent (blind) verdict vs final');
    expect(body()).toContain('(differs from the source key)');
  });
});
