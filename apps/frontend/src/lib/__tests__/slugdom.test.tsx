import { describe, it, expect } from 'vitest';
import { render } from 'solid-js/web';
import { createSignal } from 'solid-js';
import { applySlugField } from '../slug';
import { Input } from '../../components/Input';

describe('slug auto-derive in DOM', () => {
  it('typing name fills the slug input', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const [input, setInput] = createSignal({ name: '', slug: '' });
    const dispose = render(() => (
      <form>
        <Input label="Name" value={input().name}
          onInput={(e) => setInput((c) => applySlugField(c, 'name', e.currentTarget.value))} />
        <Input label="Slug" value={input().slug}
          onInput={(e) => setInput((c) => applySlugField(c, 'slug', e.currentTarget.value))} />
      </form>
    ), host);
    const [name, slug] = Array.from(host.querySelectorAll('input'));
    name.value = 'Acme Corp';
    name.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));
    expect(slug.value).toBe('acme-corp');
    dispose();
    host.remove();
  });
});
