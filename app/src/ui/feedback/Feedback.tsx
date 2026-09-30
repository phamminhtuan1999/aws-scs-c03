import { describeInline, describeValue, STATUS_LABEL, type AnswerLine } from '../../data/derive';
import type { AppData } from '../../data/loader';
import type { Key, Response } from '../../grading/engine';
import { imageSrc } from '../question/Blocks';
import { useZoom } from '../ZoomDialog';
import { ExplanationPanel } from './ExplanationPanel';
import type { Outcome } from './outcome';
import { ResearchDetails } from './ResearchDetails';

function AnswerLines({ lines }: { lines: AnswerLine[] }) {
  if (!lines.length) return <span className="muted">(none)</span>;
  return (
    <ul className="answer-lines">
      {lines.map((l, i) => (
        <li key={i}>
          <strong>{l.label}</strong> {l.text}
        </li>
      ))}
    </ul>
  );
}

const keyValue = (k: Key | null) => (k ? k.answer : null);

function AnswerImage({ data, qid }: { data: AppData; qid: string }) {
  const zoom = useZoom();
  const file = data.keys[qid]?.answer_image;
  if (!file) return null;
  return (
    <figure className="answer-image" data-answer-image={file}>
      <figcaption>Source answer image</figcaption>
      <button
        type="button"
        className="img-btn"
        aria-label="Zoom source answer image"
        onClick={() => zoom.open({ src: imageSrc(file), alt: 'Source answer image (enlarged)', width: 1200, height: 800 })}
      >
        <img src={imageSrc(file)} alt="Source answer image" />
      </button>
      <p className="muted small">Green borders mark the source key. This image comes from the source material and is not verified.</p>
    </figure>
  );
}

/**
 * Checked-answer feedback: verdict, "Answer | You chose", grading basis, source vs research, answer images,
 * Vietnamese explanation and collapsible research details. Mounted only after Check / submit.
 */
