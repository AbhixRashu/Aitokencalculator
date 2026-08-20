/* ============================================================
 * charts.js — Chart.js wrapper, single canvas
 * renderMain(kind, payload): 'projection' | 'growth' | 'compare'
 * ============================================================ */

import { getProvider } from './models.js';

const Charts = (() => {
  let chart = null;

  const MONO = "'Geist Mono', ui-monospace, SFMono-Regular, Menlo, monospace";

  function ready() {
    return typeof window !== 'undefined' && typeof window.Chart !== 'undefined';
  }

  function themeColors() {
    const style = getComputedStyle(document.documentElement);
    const axis = style.getPropertyValue('--mute').trim() || '#888888';
    const grid = style.getPropertyValue('--hairline').trim() || '#ebebeb';
    const text = style.getPropertyValue('--ink').trim() || '#171717';
    const canvas = style.getPropertyValue('--canvas').trim() || '#ffffff';
    return { axis, grid, text, canvas };
  }

  function baseScales() {
    const c = themeColors();
    return {
      x: {
        ticks: { color: c.axis, font: { family: MONO, size: 11 }, maxRotation: 0 },
        grid: { color: 'transparent' },
        border: { color: c.grid }
      },
      y: {
        ticks: { color: c.axis, font: { family: MONO, size: 11 }, padding: 6 },
        grid: { color: c.grid },
        border: { display: false }
      }
    };
  }

  function tooltipBase(symbol) {
    return {
      backgroundColor: themeColors().text,
      titleColor: themeColors().canvas,
      bodyColor: themeColors().canvas,
      borderColor: 'transparent',
      borderWidth: 0,
      padding: 10,
      cornerRadius: 6,
      titleFont: { family: MONO, size: 11, weight: 500 },
      bodyFont: { family: MONO, size: 11 },
      displayColors: false,
      callbacks: symbol ? { label: ctx => ` ${ctx.dataset.label}: ${symbol}${ctx.parsed.y.toLocaleString()}` } : {}
    };
  }

  function make(config) {
    const ctx = document.getElementById('chart-main');
    if (!ctx) return;
    if (chart) { chart.destroy(); chart = null; }
    chart = new window.Chart(ctx, config);
  }

  function resolveColor(color) {
    if (color === 'ink') return themeColors().text;
    return color;
  }

  /* ---------- Monthly projection: input / output / total ---------- */
  function projection(payload) {
    const { labels, series, symbol } = payload;
    const c = themeColors();
    const datasets = series.map(s => {
      const base = {
        label: s.label,
        data: s.data,
        borderColor: resolveColor(s.color),
        borderWidth: s.label === 'Total' ? 3 : 2,
        pointRadius: s.label === 'Total' ? 3 : 0,
        pointHoverRadius: 4,
        pointBackgroundColor: resolveColor(s.color),
        tension: 0.4
      };
      if (s.fill) {
        base.fill = true;
        base.backgroundColor = (ctx) => {
          const { chartArea } = ctx.chart;
          if (!chartArea) return 'rgba(0,0,0,0)';
          const grd = ctx.chart.ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          grd.addColorStop(0, hexToRgba(resolveColor(s.color), 0.16));
          grd.addColorStop(1, hexToRgba(resolveColor(s.color), 0));
          return grd;
        };
      }
      return base;
    });
    make({
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: tooltipBase(symbol)
        },
        scales: baseScales()
      }
    });
  }

  /* ---------- Multi-turn context growth ---------- */
  function growth(payload) {
    const { labels, data } = payload;
    const c = themeColors();
    make({
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Context in window (tokens)',
          data,
          borderColor: '#7928ca',
          backgroundColor: (ctx) => {
            const { chartArea } = ctx.chart;
            if (!chartArea) return 'rgba(0,0,0,0)';
            const grd = ctx.chart.ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            grd.addColorStop(0, 'rgba(121, 40, 202, 0.14)');
            grd.addColorStop(1, 'rgba(121, 40, 202, 0)');
            return grd;
          },
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
          pointRadius: 0,
          pointHoverRadius: 4
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            ...tooltipBase(),
            callbacks: { label: ctx => ` ${ctx.parsed.y.toLocaleString()} tokens` }
          }
        },
        scales: baseScales()
      }
    });
  }

  /* ---------- Model comparison bars ---------- */
  function compare(payload) {
    const { models, data, colors } = payload;
    const c = themeColors();
    const cheapest = Math.min(...data);
    const valueLabels = {
      id: 'valueLabels',
      afterDatasetsDraw(chart) {
        const ctx = chart.ctx;
        ctx.save();
        ctx.font = "10px " + MONO;
        ctx.textAlign = 'center';
        chart.data.datasets.forEach((ds, di) => {
          const meta = chart.getDatasetMeta(di);
          meta.data.forEach((bar, i) => {
            const isMin = ds.data[i] === cheapest;
            ctx.fillStyle = isMin ? c.text : c.axis;
            ctx.fillText(ds.data[i].toFixed(4), bar.x, bar.y - 7);
          });
        });
        ctx.restore();
      }
    };
    make({
      type: 'bar',
      data: {
        labels: models.map(m => m.name),
        datasets: [{
          label: 'Cost per request',
          data,
          backgroundColor: colors || models.map(m => getProvider(m.provider)?.color || '#171717'),
          borderRadius: 6,
          maxBarThickness: 64
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            ...tooltipBase(),
            callbacks: { label: ctx => ` ${ctx.parsed.y.toFixed(4)} ${window.__cur || 'USD'}` }
          }
        },
        scales: baseScales()
      },
      plugins: [valueLabels]
    });
  }

  /* ---------- Ranking: horizontal bars, cheapest first ---------- */
  function ranking(payload) {
    const { rows, symbol } = payload;
    const c = themeColors();
    const TOP = Math.min(15, rows.length);
    const sorted = [...rows].sort((a, b) => a.result.total - b.result.total).slice(0, TOP);
    const labels = sorted.map(r => r.model.name);
    const data = sorted.map(r => +r.result.total.toFixed(8));
    const colors = sorted.map((r, i) =>
      i === 0 ? c.text : getProvider(r.model.provider)?.color || '#171717');
    const valueLabels = {
      id: 'valueLabels',
      afterDatasetsDraw(chart) {
        const ctx = chart.ctx;
        ctx.save();
        ctx.font = "10px " + MONO;
        ctx.textAlign = 'left';
        chart.data.datasets.forEach((ds, di) => {
          const meta = chart.getDatasetMeta(di);
          meta.data.forEach((bar, i) => {
            ctx.fillStyle = i === 0 ? c.text : c.axis;
            ctx.fillText((symbol || '$') + ds.data[i].toFixed(4), bar.x + 6, bar.y + 3);
          });
        });
        ctx.restore();
      }
    };
    make({
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Cost per request',
          data,
          backgroundColor: colors,
          borderRadius: 4,
          maxBarThickness: 16,
          borderWidth: 0
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: { display: false },
          tooltip: {
            ...tooltipBase(),
            callbacks: { label: ctx => ` ${(symbol || '$')}${ctx.parsed.x.toFixed(4)}` }
          }
        },
        scales: {
          x: {
            ticks: { color: c.axis, font: { family: MONO, size: 10 }, callback: v => (symbol || '$') + v.toFixed(3) },
            grid: { color: c.grid },
            border: { display: false }
          },
          y: {
            ticks: { color: c.axis, font: { family: MONO, size: 10 } },
            grid: { display: false },
            border: { color: c.grid }
          }
        }
      },
      plugins: [valueLabels]
    });
  }

  function renderMain(kind, payload) {
    if (!ready()) return;
    if (kind === 'projection') projection(payload);
    else if (kind === 'growth') growth(payload);
    else if (kind === 'compare') compare(payload);
    else if (kind === 'ranking') ranking(payload);
  }

  function destroy() {
    if (chart) { chart.destroy(); chart = null; }
  }

  return {
    ready,
    destroy,
    renderMain
  };
})();

function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '');
  if (h.length === 3) return hexToRgba(h.split('').map(c => c + c).join(''), alpha);
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export { Charts };