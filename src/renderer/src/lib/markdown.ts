// Discord-flavoured markdown: **bold**, *italic*, __underline__, ~~strike~~, `code`, ```blocks```, > quotes,
// # headings, ||spoilers||, links and <@mentions>. Produces a tree that the renderer turns into React
// elements, so message content is never injected as HTML.

export type InlineNode =
  | { type: 'text'; text: string }
  | { type: 'bold' | 'italic' | 'underline' | 'strike' | 'spoiler'; children: InlineNode[] }
  | { type: 'code'; text: string }
  | { type: 'link'; url: string; children: InlineNode[] }
  | { type: 'userMention'; id: string }
  | { type: 'channelMention'; id: string }
  | { type: 'everyone'; text: string }
  | { type: 'br' };

export type BlockNode =
  | { type: 'paragraph'; children: InlineNode[] }
  | { type: 'heading'; level: 1 | 2 | 3; children: InlineNode[] }
  | { type: 'quote'; children: BlockNode[] }
  | { type: 'codeBlock'; lang: string; text: string };

interface Rule {
  pattern: RegExp;
  build: (match: RegExpExecArray) => InlineNode;
}

const wrap = (type: 'bold' | 'italic' | 'underline' | 'strike' | 'spoiler') => (m: RegExpExecArray) =>
  ({ type, children: parseInline(m[1]!) }) as InlineNode;

const URL_PATTERN = /(?<![\w/])https?:\/\/[^\s<>"'`]+[^\s<>"'`.,:;!?)\]]/y;

const rules: Rule[] = [
  { pattern: /\\([*_~`|\\<>@#[\]])/y, build: (m) => ({ type: 'text', text: m[1]! }) },
  { pattern: /``([^]+?)``|`([^`\n]+?)`/y, build: (m) => ({ type: 'code', text: (m[1] ?? m[2])! }) },
  { pattern: /\|\|([^]+?)\|\|/y, build: wrap('spoiler') },
  { pattern: /\*\*([^]+?)\*\*(?!\*)/y, build: wrap('bold') },
  { pattern: /__([^]+?)__(?!_)/y, build: wrap('underline') },
  { pattern: /\*(?!\s)([^*\n]+?)(?<!\s)\*(?!\*)/y, build: wrap('italic') },
  { pattern: /\b_(?!\s)([^_\n]+?)(?<!\s)_\b/y, build: wrap('italic') },
  { pattern: /~~([^]+?)~~/y, build: wrap('strike') },
  { pattern: /<@(\d{1,20})>/y, build: (m) => ({ type: 'userMention', id: m[1]! }) },
  { pattern: /<#(\d{1,20})>/y, build: (m) => ({ type: 'channelMention', id: m[1]! }) },
  { pattern: /@(everyone|here)\b/y, build: (m) => ({ type: 'everyone', text: m[0] }) },
  {
    pattern: /\[([^\]\n]{1,200})\]\((https?:\/\/[^\s)]+)\)/y,
    build: (m) => ({ type: 'link', url: m[2]!, children: parseInline(m[1]!) }),
  },
  {
    pattern: URL_PATTERN,
    build: (m) => ({ type: 'link', url: m[0], children: [{ type: 'text', text: m[0] }] }),
  },
  { pattern: /\n/y, build: () => ({ type: 'br' }) },
];

const SPECIAL = /[\\`|*_~<@[\nh]/;

export function parseInline(source: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  let text = '';
  let i = 0;

  const flush = () => {
    if (text) nodes.push({ type: 'text', text });
    text = '';
  };

  outer: while (i < source.length) {
    const char = source[i]!;
    if (SPECIAL.test(char)) {
      for (const rule of rules) {
        rule.pattern.lastIndex = i;
        const match = rule.pattern.exec(source);
        if (match) {
          flush();
          nodes.push(rule.build(match));
          i += match[0].length;
          continue outer;
        }
      }
    }
    text += char;
    i++;
  }
  flush();
  return nodes;
}

export function parseMarkdown(source: string): BlockNode[] {
  const blocks: BlockNode[] = [];
  const fence = /```(?:([\w+-]{1,20})\n)?\n?([^]*?)```/g;
  let last = 0;

  for (const match of source.matchAll(fence)) {
    blocks.push(...parseLines(source.slice(last, match.index)));
    blocks.push({ type: 'codeBlock', lang: match[1] ?? '', text: match[2]!.replace(/\n$/, '') });
    last = match.index + match[0].length;
  }
  blocks.push(...parseLines(source.slice(last)));
  return blocks;
}

function parseLines(source: string): BlockNode[] {
  const trimmed = source.replace(/^\n+|\n+$/g, '');
  if (!trimmed) return [];

  const blocks: BlockNode[] = [];
  let paragraph: string[] = [];
  let quote: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length) blocks.push({ type: 'paragraph', children: parseInline(paragraph.join('\n')) });
    paragraph = [];
  };
  const flushQuote = () => {
    if (quote.length) blocks.push({ type: 'quote', children: parseLines(quote.join('\n')) });
    quote = [];
  };

  for (const line of trimmed.split('\n')) {
    const quoted = /^> ?(.*)$/.exec(line);
    if (quoted) {
      flushParagraph();
      quote.push(quoted[1]!);
      continue;
    }
    flushQuote();

    const heading = /^(#{1,3}) (.+)$/.exec(line);
    if (heading) {
      flushParagraph();
      blocks.push({
        type: 'heading',
        level: heading[1]!.length as 1 | 2 | 3,
        children: parseInline(heading[2]!),
      });
      continue;
    }
    paragraph.push(line);
  }
  flushParagraph();
  flushQuote();
  return blocks;
}

/** Content that is nothing but 1–3 emoji renders larger, like other chat apps. */
export function isEmojiOnly(source: string): boolean {
  const trimmed = source.trim();
  if (!trimmed || trimmed.length > 30) return false;
  const emoji = trimmed.match(/\p{Extended_Pictographic}(‍\p{Extended_Pictographic}|️|\p{Emoji_Modifier})*/gu);
  return Boolean(emoji && emoji.length <= 3 && trimmed.replace(/\s/g, '') === emoji.join(''));
}
