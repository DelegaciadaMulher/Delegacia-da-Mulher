const requestOtpForm = document.getElementById('requestOtpForm');
const verifyOtpForm = document.getElementById('verifyOtpForm');
const cpfInput = document.getElementById('cpf');
const codeInput = document.getElementById('code');
const statusText = document.getElementById('status');

function normalizeCpf(value) {
  return String(value || '').replace(/\D/g, '');
}

function setStatus(message) {
  statusText.textContent = message;
}

requestOtpForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const cpf = normalizeCpf(cpfInput.value);
  if (cpf.length !== 11) {
    setStatus('Informe um CPF valido com 11 digitos.');
    return;
  }

  try {
    const response = await fetch('/api/auth/admin/request-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cpf, channel: 'whatsapp' })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Falha ao solicitar codigo.');
    }

    verifyOtpForm.classList.remove('hidden');
    if (data.devOtpCode) {
      setStatus(`Modo dev ativo: use o codigo ${data.devOtpCode}.`);
    } else {
      setStatus('Codigo enviado no WhatsApp cadastrado.');
    }
  } catch (error) {
    setStatus(error.message);
  }
});

verifyOtpForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const cpf = normalizeCpf(cpfInput.value);
  const code = String(codeInput.value || '').trim();

  try {
    const response = await fetch('/api/auth/admin/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cpf, code, channel: 'whatsapp' })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Falha no login administrativo.');
    }

    localStorage.setItem('adminAccessToken', data.accessToken);
    if (data.user) {
      localStorage.setItem('adminUser', JSON.stringify(data.user));
    }
    window.location.href = '/admin/painel';
  } catch (error) {
    setStatus(error.message);
  }
});
