function formatDateTimeFull(isoDate) {
  if (!isoDate) {
    return '-';
  }

  return new Date(isoDate).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function formatDayLabel(date) {
  return date.toLocaleDateString('pt-BR');
}

function formatMinute(minute) {
  const h = String(Math.floor(minute / 60)).padStart(2, '0');
  const m = String(minute % 60).padStart(2, '0');
  return `${h}:${m}`;
}

function toStartOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function addDays(date, amount) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
}

function toMinuteOfDay(date) {
  return date.getHours() * 60 + date.getMinutes();
}

function buildCoverageByDay(startDate, endDate) {
  const days = [];
  let current = toStartOfDay(startDate);
  const endDay = toStartOfDay(endDate);

  while (current.getTime() <= endDay.getTime()) {
    const isStartDay = current.toDateString() === startDate.toDateString();
    const isEndDay = current.toDateString() === endDate.toDateString();

    const coveredStart = isStartDay ? toMinuteOfDay(startDate) : 0;
    const coveredEnd = isEndDay ? toMinuteOfDay(endDate) : 1439;

    const gaps = [];
    if (coveredStart > 0) {
      gaps.push({ start: 0, end: coveredStart - 1 });
    }
    if (coveredEnd < 1439) {
      gaps.push({ start: coveredEnd + 1, end: 1439 });
    }

    const coveredDuration = Math.max(0, coveredEnd - coveredStart + 1);
    const coveredPct = (coveredDuration / 1440) * 100;
    const beforePct = (coveredStart / 1440) * 100;
    const afterPct = ((1439 - coveredEnd) / 1440) * 100;

    days.push({
      date: new Date(current),
      coveredStart,
      coveredEnd,
      coveredPct,
      beforePct,
      afterPct,
      gaps
    });

    current = addDays(current, 1);
  }

  return days;
}

function buildCoverageHtml(dayRows) {
  return dayRows
    .map((day) => {
      const gapsText = day.gaps.length
        ? day.gaps.map((g) => `${formatMinute(g.start)} às ${formatMinute(g.end)}`).join(' e ')
        : 'Sem lacunas no dia.';

      return `
        <div class="coverage-day">
          <div class="coverage-day-header">
            <strong>${formatDayLabel(day.date)}</strong>
            <span>Coberto: ${formatMinute(day.coveredStart)} às ${formatMinute(day.coveredEnd)}</span>
          </div>
          <div class="coverage-bar">
            ${day.beforePct > 0 ? `<div class="coverage-segment-missing" style="width:${day.beforePct}%;"></div>` : ''}
            ${day.coveredPct > 0 ? `<div class="coverage-segment-covered" style="width:${day.coveredPct}%;"></div>` : ''}
            ${day.afterPct > 0 ? `<div class="coverage-segment-missing" style="width:${day.afterPct}%;"></div>` : ''}
          </div>
          <div class="coverage-gaps"><strong>Faltando:</strong> ${gapsText}</div>
        </div>
      `;
    })
    .join('');
}

function readImportHistory() {
  try {
    const raw = localStorage.getItem('boImportHistory');
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    return [];
  }
}

function writeImportHistory(history) {
  localStorage.setItem('boImportHistory', JSON.stringify((history || []).slice(0, 30)));
}

