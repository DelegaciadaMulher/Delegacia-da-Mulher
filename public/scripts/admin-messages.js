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

const MESSAGE_DRAFT_STORAGE_KEY = 'adminMessagesDrafts';

function readAdminUser() {
  try {
    const raw = localStorage.getItem('adminUser');
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function canEditWhatsappDraft() {
  const adminUser = readAdminUser();
  return Boolean(adminUser && adminUser.role === 'admin');
}

function showComposePanel() {
  const composePanel = document.getElementById('composePanel');
  if (composePanel) {
    composePanel.hidden = false;
  }
}

function getDraftFields() {
  return {
    whatsapp: document.getElementById('messageWhatsappDraft')
  };
}

function readMessageDrafts() {
  try {
    const raw = localStorage.getItem(MESSAGE_DRAFT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    return {};
  }
}

function writeMessageDrafts(drafts) {
  localStorage.setItem(MESSAGE_DRAFT_STORAGE_KEY, JSON.stringify(drafts));
}

function setDraftStatus(message, isError = false) {
  const statusElement = document.getElementById('draftStatus');
  if (!statusElement) {
    return;
  }

  statusElement.textContent = message;
  statusElement.classList.toggle('draft-status-error', Boolean(isError));
}

function populateDraftFields() {
  const drafts = readMessageDrafts();
  const fields = getDraftFields();

  fields.whatsapp.value = String(drafts.whatsapp || '');

  if (drafts.updatedAt) {
    setDraftStatus(`Rascunho recuperado. Ultima atualizacao em ${formatDateTime(drafts.updatedAt)}.`);
  }
}

function saveDraftFields() {
  const fields = getDraftFields();
  const drafts = {
    whatsapp: fields.whatsapp.value || '',
    updatedAt: new Date().toISOString()
  };

  try {
    writeMessageDrafts(drafts);
    setDraftStatus(`Mensagem salva em ${formatDateTime(drafts.updatedAt)}.`);
  } catch (error) {
    setDraftStatus('Nao foi possivel salvar a mensagem localmente.', true);
  }
}

function setupDraftFields() {
  if (!canEditWhatsappDraft()) {
    return;
  }

  showComposePanel();
  populateDraftFields();

  const fields = Object.values(getDraftFields());
  fields.forEach((field) => {
    field.addEventListener('input', () => {
      saveDraftFields();
    });
  });

  document.getElementById('saveMessageBtn').addEventListener('click', () => {
    saveDraftFields();
  });
}

setupDraftFields();