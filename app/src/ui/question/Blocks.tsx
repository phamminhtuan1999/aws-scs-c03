import type { Block } from '../../data/schema';
import { useZoom } from '../ZoomDialog';

export const DATA_BASE = './data/';
export const imageSrc = (file: string) => `${DATA_BASE}${file}`;

/**
 * Renders question blocks verbatim and in order. Every block carries data-block-id (used by the DOM-integrity tests).
 * All text is a React text node (never HTML). Images are click-to-zoom.
 */
export function Blocks({ blocks, className }: { blocks: Block[]; className?: string }) {
  const zoom = useZoom();
  return (
    <div className={className}>
      {blocks.map((b) =>
        b.type === 'text' ? (
          <p key={b.id} className="q-text" data-block-id={b.id}>
            {b.text}
          </p>
        ) : (
          <figure key={b.id} className="q-image" data-block-id={b.id} data-image-file={b.file} data-image-role={b.role}>
            <button
              type="button"
              className="img-btn"
              aria-label="Zoom image"
              onClick={() => zoom.open({ src: imageSrc(b.file), alt: 'Question image (enlarged)', width: b.width, height: b.height })}
            >
              <img src={imageSrc(b.file)} alt="Image from the question" width={b.width} height={b.height} data-file={b.file} />
            </button>
          </figure>
        ),
      )}
    </div>
  );
}
