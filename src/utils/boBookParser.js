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

function extractByRegex(text, regex) {
  const match = text.match(regex);
  return sanitizeValue(match ? match[1] : null);
}

function normalizeBoNumber(value) {
  const cleaned = sanitizeValue(value);
  if (!cleaned) {
    return null;
  }

  return cleaned.toUpperCase().replace(/\s+/g, '');
}

function isLikelyDateToken(value) {
  return /^\d{2}\/\d{2}\/\d{4}$/.test(value);
}

function collectUniqueBoNumbers(matches, seen, output) {
  for (const raw of matches) {
    const normalized = normalizeBoNumber(raw);
    const hasDigit = /\d/.test(normalized || '');
    if (!normalized || !hasDigit || isLikelyDateToken(normalized) || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    output.push(normalized);
  }
}

function extractBoNumbersFromRawLines(rawText, seen, output) {
  const lines = String(rawText || '').split(/\r?\n/);
  const regexTableLine = /(?:^|\s)([A-Z]{1,3}\d{3,6}\s*[-:]\s*\d{1,4}\/\d{4})(?=\D|$)/gi;

  for (const line of lines) {
    if (!line || line.length < 8) {
      continue;
    }

    const normalizedLine = line.replace(/\s+/g, ' ').trim();
    const candidates = [...normalizedLine.matchAll(regexTableLine)].map((match) => match[1]);
    collectUniqueBoNumbers(candidates, seen, output);
  }
}

function extractBoNumbers(text, rawText) {
  const regexByLabel = /(?:numero\s+do\s+bo|n[ºo°]\s*do\s*bo|n[ºo°]\s*bo|bo(?:letim)?\s*(?:de\s+ocorrencia|de\s+ocorrência)?|rdo)\s*[:\-]?\s*([A-Za-z0-9./\-]{4,40})/gi;
  const regexCodeAndYear = /\b([A-Z]{1,3}\d{3,6}\s*[-:]\s*\d{1,4}\/\d{4})(?=\D|$)/gi;
  const regexByLineFormat = /(?<!\d\/)\b\d{1,5}[\/\-]\d{4}\b(?!\/\d)/g;
  const regexNearBoKeyword = /(?:\bbo\b|\brdo\b)[^\n\r\d]{0,12}(\d{1,6}[\/\-]\d{4,6}|\d{4,6}[\/\-]\d{1,6})/gi;

  const numbers = [];
  const seen = new Set();

  for (const match of text.matchAll(regexByLabel)) {
    collectUniqueBoNumbers([match[1]], seen, numbers);
  }

  // Main strategy for table-like Livro de BO PDFs: one BO per text line.
  extractBoNumbersFromRawLines(rawText, seen, numbers);

  // Fallback: many Livro de BO files list numbers per line without repeating "BO:" labels.
  if (numbers.length <= 3) {
    const codeAndYearCandidates = [...text.matchAll(regexCodeAndYear)].map((match) => match[1]);
    collectUniqueBoNumbers(codeAndYearCandidates, seen, numbers);

    // Use plain numeric fallback only when no code+year BO pattern is found.
    if (!numbers.length) {
      const lineCandidates = text.match(regexByLineFormat) || [];
      collectUniqueBoNumbers(lineCandidates, seen, numbers);
    }
  }

  // Extra fallback: number patterns close to BO/RDO keyword.
  for (const match of text.matchAll(regexNearBoKeyword)) {
    collectUniqueBoNumbers([match[1]], seen, numbers);
  }

  return numbers;
}

function normalizeCpf(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length === 11 ? digits : null;
}

function extractCpfByLabel(text, labelRegex) {
  const match = text.match(new RegExp(`${labelRegex}[^0-9]{0,25}([0-9.\\-]{11,14})`, 'i'));
  return normalizeCpf(match ? match[1] : null);
}

function normalizeFlagrante(value) {
  const normalized = sanitizeValue(value);
  if (!normalized) {
    return null;
  }

  if (/^sim$/i.test(normalized)) {
    return 'Sim';
  }

  if (/^n[aã]o$/i.test(normalized)) {
    return 'Nao';
  }

  return normalized;
}

function isLikelyLocalLine(value) {
  const line = String(value || '').toUpperCase();
  return /(D\.P\.|DEL\.?\s*POL\.?|DELEG|S\.J\.|CAMPOS|STA\.?BRANCA|SAO JOSE)/.test(line);
}

function splitNamesFromLines(lines) {
  const cleaned = lines
    .map((line) => sanitizeValue(line))
    .filter((line) => Boolean(line));

  if (!cleaned.length) {
    return { victim: null, author: null };
  }

  if (cleaned.length === 1) {
    return { victim: cleaned[0], author: null };
  }

  if (cleaned.length === 2) {
    const firstWords = cleaned[0].split(/\s+/).filter(Boolean);
    if (firstWords.length >= 6) {
      const pivot = Math.floor(firstWords.length / 2);
      const victim = firstWords.slice(0, pivot).join(' ');
      const author = `${firstWords.slice(pivot).join(' ')} ${cleaned[1]}`.trim();
      return { victim: sanitizeValue(victim), author: sanitizeValue(author) };
    }

    return { victim: cleaned[0], author: cleaned[1] };
  }

  let bestSplit = 1;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let splitIndex = 1; splitIndex < cleaned.length; splitIndex += 1) {
    const leftCount = cleaned
      .slice(0, splitIndex)
      .join(' ')
      .split(/\s+/)
      .filter(Boolean).length;
    const rightCount = cleaned
      .slice(splitIndex)
      .join(' ')
      .split(/\s+/)
      .filter(Boolean).length;
    const score = Math.abs(leftCount - rightCount);

    if (score < bestScore) {
      bestScore = score;
      bestSplit = splitIndex;
    }
  }

  return {
    victim: sanitizeValue(cleaned.slice(0, bestSplit).join(' ')),
    author: sanitizeValue(cleaned.slice(bestSplit).join(' '))
  };
}

