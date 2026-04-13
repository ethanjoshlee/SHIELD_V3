/**
 * Chart rendering — lightweight HTML histograms.
 */

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function niceStep(rawStep) {
  if (!Number.isFinite(rawStep) || rawStep <= 0) return 1;
  const exponent = Math.floor(Math.log10(rawStep));
  const base = Math.pow(10, exponent);
  const fraction = rawStep / base;
  let niceFraction;
  if (fraction <= 1) niceFraction = 1;
  else if (fraction <= 2) niceFraction = 2;
  else if (fraction <= 5) niceFraction = 5;
  else niceFraction = 10;
  return niceFraction * base;
}

function nonZeroRatio(counts) {
  if (!counts.length) return 0;
  let nonZero = 0;
  for (const c of counts) {
    if (c > 0) nonZero += 1;
  }
  return nonZero / counts.length;
}

function buildCounts(minEdge, span, binCount, arr) {
  const counts = new Array(binCount).fill(0);
  for (const v of arr) {
    let idx = Math.floor(((v - minEdge) / span) * binCount);
    if (idx < 0) idx = 0;
    if (idx >= binCount) idx = binCount - 1;
    counts[idx] += 1;
  }
  return counts;
}

function buildContinuousBins(arr, opts) {
  let minV = Math.min(...arr);
  let maxV = Math.max(...arr);
  if (minV === maxV) {
    minV -= 0.5;
    maxV += 0.5;
  }
  const minBins = opts.minBins ?? 28;
  const maxBins = opts.maxBins ?? 56;
  const targetBins = opts.targetBins ?? Math.round(Math.sqrt(arr.length));
  const span = maxV - minV;
  const minNonZeroRatio = clamp(opts.minNonZeroRatio ?? 0.42, 0.1, 1);

  let binCount = clamp(targetBins, minBins, maxBins);
  let counts = [];
  while (true) {
    counts = buildCounts(minV, span, binCount, arr);
    const ratio = nonZeroRatio(counts);
    if (ratio >= minNonZeroRatio || binCount <= minBins) break;

    const nextBinCount = Math.max(minBins, Math.floor(binCount * 0.88));
    if (nextBinCount === binCount) {
      if (binCount <= minBins) break;
      binCount -= 1;
    } else {
      binCount = nextBinCount;
    }
  }
  const binWidth = span / binCount;

  return {
    counts,
    binCount,
    minEdge: minV,
    maxEdge: maxV,
    binWidth,
    xTickMin: minV,
    xTickMax: maxV,
    xIsInteger: false,
  };
}

function buildIntegerAlignedBins(arr, opts) {
  const minInt = Math.floor(Math.min(...arr));
  const maxInt = Math.ceil(Math.max(...arr));
  const maxBins = opts.maxBins ?? 72;
  const minNonZeroRatio = clamp(opts.minNonZeroRatio ?? 0.35, 0.1, 1);
  const minReadableBins = opts.minReadableBins ?? 18;
  const valueSpan = Math.max(1, maxInt - minInt + 1);

  // Preserve one-integer bins unless the observed span is wide enough that
  // one-bin-per-integer would exceed readability limits for the viewer width.
  let binWidth = valueSpan > maxBins ? Math.ceil(valueSpan / maxBins) : 1;
  let counts = [];
  let binCount = 0;
  let minEdge = 0;
  let maxEdge = 0;

  while (true) {
    binCount = Math.max(1, Math.ceil(valueSpan / binWidth));
    minEdge = minInt - 0.5;
    maxEdge = minEdge + binCount * binWidth;
    counts = new Array(binCount).fill(0);

    for (const raw of arr) {
      const v = Number(raw);
      if (!Number.isFinite(v)) continue;
      let idx = Math.floor((v - minEdge) / binWidth);
      if (idx < 0) idx = 0;
      if (idx >= binCount) idx = binCount - 1;
      counts[idx] += 1;
    }

    const ratio = nonZeroRatio(counts);
    if (ratio >= minNonZeroRatio || binCount <= minReadableBins) break;
    binWidth += 1;
  }

  return {
    counts,
    binCount,
    minEdge,
    maxEdge,
    binWidth,
    xTickMin: minInt,
    xTickMax: maxInt,
    xIsInteger: true,
  };
}

