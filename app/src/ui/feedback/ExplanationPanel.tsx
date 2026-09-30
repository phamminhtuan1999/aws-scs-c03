import { unitLabel } from '../../data/derive';
import type { AppData } from '../../data/loader';
import { SafeLink } from './ResearchDetails';

/** Vietnamese explanation panel. Only mounted after the answer has been checked / the exam submitted. */
export function ExplanationPanel({ data, qid }: { data: AppData; qid: string }) {
  const rv = data.reviews[qid];
  const ex = rv.explanation_vi;
  const hasAny = !!(ex?.why_correct || (ex?.others && Object.keys(ex.others).length) || rv.keywords.length || rv.memory_tip_vi);
  if (!hasAny) {
    return (
      <section className="explanation" aria-label="Explanation">
        <h3>Giải thích</h3>
        <p className="muted">
          {rv.status === 'pending'
            ? 'Chưa có lời giải: câu này chưa được research (pending).'
            : 'Chưa có lời giải cho câu này trong hồ sơ research.'}
        </p>
      </section>
    );
  }
  const others = Object.entries(ex?.others ?? {});
  // One link per page: several references often quote different passages of the same URL.
  const refs = rv.references.filter((r, i, all) => r.url && all.findIndex((x) => x.url === r.url) === i);
  return (
    <section className="explanation" aria-label="Explanation" lang="vi">
      <h3>Giải thích</h3>
      {rv.status !== 'verified' && (
        <p className="muted" role="note">
          Lưu ý: trạng thái research của câu này là &ldquo;{rv.status}&rdquo; — nội dung dưới đây chưa phải kết luận chắc chắn.
        </p>
      )}
      {ex?.why_correct && (
        <div>
          <h4>Vì sao đúng</h4>
          <p>{ex.why_correct}</p>
        </div>
      )}
      {others.length > 0 && (
        <div>
          <h4>Các lựa chọn còn lại</h4>
          <ul>
            {others.map(([unit, text]) => {
              const l = unitLabel(data, qid, unit);
              return (
                <li key={unit}>
                  <strong>{l.label}:</strong> {text}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {rv.keywords.length > 0 && (
        <div>
          <h4>Keyword</h4>
          <ul>
            {rv.keywords.slice(0, 3).map((k, i) => (
              <li key={i}>
                <strong>{k.phrase}</strong>
                {k.meaning_vi ? ` — ${k.meaning_vi}` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
      {rv.memory_tip_vi && (
        <div>
          <h4>Mẹo nhớ</h4>
          <p>{rv.memory_tip_vi}</p>
        </div>
      )}
      {refs.length > 0 && (
        <div>
          <h4>Nguồn AWS</h4>
          <ul>
            {refs.map((r) => (
              <li key={r.id}>
                <SafeLink url={r.url}>{r.title}</SafeLink>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