function toIsoOrNull(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function buildPeriodLabel(startIso, endIso) {
  const start = toIsoOrNull(startIso);
  const end = toIsoOrNull(endIso);

  if (!start || !end) {
    return null;
  }

  const startDate = new Date(start);
  const endDate = new Date(end);
  const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  return `${dateFormatter.format(startDate)} às ${timeFormatter.format(startDate)} até ${dateFormatter.format(endDate)} às ${timeFormatter.format(endDate)}`;
}

function normalizeImportHistoryEntry(entry) {
  const periodIso = entry && entry.period && entry.period.iso ? entry.period.iso : {};
  const start = toIsoOrNull(periodIso.start);
  const end = toIsoOrNull(periodIso.end);

  return {
    importedAt: toIsoOrNull(entry && entry.importedAt),
    period: {
      raw: entry && entry.period && entry.period.raw ? entry.period.raw : buildPeriodLabel(start, end),
      iso: {
        start,
        end
      }
    },
    file: {
      originalName: entry && entry.file && entry.file.originalName ? entry.file.originalName : null,
      savedName: entry && entry.file && entry.file.savedName ? entry.file.savedName : null
    },
    uploadedBy: entry && entry.uploadedBy ? entry.uploadedBy : null
  };
}

function buildHistoryEntryKey(entry) {
  const normalized = normalizeImportHistoryEntry(entry);
  return [
    normalized.file.originalName || '',
    normalized.period.iso.start || '',
    normalized.period.iso.end || ''
  ].join('|');
}

function mergeImportHistories(primaryHistory, secondaryHistory) {
  const merged = new Map();

  for (const item of Array.isArray(primaryHistory) ? primaryHistory : []) {
    const normalized = normalizeImportHistoryEntry(item);
    merged.set(buildHistoryEntryKey(normalized), normalized);
  }

  for (const item of Array.isArray(secondaryHistory) ? secondaryHistory : []) {
    const normalized = normalizeImportHistoryEntry(item);
    const key = buildHistoryEntryKey(normalized);
    const existing = merged.get(key);

    if (!existing) {
      merged.set(key, normalized);
      continue;
    }

    merged.set(key, {
      ...existing,
      importedAt: existing.importedAt || normalized.importedAt,
      file: {
        originalName: existing.file.originalName || normalized.file.originalName,
        savedName: existing.file.savedName || normalized.file.savedName
      },
      uploadedBy: existing.uploadedBy || normalized.uploadedBy,
      period: {
        raw: existing.period.raw || normalized.period.raw,
        iso: {
          start: existing.period.iso.start || normalized.period.iso.start,
          end: existing.period.iso.end || normalized.period.iso.end
        }
      }
    });
  }

  return [...merged.values()]
    .sort((left, right) => new Date(right.importedAt || 0).getTime() - new Date(left.importedAt || 0).getTime())
    .slice(0, 30);
}

async function fetchImportHistory() {
  const token = localStorage.getItem('adminAccessToken');
  if (!token) {
    window.location.href = '/admin';
    return [];
  }

  const response = await fetch('/api/admin/dashboard/import-history', {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (response.status === 401 || response.status === 403) {
    localStorage.removeItem('adminAccessToken');
    window.location.href = '/admin';
    return [];
  }

  if (!response.ok) {
    throw new Error('Erro ao carregar historico de importacoes.');
  }

  const data = await response.json();
  return mergeImportHistories(data.items || [], readImportHistory());
}

function buildOriginalFileLink(file) {
  if (file && file.savedName) {
    return `/uploads/pdfs/${encodeURIComponent(file.savedName)}`;
  }

  return null;
}

async function renderHistory() {
  const token = localStorage.getItem('adminAccessToken');
  if (!token) {
    window.location.href = '/admin';
    return;
  }

  const historyList = document.getElementById('historyList');
  let history = [];

  try {
    history = await fetchImportHistory();
    writeImportHistory(history);
  } catch (error) {
    history = readImportHistory();
  }

  if (!history.length) {
    historyList.innerHTML = '<p class="muted">Sem histórico de importações.</p>';
    return;
  }

  historyList.innerHTML = history
    .map((entry, index) => {
      const period = entry.period;
      const file = entry.file;
      const uploadedBy = entry.uploadedBy || null;
      const fileLink = buildOriginalFileLink(file);
      const periodLabel = period && period.raw
        ? period.raw
        : buildPeriodLabel(period && period.iso ? period.iso.start : null, period && period.iso ? period.iso.end : null);

      let allDaysHtml = '<p class="muted">Período indisponível.</p>';
      if (period && period.iso && period.iso.start && period.iso.end) {
        const dayRows = buildCoverageByDay(new Date(period.iso.start), new Date(period.iso.end));
        allDaysHtml = buildCoverageHtml(dayRows);
      }

      return `
        <div class="history-item">
          <div class="history-meta">
            <span><strong>Importado em:</strong> ${formatDateTimeFull(entry.importedAt)}</span>
            <span>#${index + 1}</span>
          </div>
          <div class="history-file">
            <strong>Arquivo:</strong> ${file && file.originalName ? file.originalName : 'não informado'}
            ${fileLink ? ` | <a class="history-link" href="${fileLink}" target="_blank" rel="noopener noreferrer">ver arquivo original</a>` : ''}
          </div>
          <div class="history-file"><strong>Usuário:</strong> ${uploadedBy && uploadedBy.fullName ? uploadedBy.fullName : 'não identificado'}${uploadedBy && uploadedBy.cpf ? ` (CPF ${uploadedBy.cpf})` : ''}</div>
          <div class="history-file"><strong>Período:</strong> ${periodLabel || '-'}</div>
          <div class="coverage-chart">${allDaysHtml}</div>
        </div>
      `;
    })
    .join('');
}

renderHistory();
