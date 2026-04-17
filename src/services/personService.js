const personRepository = require('../repositories/personRepository');

function normalizeCpf(cpf) {
  return String(cpf || '').replace(/\D/g, '');
}

function normalizeState(state) {
  if (!state) {
    return null;
  }

  return String(state).trim().toUpperCase();
}

function sanitizeName(name) {
  return String(name || '').replace(/\s+/g, ' ').trim();
}

function validatePersonPayload(payload) {
  const cpf = normalizeCpf(payload.cpf);
  const fullName = sanitizeName(payload.fullName || payload.name);

  if (!cpf || cpf.length !== 11) {
    const error = new Error('CPF invalido. Informe 11 digitos.');
    error.statusCode = 400;
    throw error;
  }

  if (!fullName) {
    const error = new Error('Nome da pessoa e obrigatorio para criar/atualizar.');
    error.statusCode = 400;
    throw error;
  }

  return {
    fullName,
    cpf,
    birthDate: payload.birthDate || null,
    phone: payload.phone || null,
    email: payload.email || null,
    addressLine: payload.addressLine || null,
    neighborhood: payload.neighborhood || null,
    city: payload.city || null,
    state: normalizeState(payload.state)
  };
}

async function upsertPerson(payload) {
  const normalizedPayload = validatePersonPayload(payload);
  return personRepository.upsertPersonByCpf(normalizedPayload);
}

module.exports = {
  upsertPerson,
  normalizeCpf
};
