function normalizeCpf(cpf) {
  return String(cpf || '').replace(/\D/g, '');
}

function setStatus(message, isError = false) {
  const statusElement = document.getElementById('status');
  statusElement.textContent = message;
  statusElement.style.color = isError ? '#9e1f4d' : '#2f5b3c';
  statusElement.classList.toggle('success', !isError);
  statusElement.classList.toggle('error', isError);
}

function formatCpf(value) {
  const digits = normalizeCpf(value);
  return digits
    .replace(/^(\d{3})(\d{3})(\d{3})(\d{2}).*/, '$1.$2.$3-$4')
    .slice(0, 14);
}

function normalizeRegistrationRole(value) {
  const role = String(value || '').trim().toLowerCase();
  return role === 'plantonista' ? 'plantonista' : 'agent';
}

const registerForm = document.getElementById('registerForm');
const cpfInput = document.getElementById('cpf');
const submitButton = registerForm.querySelector('button[type="submit"]');

cpfInput.addEventListener('input', () => {
  cpfInput.value = formatCpf(cpfInput.value);
});

registerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setStatus('Enviando solicitacao...', false);
  submitButton.disabled = true;
  submitButton.textContent = 'Enviando...';

  const payload = {
    fullName: String(document.getElementById('fullName').value || '').trim(),
    cpf: normalizeCpf(document.getElementById('cpf').value),
    email: String(document.getElementById('email').value || '').trim(),
    phone: String(document.getElementById('phone').value || '').trim(),
    role: normalizeRegistrationRole(document.getElementById('role').value)
  };

  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Falha ao enviar solicitacao.');
    }

    setStatus(data.message || 'Solicitacao enviada com sucesso. Aguarde aprovacao.', false);
    registerForm.reset();
  } catch (error) {
    setStatus(error.message || 'Erro ao enviar solicitacao.', true);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Enviar solicitação';
  }
});
