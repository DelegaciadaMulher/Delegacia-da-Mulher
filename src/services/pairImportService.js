const fs = require('fs/promises');
const pdfParse = require('pdf-parse');
const { parseBoBookContent } = require('../utils/boBookParser');
const { parseExtratoContent } = require('../utils/extratoParser');
const pairImportRepository = require('../repositories/pairImportRepository');
const personService = require('./personService');

async function extractTextFromPdfFile(filePath) {
  const fileBuffer = await fs.readFile(filePath);
  const data = await pdfParse(fileBuffer);
  return data.text || '';
}

function validatePairFiles(files) {
  const boFiles = files && files.bo;
  const extratoFiles = files && files.extrato;

  if (!boFiles || !boFiles.length || !extratoFiles || !extratoFiles.length) {
    const error = new Error('Envie os dois PDFs: campo bo e campo extrato.');
    error.statusCode = 400;
    throw error;
  }

  return {
    boFile: boFiles[0],
    extratoFile: extratoFiles[0]
  };
}

function resolveTargetBoNumber(boData, extratoData) {
  if (boData.boNumber && extratoData.boNumber && boData.boNumber !== extratoData.boNumber) {
    const error = new Error('BO e Extrato possuem numeros de BO diferentes.');
    error.statusCode = 409;
    throw error;
  }

  const boNumber = boData.boNumber || extratoData.boNumber;

  if (!boNumber) {
    const error = new Error('Nao foi possivel identificar o numero do BO para vinculo.');
    error.statusCode = 422;
    throw error;
  }

  return boNumber;
}

async function upsertPeopleFromBoData(boData) {
  const upserted = [];

  if (boData.victimCpf && boData.victim) {
    const victim = await personService.upsertPerson({
      cpf: boData.victimCpf,
      fullName: boData.victim
    });
    upserted.push({ role: 'VITIMA', person: victim });
  }

  if (boData.authorCpf && boData.author) {
    const author = await personService.upsertPerson({
      cpf: boData.authorCpf,
      fullName: boData.author
    });
    upserted.push({ role: 'AUTOR', person: author });
  }

  return upserted;
}

async function importBoAndExtratoPair(files) {
  const { boFile, extratoFile } = validatePairFiles(files);

  const boText = await extractTextFromPdfFile(boFile.path);
  const extratoText = await extractTextFromPdfFile(extratoFile.path);

  const boData = parseBoBookContent(boText);
  const extratoData = parseExtratoContent(extratoText);
  const boNumber = resolveTargetBoNumber(boData, extratoData);
  const syncedPeople = await upsertPeopleFromBoData(boData);

  const expectedCase = await pairImportRepository.findPendingExpectedCaseByBoNumber(boNumber);

  if (!expectedCase) {
    const error = new Error(`Nenhum expected_case PENDENTE encontrado para o BO ${boNumber}.`);
    error.statusCode = 404;
    throw error;
  }

  const linked = await pairImportRepository.linkPairToExpectedCase({
    expectedCaseId: expectedCase.id,
    boFile,
    extratoFile,
    boData,
    extratoData
  });

  return {
    boData,
    extratoData,
    syncedPeople,
    matchedExpectedCase: linked.expectedCase,
    pairLink: linked.pair
  };
}

module.exports = {
  importBoAndExtratoPair
};
