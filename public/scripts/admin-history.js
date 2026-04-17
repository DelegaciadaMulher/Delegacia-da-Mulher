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

function buildOriginalFileLink(file) {
  if (file && file.savedName) {
    return `/uploads/pdfs/${encodeURIComponent(file.savedName)}`;
  }

  return null;
}

function renderHistory() {
  const token = localStorage.getItem('adminAccessToken');
  if (!token) {
    window.location.href = '/admin';
    return;
  }

  const historyList = document.getElementById('historyList');
  const history = readImportHistory();

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
          <div class="history-file"><strong>Período:</strong> ${period && period.raw ? period.raw : '-'}</div>
          <div class="coverage-chart">${allDaysHtml}</div>
        </div>
      `;
    })
    .join('');
}

renderHistory();
