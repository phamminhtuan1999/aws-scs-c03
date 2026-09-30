import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import type { Response } from '../src/grading/engine';
import { QuestionView } from '../src/ui/question/QuestionView';
import { loadRealData, allPendingReviews } from './helpers/data';
import { renderWithData } from './helpers/render';

const data = loadRealData(allPendingReviews());

function Harness({ qid, onResp }: { qid: string; onResp?: (r: Response) => void }) {
  const q = data.byId.get(qid)!;
  const [r, setR] = useState<Response>(q.type === 'multiple_response' ? [] : q.type === 'matching' ? {} : q.type === 'ordering' ? [] : null);
  return (
    <QuestionView
      data={data}
      qid={qid}
      response={r}
      onChange={(v) => {
        setR(v);
        onResp?.(v);
      }}
    />
  );
}

describe('multiple choice (radio)', () => {
  it('selects one choice at a time, can change, and can clear', async () => {
    const user = userEvent.setup();
    let last: Response = null;
    renderWithData(<Harness qid="Q001" onResp={(v) => (last = v)} />, data);
    const a = screen.getByRole('radio', { name: 'Choice A' });
    const c = screen.getByRole('radio', { name: 'Choice C' });
    await user.click(a);
    expect(last).toBe('Q001:A');
    await user.click(c);
    expect(last).toBe('Q001:C');
    expect(a).not.toBeChecked();
    expect(c).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Clear answer' }));
    expect(last).toBeNull();
    expect(c).not.toBeChecked();
  });

  it('clicking anywhere in the row (not only the radio) selects it', async () => {
    const user = userEvent.setup();
    renderWithData(<Harness qid="Q001" />, data);
    const row = document.querySelector('[data-choice-id="Q001:B"]') as HTMLElement;
    await user.click(row.querySelector('.choice-body')!);
    expect(screen.getByRole('radio', { name: 'Choice B' })).toBeChecked();
  });
});

describe('multiple response (checkbox)', () => {
  it('shows the source "(Choose two.)" text unchanged, counts selections, does not block extra ones', async () => {
    const user = userEvent.setup();
    let last: Response = [];
    renderWithData(<Harness qid="Q013" onResp={(v) => (last = v)} />, data);
    expect(document.body.textContent).toMatch(/Choose TWO|Choose two/i);
    expect(screen.getByText('0 selected')).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: 'Choice A' }));
    await user.click(screen.getByRole('checkbox', { name: 'Choice E' }));
    await user.click(screen.getByRole('checkbox', { name: 'Choice C' })); // a third one is allowed
    expect(screen.getByText('3 selected')).toBeInTheDocument();
    expect(last).toEqual(['Q013:A', 'Q013:C', 'Q013:E']); // always in source choice order
    await user.click(screen.getByRole('checkbox', { name: 'Choice C' }));
    expect(last).toEqual(['Q013:A', 'Q013:E']);
  });
});

describe('ordering control: one drop-down per step', () => {
  it('renders exactly `slots` selects with every step in source order and "Select…" first', () => {
    renderWithData(<Harness qid="Q002" />, data);
    const selects = screen.getAllByRole('combobox');
    expect(selects).toHaveLength(3);
    const opts = within(selects[0]).getAllByRole('option').map((o) => o.textContent);
    expect(opts[0]).toBe('Select…');
    expect(opts).toHaveLength(1 + 6);
    expect(opts[1]).toBe('Configure Amazon Cognito user pools for user authentication.');
  });

  it('disables a step already used in another slot (reuse:false) and shows why', async () => {
    const user = userEvent.setup();
    renderWithData(<Harness qid="Q002" />, data);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Step 1' }), 'Q002:S1');
    const step2 = screen.getByRole('combobox', { name: 'Step 2' });
    const used = within(step2).getByRole('option', { name: /Configure Amazon Cognito user pools.*\(used in step 1\)/ });
    expect(used).toBeDisabled();
    // but it stays selectable in its own slot
    expect(within(screen.getByRole('combobox', { name: 'Step 1' })).getByRole('option', { name: 'Configure Amazon Cognito user pools for user authentication.' })).not.toBeDisabled();
  });

  it('swap up/down and Clear work and are real buttons (keyboard operable)', async () => {
    const user = userEvent.setup();
    let last: Response = [];
    renderWithData(<Harness qid="Q002" onResp={(v) => (last = v)} />, data);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Step 1' }), 'Q002:S1');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Step 2' }), 'Q002:S5');
    expect(last).toEqual(['Q002:S1', 'Q002:S5', null]);
    const up2 = screen.getByRole('button', { name: 'Move step 2 up' });
    expect(screen.getByRole('button', { name: 'Move step 1 up' })).toBeDisabled();
    up2.focus();
    await user.keyboard('{Enter}');
    expect(last).toEqual(['Q002:S5', 'Q002:S1', null]);
    await user.click(screen.getByRole('button', { name: 'Move step 2 down' }));
    expect(last).toEqual(['Q002:S5', null, 'Q002:S1']);
    screen.getByRole('button', { name: 'Clear step 1' }).focus();
    await user.keyboard(' ');
    expect(last).toEqual([null, null, 'Q002:S1']);
    // an empty slot cannot be moved
    expect(screen.getByRole('button', { name: 'Move step 2 up' })).toBeDisabled();
  });

  it('has a "View original image" button and the tool-label note', () => {
    renderWithData(<Harness qid="Q002" />, data);
    expect(screen.getByRole('button', { name: 'View original image' })).toBeInTheDocument();
    expect(document.body.textContent).toMatch(/labels are added by this practice tool/i);
  });
});

