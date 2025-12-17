import { describe, it, expect } from 'vitest';
import { sanitizeUrlQueryStringsDeep, stripQueryFromUrlLikeString } from '../../../src/utils/url';

describe('utils/url', () => {
  describe('stripQueryFromUrlLikeString', () => {
    it('strips query/hash from root-relative paths', () => {
      expect(stripQueryFromUrlLikeString('/a/b?token=secret#frag')).toBe('/a/b');
    });

    it('leaves root-relative paths without query/hash unchanged', () => {
      expect(stripQueryFromUrlLikeString('/a/b')).toBe('/a/b');
    });

    it('strips query/hash from http(s) URLs', () => {
      expect(stripQueryFromUrlLikeString('https://example.com/a/b?token=secret#frag')).toBe(
        'https://example.com/a/b'
      );
    });

    it('leaves non-URL strings untouched', () => {
      expect(stripQueryFromUrlLikeString('token=secret')).toBe('token=secret');
      expect(stripQueryFromUrlLikeString('not-a-url?token=secret')).toBe('not-a-url?token=secret');
    });

    it('falls back to string stripping for invalid http(s) URLs', () => {
      expect(stripQueryFromUrlLikeString('https://exa mple.com/a?token=secret')).toBe(
        'https://exa mple.com/a'
      );
    });
  });

  describe('sanitizeUrlQueryStringsDeep', () => {
    it('passes through primitives and null', () => {
      expect(sanitizeUrlQueryStringsDeep(123)).toBe(123);
      expect(sanitizeUrlQueryStringsDeep(null)).toBeNull();
    });

    it('sanitizes url-like strings nested in objects and arrays', () => {
      const input = {
        path: '/x?token=secret',
        arr: ['https://example.com/a?token=secret', 'token=secret'],
        nested: { url: 'https://xynes.example/path?token=secret' },
      };

      const out = sanitizeUrlQueryStringsDeep(input);
      expect(out).toEqual({
        path: '/x',
        arr: ['https://example.com/a', 'token=secret'],
        nested: { url: 'https://xynes.example/path' },
      });
    });

    it('does not clone or mutate non-plain objects', () => {
      class Box {
        constructor(public value: string) {}
      }
      const boxed = new Box('https://example.com/a?token=secret');

      const out = sanitizeUrlQueryStringsDeep({ boxed });
      expect(out.boxed).toBe(boxed);
      expect(out.boxed.value).toBe('https://example.com/a?token=secret');
    });

    it('does not allow prototype pollution via __proto__/constructor/prototype keys', () => {
      const before = ({} as any).polluted;

      const input = Object.create(null) as any;
      input['__proto__'] = { polluted: 'yes' };
      input.constructor = { prototype: { polluted2: 'yes' } };
      input.safe = 'ok';

      const out = sanitizeUrlQueryStringsDeep(input);

      expect(({} as any).polluted).toBe(before);
      expect(({} as any).polluted2).toBeUndefined();
      expect(out.safe).toBe('ok');

      expect(Object.prototype.hasOwnProperty.call(out, '__proto__')).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(out, 'constructor')).toBe(false);
    });
  });
});
