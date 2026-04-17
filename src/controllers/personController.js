const personService = require('../services/personService');

async function upsert(req, res, next) {
  try {
    const person = await personService.upsertPerson(req.body);
    res.status(200).json(person);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  upsert
};