function sanitizePositiveNumber(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function snapToStepLevel(value, stepSize) {
  const rawLevel = value / stepSize;
  const snappedLevel = Math.round(rawLevel);
  const tolerance = Number.EPSILON * Math.max(1, Math.abs(rawLevel)) * 16;
  if (Math.abs(rawLevel - snappedLevel) <= tolerance) return snappedLevel;
  return snappedLevel;
}

function buildStepDiscreteBins(arr, opts) {
  const stepSize = sanitizePositiveNumber(opts?.stepSize, 1);
  const normalizedLevels = [];
  for (const raw of arr) {
    const value = Number(raw);
    if (!Number.isFinite(value)) continue;
    normalizedLevels.push(snapToStepLevel(value, stepSize));
  }

  const levelHistogram = buildIntegerAlignedBins(normalizedLevels, {
    maxBins: opts?.maxBins,
    minNonZeroRatio: opts?.minNonZeroRatio,
    minReadableBins: opts?.minReadableBins,
  });

  return {
    counts: levelHistogram.counts,
    binCount: levelHistogram.binCount,
    minEdge: levelHistogram.minEdge * stepSize,
    maxEdge: levelHistogram.maxEdge * stepSize,
    binWidth: levelHistogram.binWidth * stepSize,
    xTickMin: levelHistogram.xTickMin * stepSize,
    xTickMax: levelHistogram.xTickMax * stepSize,
    xIsInteger: Number.isInteger(stepSize),
    stepDiscrete: {
      stepSize,
      minLevel: levelHistogram.xTickMin,
      binWidthLevels: levelHistogram.binWidth,
    },
  };
}

function buildTicks(min, max, targetCount, forceInteger = false) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0];
  if (min === max) return [min];

  const span = max - min;
  let step = niceStep(span / Math.max(2, targetCount - 1));
  if (forceInteger) {
    step = Math.max(1, Math.round(step));
  }

  const start = Math.ceil(min / step) * step;
  const ticks = [];
  for (let v = start; v <= max + step * 0.5; v += step) {
    const rounded = forceInteger ? Math.round(v) : Number(v.toFixed(10));
    if (rounded >= min - step * 0.01 && rounded <= max + step * 0.01) {
      ticks.push(rounded);
    }
  }
  if (!ticks.length) ticks.push(forceInteger ? Math.round(min) : min);
  if (ticks[0] > min && forceInteger) ticks.unshift(Math.round(min));
  if (ticks[ticks.length - 1] < max && forceInteger) ticks.push(Math.round(max));
  return Array.from(new Set(ticks));
}

function formatTick(value, forceInteger = false) {
  if (forceInteger) return Math.round(value).toLocaleString('en-US');
  if (Math.abs(value) >= 1000) return Math.round(value).toLocaleString('en-US');
  if (Math.abs(value) >= 100) return value.toFixed(0);
  if (Math.abs(value) >= 10) return value.toFixed(1);
  return value.toFixed(1);
}

