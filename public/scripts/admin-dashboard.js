function formatDateTime(isoDate) {
  if (!isoDate) {
    return '-';
  }

  return new Date(isoDate).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function renderList(container, items, renderItem) {
  if (!items || !items.length) {
    container.innerHTML = '<p class="muted">Sem registros.</p>';
    return;
  }

  container.innerHTML = items.map(renderItem).join('');
}

function toStartOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function addDays(date, amount) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
}

function formatDayLabel(date) {
  return date.toLocaleDateString('pt-BR');
}

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

function toMinuteOfDay(date) {
  return date.getHours() * 60 + date.getMinutes();
}

function formatMinute(minute) {
  const h = String(Math.floor(minute / 60)).padStart(2, '0');
  const m = String(minute % 60).padStart(2, '0');
  return `${h}:${m}`;
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

function minuteRangesToGaps(ranges) {
  if (!ranges.length) {
    return [{ start: 0, end: 1439 }];
  }

  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const merged = [];

  for (const range of sorted) {
    if (!merged.length) {
      merged.push({ ...range });
      continue;
    }

    const last = merged[merged.length - 1];
    if (range.start <= last.end + 1) {
      last.end = Math.max(last.end, range.end);
    } else {
      merged.push({ ...range });
    }
  }

  const gaps = [];
  let cursor = 0;

  for (const interval of merged) {
    if (interval.start > cursor) {
      gaps.push({ start: cursor, end: interval.start - 1 });
    }
    cursor = interval.end + 1;
  }

  if (cursor <= 1439) {
    gaps.push({ start: cursor, end: 1439 });
  }

  return gaps;
}

function rangesCoverageToDayRows(dayKey, ranges) {
  const dayDate = new Date(`${dayKey}T00:00:00`);
  const gaps = minuteRangesToGaps(ranges);
  const coveredDuration = 1440 - gaps.reduce((acc, gap) => acc + (gap.end - gap.start + 1), 0);
  const coveredPct = (coveredDuration / 1440) * 100;

  let coveredStart = 0;
  let coveredEnd = 1439;

  if (coveredDuration <= 0) {
    coveredStart = 0;
    coveredEnd = 0;
  } else {
    const sorted = [...ranges].sort((a, b) => a.start - b.start);
    coveredStart = sorted[0].start;
    coveredEnd = sorted[sorted.length - 1].end;
  }

  const beforePct = (coveredStart / 1440) * 100;
  const afterPct = ((1439 - coveredEnd) / 1440) * 100;

  return {
    date: dayDate,
    coveredStart,
    coveredEnd,
    coveredPct,
    beforePct,
    afterPct,
    gaps
  };
}

function buildAggregatedCoverageFromHistory(history) {
  const dayMap = new Map();

  for (const entry of history) {
    const period = entry && entry.period;
    if (!period || !period.iso || !period.iso.start || !period.iso.end) {
      continue;
    }

    const start = new Date(period.iso.start);
    const end = new Date(period.iso.end);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
      continue;
    }

    const dayRows = buildCoverageByDay(start, end);
    for (const row of dayRows) {
      const dayKey = row.date.toISOString().slice(0, 10);
      if (!dayMap.has(dayKey)) {
        dayMap.set(dayKey, []);
      }
      dayMap.get(dayKey).push({ start: row.coveredStart, end: row.coveredEnd });
    }
  }

  return [...dayMap.entries()]
    .map(([dayKey, ranges]) => rangesCoverageToDayRows(dayKey, ranges))
    .sort((a, b) => a.date - b.date);
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

function renderPeriodCoverage(history) {
  const chart = document.getElementById('coverageChart');
  const hint = document.getElementById('coverageHint');
  const aggregatedRows = buildAggregatedCoverageFromHistory(history || []);

  if (!aggregatedRows.length) {
    chart.innerHTML = '<p class="muted">Ainda sem período carregado do Livro de BOs.</p>';
    hint.textContent = '';
    return;
  }

  const incompleteRows = aggregatedRows.filter((day) => day.gaps.length > 0);
  chart.innerHTML = incompleteRows.length
    ? buildCoverageHtml(incompleteRows)
    : '<p class="muted">Todos os dias desse período estão completos.</p>';

  if (incompleteRows.length !== aggregatedRows.length) {
    hint.textContent = `${aggregatedRows.length - incompleteRows.length} dia(s) completo(s) ocultado(s). Use "Ver histórico" para ver todos os dias.`;
  } else {
    hint.textContent = '';
  }
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
  localStorage.setItem('boImportHistory', JSON.stringify(history.slice(0, 30)));
}

function readAdminUser() {
  try {
    const raw = localStorage.getItem('adminUser');
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function readDevPendingCases() {
  try {
    const raw = localStorage.getItem('devPendingExpectedCases');
    const value = Number(raw);
    return Number.isFinite(value) && value >= 0 ? value : 0;
  } catch (error) {
    return 0;
  }
}

function writeDevPendingCases(value) {
  const safeValue = Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : 0;
  localStorage.setItem('devPendingExpectedCases', String(safeValue));
}

function writeDevPendingBos(boEntries) {
  const list = Array.isArray(boEntries)
    ? boEntries
        .map((entry) => ({
          boNumber: entry && entry.boNumber ? String(entry.boNumber).trim() : '',
          flagrante: entry && entry.flagrante ? String(entry.flagrante).trim() : null,
          natureza: entry && entry.natureza ? String(entry.natureza).trim() : null,
          victim: entry && entry.victim ? String(entry.victim).trim() : null,
          author: entry && entry.author ? String(entry.author).trim() : null,
          local: entry && entry.local ? String(entry.local).trim() : null
        }))
        .filter((entry) => Boolean(entry.boNumber))
    : [];
  localStorage.setItem('devPendingBos', JSON.stringify(list));
}

function buildOriginalFileLink(file) {
  if (file && file.savedName) {
    return `/uploads/pdfs/${encodeURIComponent(file.savedName)}`;
  }

  return null;
}

function appendImportHistoryEntry(data) {
  const history = readImportHistory();
  const adminUser = readAdminUser();
  history.unshift({
    importedAt: new Date().toISOString(),
    period: data.period || null,
    file: data.file || null,
    uploadedBy: adminUser
      ? {
          fullName: adminUser.fullName || null,
          cpf: adminUser.cpf || null,
          role: adminUser.role || null
        }
      : null
  });
  writeImportHistory(history);
}


async function uploadBoPdf() {
  const token = localStorage.getItem('adminAccessToken');
  const fileInput = document.getElementById('boPdfFile');
  const fileNameEl = document.getElementById('boFileName');
  const statusEl = document.getElementById('boUploadStatus');
  const file = fileInput.files && fileInput.files[0];

  if (!file) {
    statusEl.textContent = 'Selecione um PDF antes de enviar.';
    return;
  }

  const formData = new FormData();
  formData.append('file', file);

  statusEl.textContent = 'Enviando PDF...';

  const response = await fetch('/api/pdfs/upload', {
    method: 'POST',
    headers: token
      ? {
          Authorization: `Bearer ${token}`
        }
      : undefined,
    body: formData
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    statusEl.textContent = data.error || 'Falha ao importar Livro de BOs.';
    return;
  }

  const boNumber = data && data.boBook ? data.boBook.boNumber || '-' : '-';
  const totalBos = Number(data && data.totalBosExtracted ? data.totalBosExtracted : 0);
  const totalPending = Number(data && data.pendingToAttachFiles ? data.pendingToAttachFiles : 0);
  if (totalBos > 1) {
    statusEl.textContent = `Importacao concluida. ${totalBos} BOs extraidos e ${totalPending} pendencias de inserir arquivos criadas.`;
  } else {
    statusEl.textContent = `Importacao concluida. BO extraido: ${boNumber}. ${totalPending} pendencia(s) de inserir arquivos criada(s).`;
  }

  if (data && data.persistenceMode === 'mocked_without_database') {
    writeDevPendingCases(totalPending);
    writeDevPendingBos(data.boEntries || []);
  }

  if (data && data.period) {
    appendImportHistoryEntry(data);
    renderPeriodCoverage(readImportHistory());
  }

  try {
    await loadDashboard();
  } catch (error) {
    // Ignore dashboard refresh error; upload already succeeded.
  }

  fileInput.value = '';
  fileNameEl.textContent = 'Nenhum arquivo selecionado';
}

function setupBoUploaderInteractions() {
  const fileInput = document.getElementById('boPdfFile');
  const dropzone = document.getElementById('boDropzone');
  const fileNameEl = document.getElementById('boFileName');

  fileInput.addEventListener('change', () => {
    const file = fileInput.files && fileInput.files[0];
    fileNameEl.textContent = file ? file.name : 'Nenhum arquivo selecionado';
  });

  ['dragenter', 'dragover'].forEach((eventName) => {
    dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropzone.classList.add('drag-over');
    });
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropzone.classList.remove('drag-over');
    });
  });

  dropzone.addEventListener('drop', (event) => {
    const files = event.dataTransfer && event.dataTransfer.files;
    if (!files || !files.length) {
      return;
    }

    fileInput.files = files;
    const file = files[0];
    fileNameEl.textContent = file ? file.name : 'Nenhum arquivo selecionado';
  });
}

