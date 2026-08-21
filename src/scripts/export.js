/* ============================================================
 * export.js — Export results as CSV / JSON, copy to clipboard.
 * ============================================================ */

const Exporter = (() => {

  function download(filename, content, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function toCSV(rows) {
    if (!rows.length) return '';
    const headers = Object.keys(rows[0]);
    const esc = v => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const lines = [headers.join(',')];
    for (const row of rows) {
      lines.push(headers.map(h => esc(row[h])).join(','));
    }
    return lines.join('\r\n');
  }

  function exportCSV(rows, baseName) {
    const stamp = new Date().toISOString().slice(0, 10);
    download(`${baseName || 'tokencalc'}-${stamp}.csv`, toCSV(rows), 'text/csv;charset=utf-8');
  }

  function exportJSON(obj, baseName) {
    const stamp = new Date().toISOString().slice(0, 10);
    download(`${baseName || 'tokencalc'}-${stamp}.json`, JSON.stringify(obj, null, 2), 'application/json;charset=utf-8');
  }

  async function copyText(text, successMsg) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      // Fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); return true; }
      catch (_) { return false; }
      finally { document.body.removeChild(ta); }
    }
  }

  /* Render a DOM node to a PNG via SVG <foreignObject>.
   * Same-origin stylesheets are inlined so the snapshot keeps its look;
   * webfonts fall back to system fonts inside the sandboxed SVG. */
  async function exportPNG(element, baseName) {
    try {
      let css = '';
      for (const sheet of document.styleSheets) {
        try { css += Array.from(sheet.cssRules).map(r => r.cssText).join('\n'); }
        catch (_) { /* cross-origin sheet — skip */ }
      }
      const rect = element.getBoundingClientRect();
      const w = Math.ceil(rect.width);
      const h = Math.ceil(rect.height);

      const clone = element.cloneNode(true);
      clone.querySelectorAll('.result-actions').forEach(n => n.remove());
      clone.style.width = w + 'px';
      const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <style>${css.replace(/<\/?style[^>]*>/g, '')}</style>
  <foreignObject width="100%" height="100%">
    <div xmlns="http://www.w3.org/1999/xhtml" style="width:${w}px;">${clone.outerHTML}</div>
  </foreignObject>
</svg>`;
      const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });
      const scale = 2;
      const canvas = document.createElement('canvas');
      canvas.width = w * scale;
      canvas.height = h * scale;
      const ctx = canvas.getContext('2d');
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
      if (!blob) return false;
      const stamp = new Date().toISOString().slice(0, 10);
      download(`${baseName || 'tokencalc'}-${stamp}.png`, blob, 'image/png');
      return true;
    } catch (e) {
      return false;
    }
  }

  return { download, toCSV, exportCSV, exportJSON, copyText, exportPNG };
})();

export { Exporter };