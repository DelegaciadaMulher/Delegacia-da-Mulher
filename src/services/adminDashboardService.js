const fs = require('fs/promises');
const path = require('path');

const dashboardRepository = require('../repositories/adminDashboardRepository');
const dailyImportRepository = require('../repositories/dailyImportRepository');
const env = require('../config/env');
const localAuthRepository = require('../repositories/localAuthRepository');
const localExpectedCaseRepository = require('../repositories/localExpectedCaseRepository');

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads', 'pdfs');

function toIsoOrNull(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function sanitizeUploadOriginalName(fileName) {
  return String(fileName || '').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
}

function resolveUploadTimestamp(savedName) {
  const match = String(savedName || '').match(/^(\d+)-/);
  if (!match) {
    return Number.NaN;
  }

  return Number(match[1]);
}

async function resolveSavedFileName({ sourceName, importedAt }) {
  const safeOriginalName = sanitizeUploadOriginalName(sourceName);
  if (!safeOriginalName) {
    return null;
  }

  let fileNames = [];

  try {
    fileNames = await fs.readdir(UPLOADS_DIR);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return null;
    }

    throw error;
  }

  const matches = fileNames
    .filter((fileName) => fileName.endsWith(`-${safeOriginalName}`))
    .map((fileName) => {
      const timestamp = resolveUploadTimestamp(fileName);
      const importedAtMs = new Date(importedAt || 0).getTime();
      const delta = Number.isNaN(timestamp) || Number.isNaN(importedAtMs)
        ? Number.MAX_SAFE_INTEGER
        : Math.abs(timestamp - importedAtMs);

      return { fileName, timestamp, delta };
    })
    .sort((left, right) => {
      if (left.delta !== right.delta) {
        return left.delta - right.delta;
      }

      return right.timestamp - left.timestamp;
    });

  return matches[0] ? matches[0].fileName : null;
}

async function mapImportHistoryItem(item) {
  const importedAt = toIsoOrNull(item.createdAt) || toIsoOrNull(item.updatedAt);
  const savedName = item.savedName || await resolveSavedFileName({
    sourceName: item.sourceName,
    importedAt
  });

  return {
    id: item.id,
    importedAt,
    file: {
      originalName: item.sourceName || null,
      savedName
    },
    uploadedBy: null,
    period: {
      raw: null,
      iso: {
        start: toIsoOrNull(item.periodStart),
        end: toIsoOrNull(item.periodEnd)
      }
    }
  };
}

function shouldUseLocalSimulation() {
  return env.auth.devMode;
}

async function buildDevDashboardOverview() {
  const [pendingRegistrationsResult, pendingExpectedCasesResult, activeUsersResult] = await Promise.allSettled([
    localAuthRepository.countPendingRegistrations(),
    localExpectedCaseRepository.countPendingExpectedCases(),
    localAuthRepository.countActiveUsers()
  ]);

  const pendingRegistrations = pendingRegistrationsResult.status === 'fulfilled'
    ? pendingRegistrationsResult.value
    : 0;
  const expectedCasesPending = pendingExpectedCasesResult.status === 'fulfilled'
    ? pendingExpectedCasesResult.value
    : 0;
  const activeUsers = activeUsersResult.status === 'fulfilled'
    ? activeUsersResult.value
    : 0;

  return {
    generatedAt: new Date().toISOString(),
    mocked: true,
    casesOfDay: { total: 1, items: [{ protocolNumber: 'DEV-001', title: 'Caso de teste', status: 'open', priority: 'medium', openedAt: new Date().toISOString() }] },
    pending: { expectedCasesPending, summonsPending: 1, notificationsPending: 1, pendingRegistrations, activeUsers },
    agendaOfDay: { total: 1, items: [{ personName: 'Super Admin', appointmentType: 'ATENDIMENTO', personRole: 'VITIMA', startsAt: new Date().toISOString(), endsAt: new Date(Date.now() + 30 * 60000).toISOString(), status: 'AGENDADO' }] },
    recurrence: { total: 1, items: [{ personName: 'Autor Exemplo', cpf: '00000000000', caseCount: 2 }] }
  };
}

async function getDashboardOverview() {
  if (shouldUseLocalSimulation()) {
    return buildDevDashboardOverview();
  }

  try {
    const [casesOfDay, pending, agendaOfDay, recurrence] = await Promise.all([
      dashboardRepository.getCasesOfDay(),
      dashboardRepository.getPendingSummary(),
      dashboardRepository.getAgendaOfDay(),
      dashboardRepository.getRecurrenceSummary()
    ]);

    return {
      generatedAt: new Date().toISOString(),
      casesOfDay,
      pending,
      agendaOfDay,
      recurrence
    };
  } catch (error) {
    if (!env.auth.devMode) {
      throw error;
    }

    return buildDevDashboardOverview();
  }
}

async function getPendingRegistrationRequests() {
  if (shouldUseLocalSimulation()) {
    const result = await localAuthRepository.listPendingRegistrations();
    return {
      mocked: true,
      total: result.total,
      items: result.items
    };
  }

  try {
    return await dashboardRepository.getPendingRegistrationRequests();
  } catch (error) {
    if (!env.auth.devMode) {
      throw error;
    }

    const result = await localAuthRepository.listPendingRegistrations();
    return {
      mocked: true,
      total: result.total,
      items: result.items
    };
  }
}

async function approveRegistrationRequest(userId) {
  if (shouldUseLocalSimulation()) {
    return localAuthRepository.approveRegistration(userId);
  }

  try {
    return await dashboardRepository.approveUserRegistration(userId);
  } catch (error) {
    if (!env.auth.devMode) {
      throw error;
    }

    return localAuthRepository.approveRegistration(userId);
  }
}

async function getPendingCasesList() {
  if (shouldUseLocalSimulation()) {
    const result = await localExpectedCaseRepository.listPendingExpectedCases();

    return {
      mocked: true,
      total: result.total,
      items: result.items
    };
  }

  try {
    return await dashboardRepository.getPendingExpectedCases();
  } catch (error) {
    if (!env.auth.devMode) {
      throw error;
    }

    const result = await localExpectedCaseRepository.listPendingExpectedCases();

    return {
      mocked: true,
      total: result.total,
      items: result.items
    };
  }
}

async function getUsersList() {
  if (shouldUseLocalSimulation()) {
    const result = await localAuthRepository.listActiveUsers();
    return {
      mocked: true,
      total: result.total,
      items: result.items
    };
  }

  try {
    return await dashboardRepository.getActiveUsers();
  } catch (error) {
    if (!env.auth.devMode) {
      throw error;
    }

    const result = await localAuthRepository.listActiveUsers();
    return {
      mocked: true,
      total: result.total,
      items: result.items
    };
  }
}

async function getImportHistory() {
  if (shouldUseLocalSimulation()) {
    const result = await localExpectedCaseRepository.listImportHistory();
    return {
      mocked: true,
      total: result.total,
      items: await Promise.all(result.items.map(mapImportHistoryItem))
    };
  }

  try {
    const result = await dailyImportRepository.getImportHistory();
    return {
      total: result.total,
      items: await Promise.all(result.items.map(mapImportHistoryItem))
    };
  } catch (error) {
    if (!env.auth.devMode) {
      throw error;
    }

    const result = await localExpectedCaseRepository.listImportHistory();
    return {
      mocked: true,
      total: result.total,
      items: await Promise.all(result.items.map(mapImportHistoryItem))
    };
  }
}

module.exports = {
  getDashboardOverview,
  getPendingCasesList,
  getPendingRegistrationRequests,
  approveRegistrationRequest,
  getUsersList,
  getImportHistory
};