async function loadDashboard() {
  const token = localStorage.getItem('adminAccessToken');
  if (!token) {
    window.location.href = '/admin';
    return;
  }

  const response = await fetch('/api/admin/dashboard/overview', {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (response.status === 401 || response.status === 403) {
    localStorage.removeItem('adminAccessToken');
    window.location.href = '/admin';
    return;
  }

  if (!response.ok) {
    throw new Error('Falha ao carregar dashboard.');
  }

  const data = await response.json();

  if (data && data.mocked && data.pending) {
    data.pending.expectedCasesPending = readDevPendingCases();
  }

  const cards = document.getElementById('summaryCards');
  cards.innerHTML = [
    { label: 'Casos Hoje', value: data.casesOfDay.total },
    { label: 'Pend. Casos', value: data.pending.expectedCasesPending },
    { label: 'Pend. Intimacoes', value: data.pending.summonsPending },
    { label: 'Pend. Notificacoes', value: data.pending.notificationsPending }
  ].map((card) => `
    <div class="card">
      <div class="label">${card.label}</div>
      <div class="value">${card.value}</div>
    </div>
  `).join('');

  const pendingCard = cards.children[1];
  if (pendingCard) {
    pendingCard.classList.add('clickable-card');
    pendingCard.setAttribute('role', 'link');
    pendingCard.setAttribute('tabindex', '0');
    pendingCard.setAttribute('aria-label', 'Abrir lista de BOs pendentes');

    const goToPendingPage = () => {
      window.location.href = '/admin/pendencias';
    };

    pendingCard.addEventListener('click', goToPendingPage);
    pendingCard.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        goToPendingPage();
      }
    });
  }

  renderList(document.getElementById('casesList'), data.casesOfDay.items, (item) => `
    <div class="item">
      <strong>${item.protocolNumber}</strong>
      <div>${item.title}</div>
      <div class="muted">${item.status} | ${item.priority} | ${formatDateTime(item.openedAt)}</div>
    </div>
  `);

  renderList(document.getElementById('pendingList'), [data.pending], (item) => `
    <div class="item">
      <div><strong>Casos esperados:</strong> ${item.expectedCasesPending}</div>
      <div><strong>Intimacoes:</strong> ${item.summonsPending}</div>
      <div><strong>Notificacoes:</strong> ${item.notificationsPending}</div>
    </div>
  `);

  renderList(document.getElementById('agendaList'), data.agendaOfDay.items, (item) => `
    <div class="item">
      <strong>${item.personName}</strong>
      <div>${item.appointmentType} | ${item.personRole || '-'}</div>
      <div class="muted">${formatDateTime(item.startsAt)} ate ${formatDateTime(item.endsAt)} | ${item.status}</div>
    </div>
  `);

  renderList(document.getElementById('recurrenceList'), data.recurrence.items, (item) => `
    <div class="item">
      <strong>${item.personName}</strong>
      <div>CPF: ${item.cpf}</div>
      <div class="muted">${item.caseCount} casos distintos</div>
    </div>
  `);
}

document.getElementById('refreshBtn').addEventListener('click', () => {
  loadDashboard().catch((error) => {
    alert(error.message);
  });
});

document.getElementById('boUploadForm').addEventListener('submit', (event) => {
  event.preventDefault();
  uploadBoPdf().catch((error) => {
    const statusEl = document.getElementById('boUploadStatus');
    statusEl.textContent = error.message || 'Erro ao enviar PDF.';
  });
});

setupBoUploaderInteractions();

try {
  renderPeriodCoverage(readImportHistory());
} catch (error) {
  renderPeriodCoverage([]);
}

loadDashboard().catch((error) => {
  alert(error.message);
});
