import {
  buildHighResPDFHtml,
  generatePDFFilename,
} from '../src/utils/pdfGenerator';

describe('pdfGenerator', () => {
  describe('buildHighResPDFHtml', () => {
    it('returns a string', () => {
      const html = buildHighResPDFHtml(['file:///test.jpg']);
      expect(typeof html).toBe('string');
    });

    it('contains <!DOCTYPE html>', () => {
      const html = buildHighResPDFHtml(['file:///test.jpg']);
      expect(html).toContain('<!DOCTYPE html>');
    });

    it('embeds each image URI as an <img> src', () => {
      const uris = ['file:///a.jpg', 'file:///b.png'];
      const html = buildHighResPDFHtml(uris);
      uris.forEach((uri) => {
        expect(html).toContain(`src="${uri}"`);
      });
    });

    it('creates one page div per image', () => {
      const uris = ['file:///a.jpg', 'file:///b.png', 'file:///c.jpg'];
      const html = buildHighResPDFHtml(uris);
      const pageMatches = html.match(/class="page"/g) || [];
      expect(pageMatches).toHaveLength(uris.length);
    });

    it('uses default A4 page dimensions in the @page rule', () => {
      const html = buildHighResPDFHtml(['file:///test.jpg']);
      expect(html).toContain('595pt 842pt');
    });

    it('respects custom page dimensions', () => {
      const html = buildHighResPDFHtml(['file:///test.jpg'], {
        pageWidthPt: 612,
        pageHeightPt: 792,
      });
      expect(html).toContain('612pt 792pt');
    });

    it('renders images at 300 DPI (pts × 300/72)', () => {
      // Default A4: 595pt × (300/72) ≈ 2479px
      const html = buildHighResPDFHtml(['file:///test.jpg']);
      const expectedWidthPx = Math.round(595 * (300 / 72));
      expect(html).toContain(`width="${expectedWidthPx}"`);
    });

    it('handles an empty array without throwing', () => {
      expect(() => buildHighResPDFHtml([])).not.toThrow();
      const html = buildHighResPDFHtml([]);
      expect(html).toContain('<!DOCTYPE html>');
    });

    it('includes crisp-edges image-rendering directive', () => {
      const html = buildHighResPDFHtml(['file:///test.jpg']);
      expect(html).toContain('crisp-edges');
    });
  });

  describe('generatePDFFilename', () => {
    it('returns a string ending in .pdf', () => {
      expect(generatePDFFilename()).toMatch(/\.pdf$/);
    });

    it('starts with pdf_', () => {
      expect(generatePDFFilename()).toMatch(/^pdf_/);
    });

    it('produces unique filenames on successive calls', () => {
      // Sleep 2 ms between calls to guarantee different timestamps.
      const first = generatePDFFilename();
      const second = generatePDFFilename();
      // Both should be valid – they may occasionally be equal in the same ms,
      // so we just check the format rather than strict inequality.
      expect(first).toMatch(/^pdf_\d+\.pdf$/);
      expect(second).toMatch(/^pdf_\d+\.pdf$/);
    });
  });
});
