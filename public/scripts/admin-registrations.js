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

function syncPendingRegistrationsCache(total) {
  try {
    const raw = localStorage.getItem('adminDashboardSummary');
    const cached = raw ? JSON.parse(raw) : {};
    cached.pendingRegistrations = Number(total) || 0;
    localStorage.setItem('adminDashboardSummary', JSON.stringify(cached));
  } catch (error) {
    // Ignore cache sync failures.
  }
}

function renderPendingRegistrations(items) {
  const body = document.getElementById('registrationsTableBody');
  const container = document.getElementById('registrationsList');

  if (!items.length) {
    body.innerHTML = '';
    container.innerHTML = '<p class="muted">Nenhuma solicitação de cadastro pendente no momento.</p>';
    return;
  }

  body.innerHTML = items
    .map((item) => `
      <tr>
        <td><strong>${valueOrDash(item.fullName)}</strong></td>
        <td>${valueOrDash(item.cpf)}</td>
        <td>${valueOrDash(item.email)}</td>
        <td>${valueOrDash(item.phone)}</td>
        <td><span class="role-badge">${valueOrDash(item.role)}</span></td>
        <td>${formatDateTime(item.createdAt)}</td>
        <td>
          <button type="button" class="approve-btn" data-user-id="${item.id}">Aprovar</button>
        </td>
      </tr>
    `)
    .join('');

  container.innerHTML = '';
}

async function loadPendingRegistrations() {
  const token = localStorage.getItem('adminAccessToken');
  if (!token) {
    window.location.href = '/admin';
    return;
  }

  const response = await fetch('/api/admin/dashboard/pending-registrations', {
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
    throw new Error('Falha ao carregar cadastros pendentes.');
  }

  const data = await response.json();
  const items = Array.isArray(data && data.items) ? data.items : [];
  const total = Number(data && data.total ? data.total : items.length);

  document.getElementById('pendingCount').textContent = String(total);
  syncPendingRegistrationsCache(total);
  renderPendingRegistrations(items);
}

async function approveRegistrationRequest(userId) {
  const token = localStorage.getItem('adminAccessToken');
  const response = await fetch(`/api/admin/dashboard/pending-registrations/${userId}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Falha ao aprovar solicitação.');
  }

  return data;
}

document.getElementById('refreshBtn').addEventListener('click', () => {
  loadPendingRegistrations().catch((error) => {
    alert(error.message);
  });
});

document.getElementById('registrationsTableBody').addEventListener('click', async (event) => {
  const button = event.target.closest('.approve-btn');
  if (!button) {
    return;
  }

  const userId = button.dataset.userId;
  button.disabled = true;
  button.textContent = 'Aprovando...';

  try {
    await approveRegistrationRequest(userId);
    await loadPendingRegistrations();
  } catch (error) {
    button.disabled = false;
    button.textContent = 'Aprovar';
    alert(error.message || 'Erro ao aprovar solicitação.');
  }
});

loadPendingRegistrations().catch((error) => {
  alert(error.message);
});