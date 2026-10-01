import clsx from 'clsx';
import { Check, Copy } from 'lucide-react';
import { memo, useMemo, useState, type ReactNode } from 'react';
import { displayName } from '@/lib/format';
import { isEmojiOnly, parseMarkdown, type BlockNode, type InlineNode } from '@/lib/markdown';
import type { GuildState } from '@/store/data';
import { useUi } from '@/store/ui';

interface Props {
  content: string;
  guild: GuildState;
}

export const Markdown = memo(function Markdown({ content, guild }: Props) {
  const blocks = useMemo(() => parseMarkdown(content), [content]);
  const jumbo = useMemo(() => isEmojiOnly(content), [content]);
  return (
    <div
      data-selectable
      className={clsx(
        'leading-[1.375] break-words whitespace-pre-wrap text-fg',
        jumbo && 'text-[2.75rem] leading-tight',
      )}
    >
      {blocks.map((block, i) => (
        <Block key={i} block={block} guild={guild} />
      ))}
    </div>
  );
});

function Block({ block, guild }: { block: BlockNode; guild: GuildState }) {
  switch (block.type) {
    case 'paragraph':
      return <p>{renderInline(block.children, guild)}</p>;
    case 'heading': {
      const Tag = (['h3', 'h4', 'h5'] as const)[block.level - 1]!;
      const size = ['text-2xl', 'text-xl', 'text-base'][block.level - 1];
      return <Tag className={clsx('mt-2 mb-1 font-bold', size)}>{renderInline(block.children, guild)}</Tag>;
    }
    case 'quote':
      return (
        <blockquote className="my-0.5 border-l-4 border-line-strong pl-3">
          {block.children.map((child, i) => (
            <Block key={i} block={child} guild={guild} />
          ))}
        </blockquote>
      );
    case 'codeBlock':
      return <CodeBlock text={block.text} lang={block.lang} />;
  }
}

function CodeBlock({ text, lang }: { text: string; lang: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="group/code relative my-1 max-w-[min(100%,56rem)]">
      <pre className="scroll-thin overflow-x-auto rounded-md border border-line bg-sunken p-3 font-mono text-[0.8125rem] leading-relaxed whitespace-pre">
        <code aria-label={lang ? `${lang} code` : 'Code'}>{text}</code>
      </pre>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="absolute top-2 right-2 rounded-md bg-raised p-1.5 text-fg-muted opacity-0 group-hover/code:opacity-100 hover:text-fg focus-visible:opacity-100"
        aria-label={copied ? 'Copied' : 'Copy code'}
      >
        {copied ? (
          <Check className="size-4" aria-hidden="true" />
        ) : (
          <Copy className="size-4" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}

function renderInline(nodes: InlineNode[], guild: GuildState): ReactNode[] {
  return nodes.map((node, i) => <Inline key={i} node={node} guild={guild} />);
}

function Inline({ node, guild }: { node: InlineNode; guild: GuildState }): ReactNode {
  switch (node.type) {
    case 'text':
      return node.text;
    case 'br':
      return <br />;
    case 'bold':
      return <strong className="font-bold">{renderInline(node.children, guild)}</strong>;
    case 'italic':
      return <em>{renderInline(node.children, guild)}</em>;
    case 'underline':
      return <u>{renderInline(node.children, guild)}</u>;
    case 'strike':
      return <s>{renderInline(node.children, guild)}</s>;
    case 'code':
      return <code className="rounded bg-raised px-1 py-0.5 font-mono text-[0.85em]">{node.text}</code>;
    case 'spoiler':
      return <Spoiler>{renderInline(node.children, guild)}</Spoiler>;
    case 'link':
      return <ExternalLink url={node.url}>{renderInline(node.children, guild)}</ExternalLink>;
    case 'userMention': {
      const member = guild.members[node.id];
      const name = member ? displayName(member.user, member) : 'unknown-user';
      return <span className="rounded bg-accent-soft px-0.5 font-medium text-accent-text">@{name}</span>;
    }
    case 'channelMention': {
      const channel = guild.channels[node.id];
      if (!channel) return <span className="rounded bg-raised px-0.5 text-fg-muted">#unknown</span>;
      return (
        <button
          type="button"
          className="rounded bg-accent-soft px-0.5 font-medium text-accent-text hover:underline"
          onClick={() => useUi.getState().openChannel(guild.key, channel.id)}
        >
          #{channel.name}
        </button>
      );
    }
    case 'everyone':
      return <span className="rounded bg-accent-soft px-0.5 font-medium text-accent-text">{node.text}</span>;
  }
}

function ExternalLink({ url, children }: { url: string; children: ReactNode }) {
  return (
    <a
      href={url}
      data-link
      title={url}
      className="text-accent-text hover:underline"
      onClick={(e) => {
        e.preventDefault();
        void window.jolt.openExternal(url);
      }}
    >
      {children}
    </a>
  );
}

function Spoiler({ children }: { children: ReactNode }) {
  const [revealed, setRevealed] = useState(false);
  if (revealed) return <span className="rounded bg-raised px-0.5">{children}</span>;
  return (
    <button
      type="button"
      onClick={() => setRevealed(true)}
      aria-label="Spoiler, activate to reveal"
      className="rounded bg-fg-subtle px-0.5 text-transparent transition-colors select-none hover:bg-fg-muted"
    >
      <span aria-hidden="true">{children}</span>
    </button>
  );
}
