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

  return { download, toCSV, exportCSV, exportJSON, copyText };
})();

export { Exporter };