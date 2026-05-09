export function renderJson(snapshot) {
  return JSON.stringify(snapshot, null, 2);
}

export function renderText(snapshot, options = {}) {
  const ascii = Boolean(options.ascii);
  const lines = [];
  const limits = snapshot.rateLimits;
  const usage = snapshot.usage;

  lines.push(`Codex usage (${limits.planType ?? 'unknown plan'})`);
  lines.push('');
  lines.push(renderLimit('5 hours', limits.primary, { ascii }));
  lines.push(renderLimit('7 days', limits.secondary, { ascii }));

  if (usage) {
    lines.push('');

    if (usage.totalTokens !== null) {
      lines.push(`tokens   ${formatNumber(usage.totalTokens)} total`);
    }

    if (usage.lastTurnTokens !== null) {
      lines.push(`last     ${formatNumber(usage.lastTurnTokens)} tokens`);
    }

    if (usage.contextWindow !== null) {
      lines.push(`context  ${formatNumber(usage.contextWindow)} tokens`);
    }
  }

  lines.push('');
  lines.push(`updated  ${formatDateTime(snapshot.updatedAt)}`);
  lines.push(`source   ${snapshot.sessionFile}`);

  return lines.join('\n');
}

export function renderLimit(label, value, options = {}) {
  if (!value) {
    return `${label.padEnd(8)} no data`;
  }

  const percent = formatPercent(value.usedPercent).padStart(6);
  const reset = value.resetsAt ? formatDateTime(new Date(value.resetsAt * 1000).toISOString()) : 'unknown';
  return `${label.padEnd(8)} ${percent}  ${renderBar(value.usedPercent, { ascii: options.ascii })}  reset: ${reset}`;
}

export function renderBar(percent, options = {}) {
  const width = options.width ?? 28;
  const normalized = Math.max(0, Math.min(100, Number(percent) || 0));
  const filled = Math.round((normalized / 100) * width);
  const empty = width - filled;

  if (options.ascii) {
    return `${'#'.repeat(filled)}${'-'.repeat(empty)}`;
  }

  return `${'█'.repeat(filled)}${'░'.repeat(empty)}`;
}

export function formatDateTime(value, locale = undefined) {
  if (value === null || value === undefined || value === '') {
    return 'unknown';
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'unknown';
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(date);
}

function formatNumber(value) {
  return Number(value).toLocaleString();
}

function formatPercent(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return '0%';
  }

  if (Number.isInteger(number)) {
    return `${number}%`;
  }

  return `${number.toFixed(1)}%`;
}
