const { extractPeriodFromText } = require('./periodExtractor');

function collapseWhitespace(text) {
  return String(text || '')
    .replace(/\r/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\t/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sanitizeValue(value) {
  if (!value) {
    return null;
  }

  return value
    .replace(/^[-:;.,\s]+/, '')
    .replace(/[-:;.,\s]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeBoNumber(value) {
  const cleaned = sanitizeValue(value);
  if (!cleaned) {
    return null;
  }

  return cleaned.toUpperCase().replace(/\s+/g, '');
}

function extractBoNumber(text) {
  const match = text.match(
    /(?:numero\s+do\s+bo|n[ºo°]\s*do\s*bo|n[ºo°]\s*bo|bo(?:letim)?(?:\s*n[ºo°])?\s*(?:de\s+ocorrencia|de\s+ocorrência)?|rdo)\s*[:\-]?\s*([A-Za-z0-9./\-]*\d[A-Za-z0-9./\-]{0,39})/i
  );

  return normalizeBoNumber(match ? match[1] : null);
}

function parseExtratoContent(rawText) {
  const text = collapseWhitespace(rawText);
  const boNumber = extractBoNumber(text);

  let period = null;
  try {
    period = extractPeriodFromText(text);
  } catch (error) {
    period = null;
  }

  if (!boNumber && !period) {
    const error = new Error('Nao foi possivel extrair dados do PDF de Extrato.');
    error.statusCode = 422;
    throw error;
  }

  return {
    boNumber,
    period
  };
}

module.exports = {
  parseExtratoContent
};
