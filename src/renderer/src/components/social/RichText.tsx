import { segmentRichText, type Facet } from '@getjolt/protocol';
import clsx from 'clsx';
import { memo, useMemo, type MouseEvent } from 'react';
import { openProfileByAddress } from '@/store/social';
import { useUi } from '@/store/ui';

interface Props {
  text: string;
  facets: Facet[];
  className?: string;
}

/** Post text with its links, mentions and tags made interactive. Never renders HTML. */
export const RichText = memo(function RichText({ text, facets, className }: Props) {
  const parts = useMemo(() => segmentRichText({ text, facets }), [text, facets]);
  const underline = useUi((s) => s.underlineLinks);
  if (!text) return null;

  return (
    <p data-selectable className={clsx('break-words whitespace-pre-wrap', className)}>
      {parts.map((part, i) => {
        const facet = part.facet;
        if (!facet) return <span key={i}>{part.text}</span>;
        const stop = (e: MouseEvent) => e.stopPropagation();
        if (facet.kind === 'link') {
          return (
            <a
              key={i}
              href={facet.value}
              title={facet.value}
              className={clsx('text-accent-text hover:underline', underline && 'underline')}
              onClick={(e) => {
                e.preventDefault();
                stop(e);
                void window.jolt.openExternal(facet.value);
              }}
            >
              {shortenUrl(part.text)}
            </a>
          );
        }
        if (facet.kind === 'mention') {
          return (
            <button
              key={i}
              type="button"
              className="font-medium text-accent-text hover:underline"
              onClick={(e) => {
                stop(e);
                if (facet.userId) useUi.getState().goHome({ view: 'profile', userId: facet.userId });
                else void openProfileByAddress(facet.value);
              }}
            >
              {part.text}
            </button>
          );
        }
        return (
          <span key={i} className="text-accent-text">
            {part.text}
          </span>
        );
      })}
    </p>
  );
});

/** Long links read better without the scheme and with a trimmed tail, like other social apps show them. */
function shortenUrl(url: string): string {
  const bare = url.replace(/^https?:\/\/(www\.)?/, '');
  return bare.length > 36 ? `${bare.slice(0, 33)}…` : bare;
}
