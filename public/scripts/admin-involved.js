function valueOrDash(value) {
  const text = value == null ? '' : String(value).trim();
  return text || '-';
}

function normalizeDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function normalizeLower(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeSearchText(value) {
  return normalizeLower(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function formatCpf(value) {
  const digits = normalizeDigits(value);
  if (digits.length !== 11) {
    return valueOrDash(value);
  }

  return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
}

function renderRoleBadges(roles) {
  return (Array.isArray(roles) ? roles : [])
    .map((role) => `<span class="role-chip">${valueOrDash(role)}</span>`)
    .join('');
}

const involvedState = {
  allItems: []
};

function filterInvolvedItems(items, query) {
  const normalizedQuery = normalizeSearchText(query);
  const digitsQuery = normalizeDigits(query);

  if (!normalizedQuery && !digitsQuery) {
    return items;
  }

  return items.filter((item) => {
    const values = [
      item.fullName,
      item.cpf,
      Array.isArray(item.roles) ? item.roles.join(' ') : '',
      Array.isArray(item.boNumbers) ? item.boNumbers.join(' ') : '',
      Array.isArray(item.naturezas) ? item.naturezas.join(' ') : ''
    ];

    const textMatch = normalizedQuery
      ? values.some((value) => normalizeSearchText(value).includes(normalizedQuery))
      : false;
    const digitsMatch = digitsQuery
      ? [item.cpf, Array.isArray(item.boNumbers) ? item.boNumbers.join(' ') : '']
        .some((value) => normalizeDigits(value).includes(digitsQuery))
      : false;

    return textMatch || digitsMatch;
  });
}

function renderInvolvedList(items, query = '') {
  const container = document.getElementById('involvedList');

  if (!Array.isArray(items) || !items.length) {
    container.innerHTML = query
      ? '<article class="item involved-card empty-state-card"><strong>Nenhum envolvido encontrado</strong><div class="involved-meta">Tente ajustar a pesquisa para encontrar o registro desejado.</div></article>'
      : '<p class="muted">Nenhum envolvido encontrado no momento.</p>';
    return;
  }

  container.innerHTML = items
    .map((item) => {
      const boLabel = Array.isArray(item.boNumbers) && item.boNumbers.length
        ? item.boNumbers.join(', ')
        : '-';
      const natureLabel = Array.isArray(item.naturezas) && item.naturezas.length
        ? item.naturezas.join(' | ')
        : '-';
      const recurrenceLabel = item.isRecurrent
        ? `Reincidente ${item.recurrenceCount} ${item.recurrenceCount === 1 ? 'vez' : 'vezes'}`
        : 'Sem reincidencia';

      return `
        <article class="item involved-card ${item.isRecurrent ? 'involved-card-recurrent' : ''}">
          <div class="involved-card-header">
            <div>
              <div class="eyebrow">Envolvido</div>
              <strong>${valueOrDash(item.fullName)}</strong>
            </div>
            <span class="status-chip ${item.isRecurrent ? 'status-chip-recurrent' : ''}">${recurrenceLabel}</span>
          </div>
          <div class="role-row">${renderRoleBadges(item.roles)}</div>
          <div class="involved-meta"><strong>CPF:</strong> ${formatCpf(item.cpf)}</div>
          <div class="involved-meta"><strong>BOs:</strong> ${boLabel}</div>
          <div class="involved-meta"><strong>Total de BOs:</strong> ${valueOrDash(item.boCount)}</div>
          <div class="involved-meta"><strong>Naturezas:</strong> ${natureLabel}</div>
        </article>
      `;
    })
    .join('');
}

function applyInvolvedFilter() {
  const input = document.getElementById('involvedSearchInput');
  const query = input ? input.value : '';
  const filteredItems = filterInvolvedItems(involvedState.allItems, query);

  document.getElementById('involvedVisibleCount').textContent = String(filteredItems.length);
  renderInvolvedList(filteredItems, query);
}

async function loadInvolvedPage() {
  const token = localStorage.getItem('adminAccessToken');
  if (!token) {
    window.location.href = '/admin';
    return;
  }

  const response = await fetch('/api/admin/dashboard/involved-people', {
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
    throw new Error('Falha ao carregar envolvidos.');
  }

  const data = await response.json();
  const items = Array.isArray(data && data.items)
    ? data.items
    : [];
  const total = Number(data && data.total);
  const recurrentTotal = Number(data && data.recurrentTotal);

  involvedState.allItems = items;
  document.getElementById('involvedCount').textContent = String(Number.isFinite(total) ? total : items.length);
  document.getElementById('recurrentCount').textContent = String(Number.isFinite(recurrentTotal) ? recurrentTotal : 0);
  applyInvolvedFilter();
}

document.getElementById('refreshBtn').addEventListener('click', () => {
  loadInvolvedPage().catch((error) => {
    alert(error.message);
  });
});

document.getElementById('involvedSearchInput').addEventListener('input', () => {
  applyInvolvedFilter();
});

loadInvolvedPage().catch((error) => {
  alert(error.message);
});