function parseBoTableEntries(rawText) {
  const lines = String(rawText || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const boStartRegex = /^([A-Z]{1,3}\d{3,6}\s*[-:]\s*\d{1,4}\/\d{4})(.*)$/i;
  const startIndexes = [];

  for (let index = 0; index < lines.length; index += 1) {
    if (boStartRegex.test(lines[index])) {
      startIndexes.push(index);
    }
  }

  if (!startIndexes.length) {
    return [];
  }

  const entries = [];
  const seen = new Set();

  for (let i = 0; i < startIndexes.length; i += 1) {
    const start = startIndexes[i];
    const end = i + 1 < startIndexes.length ? startIndexes[i + 1] : lines.length;
    const chunk = lines.slice(start, end);
    if (!chunk.length) {
      continue;
    }

    const firstLine = chunk[0];
    const firstMatch = firstLine.match(boStartRegex);
    if (!firstMatch) {
      continue;
    }

    const boNumber = normalizeBoNumber(firstMatch[1]);
    if (!boNumber || seen.has(boNumber)) {
      continue;
    }

    const remainder = sanitizeValue(firstMatch[2]) || '';
    const flaggedMatch = remainder.match(/^(Sim|N[aã]o)\s*(.*)$/i);
    const flagrante = normalizeFlagrante(flaggedMatch ? flaggedMatch[1] : null);
    const firstTail = (flaggedMatch ? flaggedMatch[2] : remainder).replace(/([a-zà-ÿ0-9\)])([A-ZÁÉÍÓÚÂÊÔÃÕÇ])/g, '$1 $2');

    const trailingLines = chunk.slice(1);
    const localLines = [];
    while (trailingLines.length && isLikelyLocalLine(trailingLines[trailingLines.length - 1])) {
      localLines.unshift(trailingLines.pop());
    }

    const local = sanitizeValue(localLines.join(' '));

    let natureza = sanitizeValue(firstTail);
    let firstVictimHint = null;
    const natureAndNameMatch = firstTail.match(/^(.+?)\s+([A-ZÁÉÍÓÚÂÊÔÃÕÇ]{2,}(?:\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ]{2,})+.*)$/);
    if (natureAndNameMatch) {
      natureza = sanitizeValue(natureAndNameMatch[1]);
      firstVictimHint = sanitizeValue(natureAndNameMatch[2]);
    }

    const namesSource = [firstVictimHint, ...trailingLines].filter((line) => Boolean(line));
    const { victim, author } = splitNamesFromLines(namesSource);

    seen.add(boNumber);
    entries.push({
      boNumber,
      flagrante,
      natureza,
      victim,
      author,
      local,
      victimCpf: null,
      authorCpf: null
    });
  }

  return entries;
}

