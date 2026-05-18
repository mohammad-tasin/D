/**
 * Generates a high-resolution PDF from one or more image URIs.
 *
 * Each image is placed on its own page. The images are embedded at full
 * resolution so that consumers can zoom in without quality loss.
 *
 * @param {string[]} imageUris  Array of local file URIs (file://) or
 *                              base64 data URIs for the images to include.
 * @param {object}  [options]
 * @param {number}  [options.pageWidthPt=595]   Page width in PDF points (1 pt = 1/72 inch).
 *                                               Default is A4 width.
 * @param {number}  [options.pageHeightPt=842]  Page height in PDF points.
 *                                               Default is A4 height.
 * @param {number}  [options.quality=1.0]       JPEG quality 0–1.  Not used when the
 *                                               source is already a PNG/base64 string.
 * @returns {string}  HTML string ready to be fed to expo-print.
 */
export function buildHighResPDFHtml(imageUris, options = {}) {
  const {
    pageWidthPt = 595,
    pageHeightPt = 842,
  } = options;

  // Convert PDF-point dimensions to pixels at 300 DPI for crisp rendering.
  // 1 pt = 1/72 inch, so at 300 DPI: px = pt * (300/72)
  const DPI = 300;
  const pageWidthPx = Math.round(pageWidthPt * (DPI / 72));
  const pageHeightPx = Math.round(pageHeightPt * (DPI / 72));

  const pageStyle = `
    @page {
      size: ${pageWidthPt}pt ${pageHeightPt}pt;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      width: ${pageWidthPt}pt;
      background: #ffffff;
    }
    .page {
      width: ${pageWidthPt}pt;
      height: ${pageHeightPt}pt;
      page-break-after: always;
      page-break-inside: avoid;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .page:last-child {
      page-break-after: auto;
    }
    .page img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      /* Render at the native resolution for maximum detail. */
      image-rendering: -webkit-optimize-contrast;
      image-rendering: crisp-edges;
    }
  `;

  const pages = imageUris
    .map(
      (uri) =>
        `<div class="page"><img src="${uri}" width="${pageWidthPx}" height="${pageHeightPx}" /></div>`
    )
    .join('\n');

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=${pageWidthPx}, initial-scale=1.0" />
    <style>${pageStyle}</style>
  </head>
  <body>${pages}</body>
</html>`;
}

/**
 * Returns a unique filename for a new PDF based on the current timestamp.
 */
export function generatePDFFilename() {
  const now = new Date();
  const stamp = now
    .toISOString()
    .replace(/[-:T]/g, '')
    .replace(/\..+/, '');
  return `pdf_${stamp}.pdf`;
}
