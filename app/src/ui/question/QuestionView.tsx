import type { AppData } from '../../data/loader';
import type { ImageBlock } from '../../data/schema';
import { isEmptyResponse, type Response } from '../../grading/engine';
import { Blocks, imageSrc } from './Blocks';
import { ChoiceList } from './ChoiceList';
import { MatchingControl } from './MatchingControl';
import { OrderingControl } from './OrderingControl';
import { useZoom } from '../ZoomDialog';

type Note = { text: string; tone: 'good' | 'bad' | 'info' };
export interface Annotations {
  choice?: Record<string, Note[]>;
  slot?: Record<number, Note[]>;
  row?: Record<string, Note[]>;
}

export interface QuestionViewProps {
  data: AppData;
  qid: string;
  response: Response;
  onChange?: (r: Response) => void;
  /** read-only (after checking / in results) */
  disabled?: boolean;
  annotations?: Annotations;
  /** hide the "Clear answer" button (results review) */
  hideClear?: boolean;
}

/** Stem (verbatim blocks) + the answer control for the question type. */
export function QuestionView({ data, qid, response, onChange, disabled, annotations, hideClear }: QuestionViewProps) {
  const q = data.byId.get(qid);
  const zoom = useZoom();
  if (!q) return <p role="alert">Unknown question.</p>;
  const hs = data.hotspot[qid];
  const stemImage =
    hs?.stem_image != null ? (q.stem.find((b) => b.id === hs.stem_image && b.type === 'image') as ImageBlock | undefined) : undefined;

  return (
    <article className="question" data-qtype={q.type} aria-label="Question">
      <Blocks blocks={q.stem} className="stem" />
      {stemImage && (
        <p className="original-image-row">
          <button
            type="button"
            className="link-btn"
            onClick={() => zoom.open({ src: imageSrc(stemImage.file), alt: 'Original question image (enlarged)', width: stemImage.width, height: stemImage.height })}
          >
            View original image
          </button>
        </p>
      )}
      {(q.type === 'multiple_choice' || q.type === 'multiple_response') && (
        <ChoiceList
          question={q}
          value={(response as string | null | string[]) ?? (q.type === 'multiple_response' ? [] : null)}
          onChange={onChange ? (v) => onChange(v) : undefined}
          disabled={disabled}
          annotations={annotations?.choice}
        />
      )}
      {q.type === 'ordering' && hs?.kind === 'ordering' && (
        <OrderingControl
          hotspot={hs}
          value={Array.isArray(response) ? (response as (string | null)[]) : undefined}
          onChange={onChange ? (v) => onChange(v) : undefined}
          disabled={disabled}
          annotations={annotations?.slot}
        />
      )}
      {q.type === 'matching' && hs?.kind === 'matching' && (
        <MatchingControl
          hotspot={hs}
          value={response && typeof response === 'object' && !Array.isArray(response) ? (response as Record<string, string | null>) : undefined}
          onChange={onChange ? (v) => onChange(v) : undefined}
          disabled={disabled}
          annotations={annotations?.row}
        />
      )}
      {onChange && !disabled && !hideClear && (
        <p className="clear-row">
          <button
            type="button"
            className="link-btn"
            onClick={() => onChange(q.type === 'multiple_response' ? [] : q.type === 'matching' ? {} : q.type === 'ordering' ? [] : null)}
            disabled={isEmptyResponse(q.type, response)}
          >
            Clear answer
          </button>
        </p>
      )}
    </article>
  );
}