function parseBoBookContent(rawText) {
  const text = collapseWhitespace(rawText);

  const boNumber = normalizeBoNumber(
    extractByRegex(
      text,
      /(?:numero\s+do\s+bo|n[ºo°]\s*do\s*bo|n[ºo°]\s*bo|bo(?:letim)?\s*(?:de\s+ocorrencia|de\s+ocorrência)?|rdo)\s*[:\-]?\s*([A-Za-z0-9./\-]{4,40})/i
    )
  );

  const natureza = extractByRegex(
    text,
    /(?:natureza(?:\s+da\s+ocorrencia|\s+da\s+ocorrência)?)\s*[:\-]?\s*(.+?)(?=\s+(?:vitima|vítima|autor|autora|indiciado|historico|histórico|data|hora|bairro|local|endereco|endereço)\s*[:\-]|$)/i
  );

  const victim = extractByRegex(
    text,
    /(?:vitima|vítima)\s*[:\-]?\s*(.+?)(?=\s+(?:autor|autora|indiciado|natureza|historico|histórico|data|hora|bairro|local|endereco|endereço)\s*[:\-]|$)/i
  );

  const author = extractByRegex(
    text,
    /(?:autor|autora|indiciado)\s*[:\-]?\s*(.+?)(?=\s+(?:vitima|vítima|natureza|historico|histórico|data|hora|bairro|local|endereco|endereço)\s*[:\-]|$)/i
  );

  const victimCpf = extractCpfByLabel(text, '(?:cpf\s+da\s+vitima|cpf\s+da\s+vítima|vitima|vítima)');
  const authorCpf = extractCpfByLabel(text, '(?:cpf\s+do\s+autor|cpf\s+da\s+autora|autor|autora|indiciado)');

  const hasSomeData = boNumber || natureza || victim || author;

  if (!hasSomeData) {
    const error = new Error('Nao foi possivel extrair dados do Livro de BO.');
    error.statusCode = 422;
    throw error;
  }

  return {
    boNumber,
    flagrante: null,
    natureza,
    victim,
    author,
    local: null,
    victimCpf,
    authorCpf
  };
}

function parseBoBookEntries(rawText) {
  const text = collapseWhitespace(rawText);
  const tableEntries = parseBoTableEntries(rawText);
  if (tableEntries.length > 1) {
    return tableEntries;
  }

  const boNumbers = extractBoNumbers(text, rawText);

  if (!boNumbers.length) {
    return [parseBoBookContent(rawText)];
  }

  if (boNumbers.length === 1) {
    const single = parseBoBookContent(rawText);
    return [{ ...single, boNumber: boNumbers[0] }];
  }

  return boNumbers.map((boNumber) => ({
    boNumber,
    flagrante: null,
    natureza: null,
    victim: null,
    author: null,
    local: null,
    victimCpf: null,
    authorCpf: null
  }));
}

module.exports = {
  parseBoBookContent,
  parseBoBookEntries
};