describe('matching control', () => {
  it('one select per prompt; a response chosen in another row is disabled there (reuse:false)', async () => {
    const user = userEvent.setup();
    let last: Response = {};
    renderWithData(<Harness qid="Q079" onResp={(v) => (last = v)} />, data);
    const rows = screen.getAllByRole('combobox');
    expect(rows).toHaveLength(3);
    await user.selectOptions(rows[0], 'Q079:R2');
    expect(last).toEqual({ 'Q079:P1': 'Q079:R2', 'Q079:P2': null, 'Q079:P3': null });
    const opt = within(rows[1]).getByRole('option', { name: /AWS Audit Manager controls.*\(used in row 1\)/ });
    expect(opt).toBeDisabled();
    await user.selectOptions(rows[1], 'Q079:R6');
    await user.selectOptions(rows[2], 'Q079:R1');
    expect(last).toEqual({ 'Q079:P1': 'Q079:R2', 'Q079:P2': 'Q079:R6', 'Q079:P3': 'Q079:R1' });
    // changing row 1 frees its old response
    await user.selectOptions(rows[0], 'Q079:R3');
    expect(within(rows[1]).getByRole('option', { name: 'AWS Audit Manager controls' })).not.toBeDisabled();
  });

  it('Q008 (unscorable) still renders five rows, duplicates included', () => {
    renderWithData(<Harness qid="Q008" />, data);
    expect(screen.getAllByRole('combobox')).toHaveLength(5);
    expect(document.body.textContent).toMatch(/VPC Flow Logs/);
  });
});

describe('images', () => {
  it('click-to-zoom opens a dialog with zoom controls; Esc closes it and focus returns to the image button', async () => {
    const user = userEvent.setup();
    renderWithData(<Harness qid="Q001" />, data);
    const btn = screen.getAllByRole('button', { name: 'Zoom image' })[0];
    btn.focus();
    await user.click(btn);
    const dlg = screen.getByRole('dialog', { name: 'Image viewer' });
    expect(within(dlg).getByRole('button', { name: 'Zoom in' })).toBeInTheDocument();
    expect(within(dlg).getByRole('button', { name: 'Zoom out' })).toBeInTheDocument();
    expect(within(dlg).getByRole('button', { name: 'Reset zoom' })).toBeInTheDocument();
    await user.click(within(dlg).getByRole('button', { name: 'Zoom in' }));
    expect(within(dlg).getByText('150%')).toBeInTheDocument();
    await user.click(within(dlg).getByRole('button', { name: 'Reset zoom' }));
    expect(within(dlg).getByText('100%')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(btn).toHaveFocus();
  });

  it('focus is trapped inside the dialog', async () => {
    const user = userEvent.setup();
    renderWithData(<Harness qid="Q001" />, data);
    await user.click(screen.getAllByRole('button', { name: 'Zoom image' })[0]);
    const dlg = screen.getByRole('dialog');
    for (let i = 0; i < 8; i++) {
      await user.tab();
      expect(dlg.contains(document.activeElement)).toBe(true);
    }
    await user.tab({ shift: true });
    expect(dlg.contains(document.activeElement)).toBe(true);
  });
});
