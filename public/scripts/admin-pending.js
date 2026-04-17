function readDevPendingBos() {
  try {
    const raw = localStorage.getItem('devPendingBos');
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((entry) => {
        if (typeof entry === 'string') {
          return { boNumber: entry };
        }

        return entry || {};
      })
      .filter((entry) => Boolean(entry.boNumber));
  } catch (error) {
    return [];
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

function normalizeLower(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeSearchText(value) {
  return normalizeLower(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

const pendingState = {
  allItems: [],
  total: 0
};

function filterPendingItems(items, query) {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return items;
  }

  return items.filter((item) => {
    const values = [
      item && item.boNumber,
      item && item.flagrante,
      item && item.natureza,
      item && (item.victim || item.victimName),
      item && (item.author || item.authorName),
      item && item.local
    ];

    return values.some((value) => normalizeSearchText(value).includes(normalizedQuery));
  });
}

function renderPendingItems(items, total, query = '') {
  const container = document.getElementById('pendingList');

  if (!items.length) {
    if (query) {
      container.innerHTML = `
        <div class="item empty-state-card">
          <strong>Nenhum BO pendente encontrado</strong>
          <div class="meta">Tente ajustar a pesquisa para localizar o BO desejado.</div>
        </div>
      `;
      return;
    }

    if (total > 0) {
      container.innerHTML = `
        <div class="item empty-state-card">
          <strong>Detalhes indisponiveis no momento</strong>
          <div class="meta">Existem ${total} BO(s) pendente(s), mas os dados detalhados ainda nao foram carregados.</div>
        </div>
      `;
      return;
    }

    container.innerHTML = '<p class="muted">Nenhum BO pendente no momento.</p>';
    return;
  }

  const valueOrDash = (value) => {
    const text = value == null ? '' : String(value).trim();
    return text || '-';
  };

  container.innerHTML = items
    .map((item) => {
      const boNumber = valueOrDash(item && item.boNumber);
      const flagrante = valueOrDash(item && item.flagrante);
      const natureza = valueOrDash(item && item.natureza);
      const victim = valueOrDash(item && (item.victim || item.victimName));
      const author = valueOrDash(item && (item.author || item.authorName));
      const local = valueOrDash(item && item.local);
      const flagranteLabel = flagrante === '-' ? 'Sem flagrante informado' : `Flagrante ${flagrante}`;

      return `
        <article class="item bo-card">
          <div class="item-main">
            <div>
              <div class="eyebrow">BO</div>
              <strong>${boNumber}</strong>
            </div>
            <span class="flag-chip">${flagranteLabel}</span>
          </div>
          <div class="natureza">${natureza}</div>
          <div class="detail-grid">
            <div class="detail-block">
              <span class="detail-label">Vitima</span>
              <span class="detail-value">${victim}</span>
            </div>
            <div class="detail-block">
              <span class="detail-label">Indiciado</span>
              <span class="detail-value">${author}</span>
            </div>
            <div class="detail-block detail-block-wide">
              <span class="detail-label">Local</span>
              <span class="detail-value">${local}</span>
            </div>
          </div>
        </article>
      `;
    })
    .join('');
}

function applyPendingFilter() {
  const input = document.getElementById('pendingSearchInput');
  const query = input ? input.value : '';
  const filteredItems = filterPendingItems(pendingState.allItems, query);

  document.getElementById('pendingVisibleCount').textContent = String(filteredItems.length);
  renderPendingItems(filteredItems, pendingState.total, query);
}

async function loadPendingCases() {
  const token = localStorage.getItem('adminAccessToken');
  if (!token) {
    window.location.href = '/admin';
    return;
  }

  const response = await fetch('/api/admin/dashboard/pending-cases', {
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
    throw new Error('Falha ao carregar BOs pendentes.');
  }

  const data = await response.json();
  let items = Array.isArray(data && data.items) ? data.items : [];
  const responseTotal = Number(data && data.total);
  let total = Number.isFinite(responseTotal) ? responseTotal : items.length;

  if (data && data.mocked && !items.length && !Number.isFinite(responseTotal)) {
    const devBos = readDevPendingBos();
    items = devBos;
    total = readDevPendingCases() || items.length;
  }

  pendingState.allItems = items;
  pendingState.total = total;
  document.getElementById('pendingCount').textContent = String(total);
  applyPendingFilter();
}

document.getElementById('refreshBtn').addEventListener('click', () => {
  loadPendingCases().catch((error) => {
    alert(error.message);
  });
});

document.getElementById('pendingSearchInput').addEventListener('input', () => {
  applyPendingFilter();
});

loadPendingCases().catch((error) => {
  alert(error.message);
});
