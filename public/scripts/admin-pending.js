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

function renderPendingItems(items) {
  const body = document.getElementById('pendingTableBody');
  const container = document.getElementById('pendingList');

  if (!items.length) {
    body.innerHTML = '';
    container.innerHTML = '<p class="muted">Nenhum BO pendente no momento.</p>';
    return;
  }

  const valueOrDash = (value) => {
    const text = value == null ? '' : String(value).trim();
    return text || '-';
  };

  body.innerHTML = items
    .map((item) => {
      const boNumber = valueOrDash(item && item.boNumber);
      const flagrante = valueOrDash(item && item.flagrante);
      const natureza = valueOrDash(item && item.natureza);
      const victim = valueOrDash(item && (item.victim || item.victimName));
      const author = valueOrDash(item && (item.author || item.authorName));
      const local = valueOrDash(item && item.local);

      return `
        <tr>
          <td><strong>${boNumber}</strong></td>
          <td>${flagrante}</td>
          <td>${natureza}</td>
          <td>${victim}</td>
          <td>${author}</td>
          <td>${local}</td>
        </tr>
      `;
    })
    .join('');

  container.innerHTML = '';
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
  let total = Number(data && data.total ? data.total : items.length);

  if (data && data.mocked) {
    const devBos = readDevPendingBos();
    items = devBos;
    total = readDevPendingCases() || items.length;
  }

  document.getElementById('pendingCount').textContent = String(total);
  renderPendingItems(items);
}

document.getElementById('refreshBtn').addEventListener('click', () => {
  loadPendingCases().catch((error) => {
    alert(error.message);
  });
});

loadPendingCases().catch((error) => {
  alert(error.message);
});
