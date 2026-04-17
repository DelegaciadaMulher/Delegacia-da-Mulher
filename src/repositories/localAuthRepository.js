const fs = require('fs/promises');
const path = require('path');

const STORE_PATH = path.resolve(process.cwd(), 'database', 'dev-data', 'local-auth.json');

function createDefaultStore() {
  return {
    lastUserId: 0,
    users: []
  };
}

async function ensureStoreFile() {
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });

  try {
    await fs.access(STORE_PATH);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }

    await fs.writeFile(STORE_PATH, JSON.stringify(createDefaultStore(), null, 2), 'utf8');
  }
}

async function readStore() {
  await ensureStoreFile();

  const raw = await fs.readFile(STORE_PATH, 'utf8');
  if (!raw.trim()) {
    return createDefaultStore();
  }

  const parsed = JSON.parse(raw);
  return {
    lastUserId: Number(parsed.lastUserId) || 0,
    users: Array.isArray(parsed.users) ? parsed.users : []
  };
}

async function writeStore(store) {
  await ensureStoreFile();
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
}

function normalizeUserRecord(user) {
  return {
    id: Number(user.id),
    personId: Number(user.personId),
    fullName: String(user.fullName || '').trim(),
    email: user.email == null ? null : String(user.email).trim(),
    phone: user.phone == null ? null : String(user.phone).trim(),
    cpf: String(user.cpf || '').trim(),
    role: String(user.role || 'agent').trim(),
    isActive: Boolean(user.isActive),
    createdAt: user.createdAt || null,
    updatedAt: user.updatedAt || null
  };
}

function toPendingRegistrationItem(user) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    cpf: user.cpf,
    phone: user.phone
  };
}

async function createPendingRegistration({ fullName, cpf, email, phone, role }) {
  const store = await readStore();
  const existingUser = store.users.find((user) => String(user.cpf || '').trim() === String(cpf || '').trim());

  if (existingUser) {
    const error = new Error('Ja existe um usuario cadastrado com este CPF.');
    error.statusCode = 409;
    throw error;
  }

  const createdAt = new Date().toISOString();
  const nextId = store.lastUserId + 1;
  const user = normalizeUserRecord({
    id: nextId,
    personId: nextId,
    fullName,
    email,
    phone,
    cpf,
    role,
    isActive: false,
    createdAt,
    updatedAt: createdAt
  });

  store.lastUserId = nextId;
  store.users.push(user);
  await writeStore(store);

  return user;
}

async function listPendingRegistrations() {
  const store = await readStore();
  const items = store.users
    .map(normalizeUserRecord)
    .filter((user) => !user.isActive)
    .sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0))
    .map(toPendingRegistrationItem);

  return {
    total: items.length,
    items
  };
}

async function countPendingRegistrations() {
  const result = await listPendingRegistrations();
  return result.total;
}

async function approveRegistration(userId) {
  const store = await readStore();
  const user = store.users.find((item) => Number(item.id) === Number(userId));

  if (!user || user.isActive) {
    return null;
  }

  user.isActive = true;
  user.updatedAt = new Date().toISOString();
  await writeStore(store);

  return {
    id: Number(user.id)
  };
}

module.exports = {
  createPendingRegistration,
  listPendingRegistrations,
  countPendingRegistrations,
  approveRegistration
};