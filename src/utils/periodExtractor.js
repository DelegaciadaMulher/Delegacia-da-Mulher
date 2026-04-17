const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');

dayjs.extend(customParseFormat);

const PERIOD_REGEX = /(\d{2}\/\d{2}\/\d{4})\s+(?:as|às)\s+(\d{2}:\d{2})\s+(?:ate|até)\s+(\d{2}\/\d{2}\/\d{4})\s+(?:as|às)\s+(\d{2}:\d{2})/i;

function normalizeText(text) {
  return text
    .replace(/\r/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildDateTime(dateStr, timeStr) {
  return dayjs(`${dateStr} ${timeStr}`, 'DD/MM/YYYY HH:mm', true);
}

function extractPeriodFromText(rawText) {
  const text = normalizeText(rawText);
  const match = text.match(PERIOD_REGEX);

  if (!match) {
    const error = new Error('Periodo nao encontrado no PDF no formato esperado.');
    error.statusCode = 422;
    throw error;
  }

  const startDate = match[1];
  const startTime = match[2];
  const endDate = match[3];
  const endTime = match[4];

  const startDateTime = buildDateTime(startDate, startTime);
  const endDateTime = buildDateTime(endDate, endTime);

  if (!startDateTime.isValid() || !endDateTime.isValid()) {
    const error = new Error('Periodo encontrado, mas com data/hora invalida.');
    error.statusCode = 422;
    throw error;
  }

  if (endDateTime.isBefore(startDateTime)) {
    const error = new Error('Periodo invalido: data/hora final anterior ao inicio.');
    error.statusCode = 422;
    throw error;
  }

  return {
    raw: `${startDate} às ${startTime} até ${endDate} às ${endTime}`,
    start: startDateTime.toDate(),
    end: endDateTime.toDate(),
    iso: {
      start: startDateTime.toISOString(),
      end: endDateTime.toISOString()
    }
  };
}

module.exports = {
  extractPeriodFromText
};
