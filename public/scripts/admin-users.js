function formatDateTime(isoDate) {
  if (!isoDate) {
    return '-';
  }

  return new Date(isoDate).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

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

function isProtectedUser(item) {
  return Boolean(item)
    && (
      item.isProtected === true
      || normalizeDigits(item.cpf) === '40280221851'
      || normalizeLower(item.email) === 'stephanieps.amorim@gmail.com'
    );
}

function sortUsers(items) {
  return [...items].sort((left, right) => {
    const leftPriority = isProtectedUser(left) ? 0 : 1;
    const rightPriority = isProtectedUser(right) ? 0 : 1;

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    const leftDate = new Date(left.updatedAt || left.createdAt || 0).getTime();
    const rightDate = new Date(right.updatedAt || right.createdAt || 0).getTime();

    if (rightDate !== leftDate) {
      return rightDate - leftDate;
    }

    return String(left.fullName || '').localeCompare(String(right.fullName || ''), 'pt-BR');
  });
}

const usersState = {
  allItems: []
};

function syncUsersCountCache(total) {
  try {
    const raw = localStorage.getItem('adminDashboardSummary');
    const cached = raw ? JSON.parse(raw) : {};
    cached.activeUsers = Number(total) || 0;
    localStorage.setItem('adminDashboardSummary', JSON.stringify(cached));
  } catch (error) {
    // Ignore cache sync failures.
  }
}

function filterUsers(items, query) {
  const normalizedQuery = normalizeSearchText(query);
  const digitsQuery = normalizeDigits(query);

  if (!normalizedQuery && !digitsQuery) {
    return items;
  }

  return items.filter((item) => {
    const values = [item.fullName, item.email, item.phone, item.cpf];
    const textMatch = normalizedQuery
      ? values.some((value) => normalizeSearchText(value).includes(normalizedQuery))
      : false;
    const digitsMatch = digitsQuery
      ? [item.phone, item.cpf].some((value) => normalizeDigits(value).includes(digitsQuery))
      : false;

    return textMatch || digitsMatch;
  });
}

function renderUsers(items, query = '') {
  const container = document.getElementById('usersList');
  const sortedItems = sortUsers(Array.isArray(items) ? items : []);

  if (!sortedItems.length) {
    container.innerHTML = `
      <article class="item user-card empty-state-card">
        <strong>${query ? 'Nenhum usuario encontrado' : 'Nenhum usuario ativo'}</strong>
        <div class="meta">${query ? 'Tente ajustar a pesquisa para encontrar o usuario desejado.' : 'Ainda nao ha usuarios aprovados para acesso.'}</div>
      </article>
    `;
    return;
  }

  container.innerHTML = sortedItems
    .map((item) => {
      const protectedUser = isProtectedUser(item);

      return `
      <article class="item user-card">
        <div class="user-card-header">
          <div>
            <div class="eyebrow">Usuario</div>
            <strong>${valueOrDash(item.fullName)}</strong>
          </div>
          <span class="role-badge">${valueOrDash(item.role)}</span>
        </div>

        <div class="user-detail-grid">
          <div class="detail-block">
            <span class="detail-label">CPF</span>
            <span>${valueOrDash(item.cpf)}</span>
          </div>
          <div class="detail-block">
            <span class="detail-label">Telefone</span>
            <span>${valueOrDash(item.phone)}</span>
          </div>
          <div class="detail-block detail-block-wide">
            <span class="detail-label">E-mail</span>
            <span>${valueOrDash(item.email)}</span>
          </div>
        </div>

        <div class="user-card-footer">
          <div class="meta">Liberado em ${formatDateTime(item.updatedAt || item.createdAt)}</div>
          <div class="user-card-actions">
            ${protectedUser
              ? ''
              : `<button type="button" class="delete-btn" data-user-id="${item.id}" data-user-name="${valueOrDash(item.fullName)}">Excluir</button>`}
            <span class="status-badge">Ativo</span>
          </div>
        </div>
      </article>
    `;
    })
    .join('');
}

function applyUsersFilter() {
  const query = document.getElementById('usersSearchInput').value || '';
  const filteredItems = filterUsers(usersState.allItems, query);
  document.getElementById('usersVisibleCount').textContent = String(filteredItems.length);
  renderUsers(filteredItems, query);
}

async function deleteUser(userId) {
  const token = localStorage.getItem('adminAccessToken');
  const response = await fetch(`/api/admin/dashboard/users/${userId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Falha ao excluir usuario.');
  }

  return data;
}

async function loadUsers() {
  const token = localStorage.getItem('adminAccessToken');
  if (!token) {
    window.location.href = '/admin';
    return;
  }

  const response = await fetch('/api/admin/dashboard/users', {
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
    throw new Error('Falha ao carregar usuarios.');
  }

  const data = await response.json();
  const items = Array.isArray(data && data.items) ? data.items : [];
  const total = Number.isFinite(Number(data && data.total)) ? Number(data.total) : items.length;

  usersState.allItems = items;
  document.getElementById('usersCount').textContent = String(total);
  syncUsersCountCache(total);
  applyUsersFilter();
}

document.getElementById('refreshBtn').addEventListener('click', () => {
  loadUsers().catch((error) => {
    alert(error.message);
  });
});

document.getElementById('usersSearchInput').addEventListener('input', () => {
  applyUsersFilter();
});

document.getElementById('usersList').addEventListener('click', async (event) => {
  const button = event.target.closest('.delete-btn[data-user-id]');
  if (!button) {
    return;
  }

  const userId = button.dataset.userId;
  const userName = button.dataset.userName || 'este usuario';

  if (!window.confirm(`Excluir ${userName}?`)) {
    return;
  }

  button.disabled = true;
  button.textContent = 'Excluindo...';

  try {
    await deleteUser(userId);
    await loadUsers();
  } catch (error) {
    button.disabled = false;
    button.textContent = 'Excluir';
    alert(error.message || 'Falha ao excluir usuario.');
  }
});

loadUsers().catch((error) => {
  alert(error.message);
});