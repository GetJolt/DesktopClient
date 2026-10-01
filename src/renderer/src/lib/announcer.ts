// Screen reader announcements through two persistent live regions. Messages are coalesced so a burst of
// chat activity doesn't flood the user.

let polite: HTMLElement | null = null;
let assertive: HTMLElement | null = null;
let queue: string[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

function region(level: 'polite' | 'assertive') {
  const el = document.createElement('div');
  el.setAttribute('aria-live', level);
  el.setAttribute('aria-atomic', 'false');
  el.setAttribute('role', level === 'assertive' ? 'alert' : 'status');
  Object.assign(el.style, {
    position: 'absolute',
    width: '1px',
    height: '1px',
    overflow: 'hidden',
    clipPath: 'inset(50%)',
    whiteSpace: 'nowrap',
  });
  document.body.appendChild(el);
  return el;
}

function ensure() {
  polite ??= region('polite');
  assertive ??= region('assertive');
}

export function announce(text: string, level: 'polite' | 'assertive' = 'polite') {
  ensure();
  if (level === 'assertive') {
    assertive!.textContent = '';
    requestAnimationFrame(() => (assertive!.textContent = text));
    return;
  }
  queue.push(text);
  if (queue.length > 3) queue = [queue[0]!, `${queue.length - 1} more new messages`];
  timer ??= setTimeout(() => {
    polite!.textContent = queue.join('. ');
    queue = [];
    timer = null;
  }, 400);
}