export function Feedback({ data, outcome: o, response }: { data: AppData; outcome: Outcome; response: Response }) {
  const q = data.byId.get(o.qid)!;
  const hs = data.hotspot[o.qid];
  const rv = o.review;
  const verified = o.gradedBasis === 'research';
  const answered = o.result !== 'unanswered_incorrect';
  const shownKey: Key | null = o.gradedKey ?? o.sourceKey;
  const youChose = describeInline(data, o.qid, response);
  const notesCount = (hs?.source_notes.length ?? 0) + rv.source_issues.length;

  let verdict: { text: string; tone: 'good' | 'bad' | 'neutral' };
  if (o.result === 'ungradable') {
    verdict = { text: `Not scorable. ${o.notScorableReason ?? ''}`.trim(), tone: 'neutral' };
  } else if (verified) {
    verdict =
      o.result === 'correct'
        ? { text: '✓ Correct', tone: 'good' }
        : { text: answered ? '✗ Incorrect' : '✗ Not answered', tone: 'bad' };
  } else if (o.mode === 'exam') {
    verdict =
      o.result === 'correct'
        ? { text: '✓ Matches the source key (scored against the source key)', tone: 'good' }
        : { text: answered ? '✗ Differs from the source key (scored against the source key)' : '✗ Not answered', tone: 'bad' };
  } else if (rv.status === 'pending') {
    verdict = { text: 'Research pending — showing source key only (not verified)', tone: 'neutral' };
  } else {
    verdict = { text: 'No settled conclusion yet', tone: 'neutral' };
  }

  const basisLine = verified
    ? o.mode === 'exam'
      ? `By research (research_version ${o.snapshotVersion})`
      : 'By research (status: verified)'
    : o.mode === 'exam'
      ? `By source key — not guaranteed technically correct (research_version ${o.snapshotVersion})`
      : rv.status === 'pending'
        ? 'Research pending — source key shown (not verified)'
        : `No settled conclusion (research status: ${STATUS_LABEL[rv.status]})`;

  const noteSourceMatch =
    !verified && o.mode === 'study' && o.result !== 'ungradable'
      ? o.matchesSource
        ? 'Your answer matches the source key. That does not mean the source key is technically correct.'
        : answered
          ? 'Your answer differs from the source key. The source key itself is not technically verified.'
          : 'You did not answer.'
      : null;

  const researchDiffers = verified ? o.differs && !!o.sourceKey : false;
  const changed =
    o.mode === 'exam' && o.snapshotVersion && o.snapshotVersion !== data.research_version
      ? `Research has been updated since this exam (exam graded with ${o.snapshotVersion}, now ${data.research_version}). Scoring is unchanged; the explanation below uses the current research.`
      : null;

  return (
    <section className="feedback" aria-label="Answer feedback" data-feedback={o.qid}>
      <p className={`verdict verdict-${verdict.tone}`} role="status">
        {verdict.text}
      </p>
      <p className="answer-line">
        {/* Only a verified research answer is presented as "the" answer; otherwise label the key for what it is. */}
        <strong>{verified ? 'Answer:' : 'Source key (not verified):'}</strong>{' '}
        {shownKey ? describeInline(data, o.qid, keyValue(shownKey)) : 'not available'} &nbsp;|&nbsp;{' '}
        <strong>You chose:</strong> {youChose}
      </p>
      <p className="basis-line">
        <strong>Grading basis:</strong> {basisLine}
      </p>
      {!verified && shownKey && <p className="muted small">Source key — not technically verified</p>}
      {q.type !== 'multiple_choice' && q.type !== 'multiple_response' && (
        <div className="answer-compare">
          <div>
            <h4>{verified ? 'Researched answer' : 'Source key (not verified)'}</h4>
            <AnswerLines lines={describeValue(data, o.qid, keyValue(shownKey))} />
          </div>
          <div>
            <h4>You chose</h4>
            <AnswerLines lines={describeValue(data, o.qid, response)} />
          </div>
        </div>
      )}
      {noteSourceMatch && <p>{noteSourceMatch}</p>}
      {changed && <p className="notice-inline">{changed}</p>}

      {researchDiffers && o.sourceKey && (
        <p className="differs">
          <strong>Source key:</strong> {describeInline(data, o.qid, keyValue(o.sourceKey))} (differs — see research)
        </p>
      )}

      {!verified && rv.status !== 'pending' && (
        <div className="split-note">
          <h4>Source key vs research conclusion</h4>
          <p>
            <strong>Source key — not technically verified:</strong> {o.sourceKey ? describeInline(data, o.qid, keyValue(o.sourceKey)) : 'not available'}
            {o.notScorableReason ? ` (${o.notScorableReason})` : ''}
          </p>
          <p>
            <strong>Research conclusion — status {STATUS_LABEL[rv.status]}:</strong>{' '}
            {o.researchKey ? describeInline(data, o.qid, keyValue(o.researchKey)) : 'no answer is supported strongly enough'}
            {rv.confidence ? ` (confidence: ${rv.confidence.level})` : ''}
          </p>
          {rv.confidence?.reason_vi && <p lang="vi">{rv.confidence.reason_vi}</p>}
          {rv.reconciliation_vi && <p lang="vi">{rv.reconciliation_vi}</p>}
        </div>
      )}

      {notesCount > 0 && (
        <div className="source-notes">
          <h4>Notes about the source question</h4>
          <ul>
            {hs?.source_notes.map((n, i) => <li key={`h${i}`}>{n}</li>)}
            {rv.source_issues.map((s, i) => (
              <li key={`r${i}`}>
                {s.type ? `${s.type}: ` : ''}
                {s.detail_vi}
              </li>
            ))}
          </ul>
        </div>
      )}

      <AnswerImage data={data} qid={o.qid} />
      <ExplanationPanel data={data} qid={o.qid} />
      <ResearchDetails data={data} qid={o.qid} />
    </section>
  );
}
