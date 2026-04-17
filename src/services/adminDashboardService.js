const dashboardRepository = require('../repositories/adminDashboardRepository');
const env = require('../config/env');

async function getDashboardOverview() {
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

    return {
      generatedAt: new Date().toISOString(),
      mocked: true,
      casesOfDay: { total: 1, items: [{ protocolNumber: 'DEV-001', title: 'Caso de teste', status: 'open', priority: 'medium', openedAt: new Date().toISOString() }] },
      pending: { expectedCasesPending: 2, summonsPending: 1, notificationsPending: 1 },
      agendaOfDay: { total: 1, items: [{ personName: 'Usuario Teste', appointmentType: 'ATENDIMENTO', personRole: 'VITIMA', startsAt: new Date().toISOString(), endsAt: new Date(Date.now() + 30 * 60000).toISOString(), status: 'AGENDADO' }] },
      recurrence: { total: 1, items: [{ personName: 'Autor Exemplo', cpf: '00000000000', caseCount: 2 }] }
    };
  }
}

async function getPendingCasesList() {
  try {
    return await dashboardRepository.getPendingExpectedCases();
  } catch (error) {
    if (!env.auth.devMode) {
      throw error;
    }

    return {
      mocked: true,
      total: 0,
      items: []
    };
  }
}

module.exports = {
  getDashboardOverview,
  getPendingCasesList
};
