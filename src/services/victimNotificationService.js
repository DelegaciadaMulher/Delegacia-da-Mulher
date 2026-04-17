const casePersonRepository = require('../repositories/casePersonRepository');
const notificationRepository = require('../repositories/notificationRepository');
const whatsappClient = require('../clients/whatsappClient');
const smsClient = require('../clients/smsClient');
const env = require('../config/env');

function normalizePhone(phone) {
  return String(phone || '').replace(/\D/g, '');
}

async function sendDirectMessage({ to, message, context }) {
  try {
    await whatsappClient.sendTemplateMessage({
      to,
      channel: 'whatsapp',
      template: env.whatsapp.victimNotificationTemplateName,
      variables: {
        mensagem: message,
        contexto: context
      },
      message
    });

    return { channel: 'whatsapp', status: 'sent' };
  } catch (error) {
    try {
      await smsClient.sendSms({ to, message });
      return { channel: 'sms', status: 'sent' };
    } catch (smsError) {
      return { channel: 'whatsapp', status: 'failed' };
    }
  }
}

async function notifyVictims(caseId, message, context) {
  const victims = await casePersonRepository.listVictimsByCaseId(caseId);

  if (!victims.length) {
    return { totalVictims: 0, notifications: [] };
  }

  const notifications = [];

  for (const victim of victims) {
    const phone = normalizePhone(victim.phone);

    if (!phone) {
      const notification = await notificationRepository.createNotification({
        personId: victim.id,
        caseId,
        message,
        channel: 'whatsapp',
        status: 'failed'
      });
      notifications.push(notification);
      continue;
    }

    const delivery = await sendDirectMessage({
      to: phone,
      message,
      context
    });

    const notification = await notificationRepository.createNotification({
      personId: victim.id,
      caseId,
      message,
      channel: delivery.channel,
      status: delivery.status
    });

    notifications.push(notification);
  }

  return {
    totalVictims: victims.length,
    notifications
  };
}

async function notifyAuthorSummoned({ caseId, authorName }) {
  const message = `Atualizacao do caso: o autor ${authorName || ''} foi intimado.`.trim();
  return notifyVictims(caseId, message, 'autor_intimado');
}

async function notifyAuthorAttended({ caseId, authorName }) {
  const message = `Atualizacao do caso: o autor ${authorName || ''} compareceu ao atendimento.`.trim();
  return notifyVictims(caseId, message, 'autor_compareceu');
}

module.exports = {
  notifyAuthorSummoned,
  notifyAuthorAttended
};