function formatBinEdge(value, forceInteger = false) {
  if (forceInteger) return Math.round(value).toLocaleString('en-US');
  if (Math.abs(value) >= 1000) return Math.round(value).toLocaleString('en-US');
  if (Math.abs(value) >= 100) return value.toFixed(1);
  return value.toFixed(2);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function escapeHtmlAttr(value) {
  return escapeHtml(value).replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function formatReferenceValueKt(value) {
  return Number(value).toLocaleString('en-US', { maximumFractionDigits: 3 });
}

function isNuclearReferenceCategory(category) {
  const normalized = String(category ?? '').toLowerCase();
  return normalized === 'nuclear' || normalized.startsWith('nuclear_');
}

function categoryDescription(category) {
  if (isNuclearReferenceCategory(category)) return 'Nuclear yield/aggregate benchmark';
  return 'Conventional bomb/ordnance mass benchmark (mass converted using 1,000 tons = 1 kt)';
}

function shortReferenceLabel(label) {
  const base = String(label).split(' (')[0].trim();
  if (base.length <= 26) return base;
  return `${base.slice(0, 23)}...`;
}

function selectVisibleReferenceMarkers(candidates, maxVisible) {
  if (candidates.length <= maxVisible) return candidates.slice();

  const selectedIndices = new Set();
  if (maxVisible <= 1) {
    selectedIndices.add(Math.floor((candidates.length - 1) / 2));
  } else {
    for (let i = 0; i < maxVisible; i++) {
      const idx = Math.round((i * (candidates.length - 1)) / (maxVisible - 1));
      selectedIndices.add(idx);
    }
  }

  if (selectedIndices.size < maxVisible) {
    for (let i = 0; i < candidates.length && selectedIndices.size < maxVisible; i++) {
      selectedIndices.add(i);
    }
  }

  return Array.from(selectedIndices)
    .sort((a, b) => a - b)
    .map((idx) => candidates[idx]);
}

function selectFallbackAnchorMarkers(referenceMarkers, axisMax, plotMin, plotMax) {
  if (!Array.isArray(referenceMarkers) || !referenceMarkers.length) return [];
  const eligible = referenceMarkers
    .map((marker) => {
      const valueKt = Number(marker?.valueKt);
      if (!Number.isFinite(valueKt)) return null;
      if (valueKt > axisMax) return null;
      return {
        ...marker,
        valueKt,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (b.valueKt - a.valueKt) || String(a.id).localeCompare(String(b.id)));
  if (!eligible.length) return [];

  const plotSpan = plotMax - plotMin;
  const toAnchor = (marker, rank) => {
    const rawPct = plotSpan > 0 ? ((marker.valueKt - plotMin) / plotSpan) * 100 : 0;
    return {
      ...marker,
      pct: clamp(rawPct, 0, 100),
      rawPct,
      isFallbackAnchor: true,
      fallbackAnchorRank: rank,
    };
  };

  const anchors = [toAnchor(eligible[0], 1)];

  // In very large-domain views, preserve one additional large-scale anchor line
  // below the top protected anchor for scale interpretation.
  if (eligible.length >= 2 && anchors[0].rawPct < 1) {
    const second = toAnchor(eligible[1], 2);
    const domainVsSecond = plotMin > 0 ? plotMin / Math.max(1e-9, second.valueKt) : 0;
    if (domainVsSecond >= 5) anchors.push(second);
  }

  return anchors;
}

function applyProtectedAnchorJitter(markers, opts = {}) {
  if (!Array.isArray(markers) || markers.length < 2) return markers;
  const jitterStepPx = clamp(Number(opts?.referenceProtectedAnchorJitterPx) || 4, 1, 8);

  const protectedNearLeft = markers
    .filter((marker) => marker.isFallbackAnchor && marker.pct <= 0.5)
    .sort((a, b) => (a.valueKt - b.valueKt) || String(a.id).localeCompare(String(b.id)));

  if (protectedNearLeft.length < 2) return markers;
  for (let i = 0; i < protectedNearLeft.length; i++) {
    protectedNearLeft[i].visualOffsetPx = i * jitterStepPx;
  }
  return markers;
}

function resolveReferenceMarkers(referenceMarkers, chartDomain, opts = {}) {
  if (!Array.isArray(referenceMarkers) || !referenceMarkers.length) return [];
  const { axisMin, axisMax, plotMin, plotMax } = chartDomain;
  if (!Number.isFinite(axisMin) || !Number.isFinite(axisMax) || axisMax < axisMin) return [];
  if (!Number.isFinite(plotMin) || !Number.isFinite(plotMax) || plotMax <= plotMin) return [];

  const maxVisible = Math.max(1, Math.round(Number(opts?.maxVisibleReferenceMarkers) || 7));
  const maxLabels = Math.max(0, Math.round(Number(opts?.maxVisibleReferenceLabels) || 4));
  const minLabelGapPct = clamp(Number(opts?.referenceLabelMinGapPct) || 10, 2, 100);
  const plotSpan = plotMax - plotMin;

  const candidates = referenceMarkers
    .map((marker) => {
      const valueKt = Number(marker?.valueKt);
      if (!Number.isFinite(valueKt)) return null;
      if (valueKt < axisMin || valueKt > axisMax) return null;
      const pct = ((valueKt - plotMin) / plotSpan) * 100;
      if (!Number.isFinite(pct) || pct < 0 || pct > 100) return null;
      return {
        ...marker,
        valueKt,
        pct,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (a.valueKt - b.valueKt) || String(a.id).localeCompare(String(b.id)));

  let visible = selectVisibleReferenceMarkers(candidates, maxVisible);
  if (!visible.length) {
    const fallbackAnchors = selectFallbackAnchorMarkers(referenceMarkers, axisMax, plotMin, plotMax);
    if (fallbackAnchors.length) visible = fallbackAnchors;
  } else if (visible.length === 1) {
    const fallbackAnchors = selectFallbackAnchorMarkers(referenceMarkers, axisMax, plotMin, plotMax);
    if (fallbackAnchors.length >= 2) {
      const existingIds = new Set(visible.map((marker) => String(marker.id)));
      for (const anchor of fallbackAnchors) {
        if (existingIds.has(String(anchor.id))) continue;
        visible.push(anchor);
        if (visible.length >= maxVisible) break;
      }
      visible.sort((a, b) => (a.valueKt - b.valueKt) || String(a.id).localeCompare(String(b.id)));
    }
  }
  visible = applyProtectedAnchorJitter(visible, opts);
  let labelsUsed = 0;
  let lastLabeledPct = -Infinity;

  return visible.map((marker, idx) => {
    let showLabel = false;
    if (maxLabels > 0) {
      const farEnough = marker.pct - lastLabeledPct >= minLabelGapPct;
      const isFirst = idx === 0;
      if ((isFirst || farEnough) && labelsUsed < maxLabels) {
        showLabel = true;
        labelsUsed += 1;
        lastLabeledPct = marker.pct;
      }
    }
    return {
      ...marker,
      showLabel,
      shortLabel: shortReferenceLabel(marker.label),
    };
  });
}

function buildReferenceTooltip(marker) {
  const lines = [
    `${marker.label}`,
    `Value: ${formatReferenceValueKt(marker.valueKt)} kt`,
    `Type: ${categoryDescription(marker.category)}`,
    `Scope: ${marker.scope}`,
    `Source measure: ${marker.sourceMeasure}`,
    `Source note: ${marker.sourceNote}`,
    `Source: ${marker.sourceUrl}`,
  ];
  if (marker.isFallbackAnchor && marker.rawPct < 0) {
    lines.push('Display note: benchmark is below the visible x-domain; anchored at left edge for scale context.');
  }
  if (Number(marker.visualOffsetPx) !== 0) {
    lines.push(`Display note: line shifted ${marker.visualOffsetPx}px right for visibility; value remains exact.`);
  }
  return lines.join('\n');
}

function buildReferenceMarkersHtml(referenceMarkers, chartDomain, opts = {}) {
  const resolved = resolveReferenceMarkers(referenceMarkers, chartDomain, opts);
  if (!resolved.length) return '';

  const markersHtml = resolved
    .map((marker) => {
      const edgeClass =
        marker.pct <= 4
          ? ' chart-reference-marker--start'
          : marker.pct >= 96
            ? ' chart-reference-marker--end'
            : '';
      const kindClass = isNuclearReferenceCategory(marker.category)
        ? ' chart-reference-marker--nuclear'
        : ' chart-reference-marker--conventional';
      const tooltipText = buildReferenceTooltip(marker);
      const tooltipAttr = escapeHtmlAttr(tooltipText);
      const tooltipHtml = escapeHtml(tooltipText);
      const labelHtml = marker.showLabel
        ? `<span class="chart-reference-marker-label">${escapeHtml(marker.shortLabel)}</span>`
        : '';

      return `
        <div class="chart-reference-marker${edgeClass}${kindClass}" style="left:${marker.pct}%;--chart-reference-marker-jitter:${Number(marker.visualOffsetPx) || 0}px">
          <span class="chart-reference-marker-line"></span>
          ${labelHtml}
          <span class="chart-reference-marker-hit" tabindex="0" title="${tooltipAttr}" aria-label="${tooltipAttr}">
            <span class="chart-reference-marker-tooltip">${tooltipHtml}</span>
          </span>
        </div>`;
    })
    .join("");

  return `<div class="chart-reference-markers">${markersHtml}</div>`;
}

function resolveVisualSubBins(parentBinCount, opts = {}) {
  const minSubBins = Math.round(clamp(opts?.minVisualSubBins ?? 1, 1, 24));
  const maxSubBins = Math.round(clamp(opts?.maxVisualSubBins ?? 8, minSubBins, 24));
  const targetVisualSlots = Number(opts?.targetVisualSlots);
  if (Number.isFinite(targetVisualSlots) && targetVisualSlots > 0 && parentBinCount > 0) {
    const desired = Math.round(targetVisualSlots / parentBinCount);
    return clamp(desired, minSubBins, maxSubBins);
  }
  const fallbackRaw = Number(opts?.visualSubBins ?? opts?.integerVisualSubBins ?? 1);
  const fallback = Number.isFinite(fallbackRaw) ? fallbackRaw : 1;
  return clamp(Math.round(fallback), minSubBins, maxSubBins);
}

/**
 * Make a lightweight histogram (HTML bars) for an array of numbers.
 * @param {number[]} arr
 * @param {number} bins
 * @param {string} title
 * @param {Object} opts
 */
export function renderHistogramHTML(arr, bins, title, opts = {}) {
  const height =
    opts && opts.height !== undefined && opts.height !== null
      ? opts.height
      : 140;
  const showTitle = opts?.showTitle !== false;
  const xLabel = opts?.xLabel ?? title;
  const yLabel = opts?.yLabel ?? 'Number of Trials';
  const binStrategy = opts?.binStrategy ?? 'continuous';

  if (!arr || arr.length === 0) {
    return `<div class="chart">${showTitle ? `<div class="chart-title">${title}</div>` : ''}<div class="chart-empty">No data</div></div>`;
  }

  const histogram =
    binStrategy === 'integer'
      ? buildIntegerAlignedBins(arr, {
          maxBins: opts?.integerMaxBins ?? 72,
          minNonZeroRatio: opts?.integerMinNonZeroRatio ?? 0.35,
          minReadableBins: opts?.integerMinReadableBins ?? 18,
        })
      : binStrategy === 'step-discrete'
        ? buildStepDiscreteBins(arr, {
            stepSize: opts?.stepSize,
            maxBins: opts?.integerMaxBins ?? 72,
            minNonZeroRatio: opts?.integerMinNonZeroRatio ?? 0.35,
            minReadableBins: opts?.integerMinReadableBins ?? 18,
          })
      : buildContinuousBins(arr, {
          minBins: opts?.continuousMinBins ?? 48,
          maxBins: opts?.continuousMaxBins ?? 88,
          targetBins: bins,
          minNonZeroRatio: opts?.continuousMinNonZeroRatio ?? 0.42,
        });
  const { counts, minEdge, maxEdge, binWidth, xTickMin, xTickMax, xIsInteger, stepDiscrete } = histogram;
  const visualSubBins = resolveVisualSubBins(counts.length, opts);

  const maxC = Math.max(...counts);
  const yHeadroom = opts?.yHeadroom ?? 0.12;
  const yTargetTicks = opts?.yTargetTicks ?? 5;
  const paddedYMax = Math.max(1, maxC * (1 + yHeadroom));
  const yStep = Math.max(1, niceStep(paddedYMax / Math.max(2, yTargetTicks - 1)));
  const yMax = Math.ceil(paddedYMax / yStep) * yStep;
  const yTicks = buildTicks(0, yMax, yTargetTicks, true);

  // Target ~5 major ticks with "nice" spacing; this may yield 4–7 ticks
  // depending on data range for cleaner labels.
  const xTicks = buildTicks(xTickMin, xTickMax, opts?.xTargetTicks ?? 6, xIsInteger);
  const xSpan = maxEdge - minEdge;
  const referenceMarkersHtml = buildReferenceMarkersHtml(
    opts?.referenceMarkers,
    {
      axisMin: Math.min(xTickMin, xTickMax),
      axisMax: Math.max(xTickMin, xTickMax),
      plotMin: minEdge,
      plotMax: maxEdge,
    },
    opts
  );

  const barsHtml = counts
    .map((c, i) => {
      const barH = yMax > 0 ? Math.max(0, (c / yMax) * 100) : 0;
      const labelLo = minEdge + i * binWidth;
      const labelHi = labelLo + binWidth;
      let tooltip;
      if (binStrategy === 'step-discrete' && stepDiscrete) {
        const levelStart = stepDiscrete.minLevel + i * stepDiscrete.binWidthLevels;
        const levelEnd = levelStart + stepDiscrete.binWidthLevels - 1;
        const levelStartText = levelStart.toLocaleString('en-US');
        const levelEndText = levelEnd.toLocaleString('en-US');
        const ktLow = levelStart * stepDiscrete.stepSize;
        const ktHigh = levelEnd * stepDiscrete.stepSize;
        const valueIsInteger =
          Number.isInteger(stepDiscrete.stepSize) &&
          Number.isInteger(ktLow) &&
          Number.isInteger(ktHigh);
        const ktLowText = formatBinEdge(ktLow, valueIsInteger);
        const ktHighText = formatBinEdge(ktHigh, valueIsInteger);
        const stepText = formatBinEdge(stepDiscrete.stepSize, Number.isInteger(stepDiscrete.stepSize));
        const levelsText =
          levelStart === levelEnd ? `${levelStartText}` : `${levelStartText}-${levelEndText}`;
        const deliveredText =
          levelStart === levelEnd
            ? `${ktLowText} kt`
            : `${ktLowText}-${ktHighText} kt (in ${stepText}-kt steps)`;
        tooltip = `${title}\nLevels: ${levelsText}\nDelivered: ${deliveredText}\nCount: ${c.toLocaleString('en-US')}`;
      } else {
        const loText = formatBinEdge(labelLo, xIsInteger);
        const hiText = formatBinEdge(labelHi, xIsInteger);
        const isFinalBin = i === counts.length - 1;
        const intervalText = isFinalBin
          ? `[${loText}, ${hiText}]`
          : `[${loText}, ${hiText})`;
        tooltip = `${title}\nBin: ${intervalText}\nCount: ${c.toLocaleString('en-US')}`;
      }
      return `
        <div class="chart-parent-bin" title="${tooltip}" style="--bin-height:${barH}%">
          ${'<span class="chart-bin-segment"></span>'.repeat(visualSubBins)}
        </div>
      `;
    })
    .join("");
  const yTicksHtml = yTicks
    .map((tick) => {
      const pct = yMax > 0 ? (tick / yMax) * 100 : 0;
      return `
        <div class="chart-y-tick" style="bottom:${pct}%">
          <span class="chart-y-tick-label">${formatTick(tick, true)}</span>
        </div>`;
    })
    .join("");
  const gridLinesHtml = yTicks
    .map((tick) => {
      const pct = yMax > 0 ? (tick / yMax) * 100 : 0;
      return `<div class="chart-grid-line" style="bottom:${pct}%"></div>`;
    })
    .join("");
  const xTicksHtml = xTicks
    .map((tick) => {
      const pct = xSpan > 0 ? ((tick - minEdge) / xSpan) * 100 : 0;
      const edgeClass =
        pct <= 2
          ? ' chart-x-tick--start'
          : pct >= 98
            ? ' chart-x-tick--end'
            : '';
      return `
        <div class="chart-x-tick${edgeClass}" style="left:${pct}%">
          <span class="chart-x-tick-mark"></span>
          <span class="chart-x-tick-label">${formatTick(tick, xIsInteger)}</span>
        </div>`;
    })
    .join("");

  return `
    <div class="chart">
      ${showTitle ? `<div class="chart-title">${title}</div>` : ''}
      <div class="chart-canvas" style="height:${height}px">
        <div class="chart-y-axis-label">${yLabel}</div>
        <div class="chart-plot-area">
          <div class="chart-grid-lines">
            ${gridLinesHtml}
          </div>
          <div class="chart-bars">
            ${barsHtml}
          </div>
          ${referenceMarkersHtml}
          <div class="chart-y-ticks">
            ${yTicksHtml}
          </div>
        </div>
        <div class="chart-x-ticks">
          ${xTicksHtml}
        </div>
        <div class="chart-x-axis-label">${xLabel}</div>
      </div>
    </div>
  `;
}
