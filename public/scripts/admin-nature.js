const NATURE_ITEMS = [
  'Código Penal – Estupro',
  'Código Penal – Estupro – (art. 213) quando da conduta resulta lesão corporal de natureza grave ou se a vítima é maior de 14 e menor de 18 anos',
  'Código Penal – Estupro – (art. 213) quando cometido para controlar o comportamento social ou sexual da vítima, com concurso de pessoas ou prevalecendo-se de relação de autoridade (art. 226)',
  'Código Penal – Violação sexual mediante fraude – mediante fraude ou outro meio que impeça ou dificulte a livre manifestação de vontade da vítima (art. 215)',
  'Código Penal – Importunação sexual – (art. 215-A) praticar ato libidinoso sem consentimento da vítima, para satisfazer a própria lascívia ou a de terceiro',
  'Código Penal – Assédio sexual – (art. 216-A) prevalecendo-se de condição de superior hierárquico ou ascendência inerentes ao exercício de emprego, cargo ou função',
  'Código Penal – Assédio sexual – (art. 216-A) quando a vítima é menor de 18 anos',
  'Código Penal – Registro não autorizado da intimidade sexual – (art. 216-B) produzir, fotografar, filmar ou registrar cena íntima sem autorização',
  'Código Penal – Registro não autorizado da intimidade sexual – (art. 216-B) parágrafo único realizar montagem para inserir pessoa em cena de nudez ou ato sexual',
  'Código Penal - Estupro de vulneravel (art.217-A)',
  'Código Penal – Estupro de vulneravel (art. 217-A) conjunção carnal ou ato libidinoso com menor de 14 anos',
  'Código Penal – Estupro de vulneravel (art. 217-A) quando a vítima não tem discernimento ou não pode oferecer resistência',
  'Código Penal – Estupro de vulneravel (art. 217-A) se da conduta resulta lesão corporal de natureza grave',
  'Código Penal – Estupro de vulneravel (art. 217-A) se da conduta resulta morte',
  'Código Penal – Estupro de vulneravel (art. 217-A) a presunção absoluta de vulnerabilidade da vítima',
  'Código Penal – Estupro de vulneravel (art. 217-A) crime configurado independentemente do consentimento ou experiência sexual da vítima',
  'Código Penal – Corrupção de menores – (art. 218) induzir menor de 14 anos à prática de ato libidinoso',
  'Código Penal – Satisfação de lascívia mediante presença de criança ou adolescente – art. 218-A praticar ato libidinoso na presença de menor de 14 anos ou induzi-lo a presenciar',
  'Código Penal – Favorecimento da prostituição ou de outra forma de exploração sexual de criança, adolescente ou vulnerável – (art. 218-B) submeter, induzir, atrair ou facilitar a exploração sexual',
  'Código Penal – Favorecimento da prostituição ou exploração sexual – (art. 218-B) I praticar conjunção carnal ou ato libidinoso com adolescente em situação de exploração',
  'Código Penal – Favorecimento da prostituição ou exploração sexual – (art. 218-B) II ser proprietário, gerente ou responsável pelo local da exploração',
  'Código Penal – Divulgação de cena de estupro ou de cena de sexo ou pornografia – (art. 218-C)',
  'Código Penal – Divulgação de cena de estupro ou de cena de sexo ou pornografia – (art. 218-C) divulgar, publicar ou transmitir imagem íntima sem consentimento da vítima',
  'Código Penal – Divulgação de cena íntima – (art. 218-C) quando praticado por pessoa com relação íntima de afeto ou com finalidade de vingança ou humilhação',
  'Código Penal – Mediação para servir à lascívia de outrem – (art. 227) induzir alguém a satisfazer a lascívia de terceiro',
  'Código Penal – Mediação para servir à lascívia de outrem – (art. 227) quando a vítima é maior de 14 e menor de 18 anos ou há relação de autoridade',
  'Código Penal – Favorecimento da prostituição ou outra forma de exploração sexual – (art. 228) induzir, atrair, facilitar ou impedir que alguém abandone a prostituição',
  'Código Penal – Casa de prostituição – (art. 229) manter estabelecimento em que ocorra exploração sexual',
  'Código Penal – Rufianismo – (art. 230) tirar proveito da prostituição alheia, participando de seus lucros',
  'Código Penal – Tráfico de pessoa para fim de exploração sexual – art. 231-A promover, intermediar ou facilitar o deslocamento da vítima para exploração sexual'
];

const NATURE_STORAGE_KEY = 'adminNatureEnabledState';

function readNatureEnabledState() {
  try {
    const raw = localStorage.getItem(NATURE_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    return {};
  }
}

function writeNatureEnabledState(state) {
  localStorage.setItem(NATURE_STORAGE_KEY, JSON.stringify(state));
}

function isNatureEnabled(item, state) {
  if (!state || typeof state !== 'object') {
    return true;
  }

  return state[item] !== false;
}

function countEnabledNatures(state) {
  return NATURE_ITEMS.filter((item) => isNatureEnabled(item, state)).length;
}

function renderNatureList(items, state) {
  const container = document.getElementById('natureList');

  if (!items.length) {
    container.innerHTML = '<p class="muted">Nenhuma natureza encontrada no momento.</p>';
    return;
  }

  container.innerHTML = items
    .map((item, index) => {
      const checkboxId = `nature-toggle-${index + 1}`;
      const enabled = isNatureEnabled(item, state);

      return `
        <article class="item nature-card">
          <div class="nature-card-header">
            <label class="nature-toggle" for="${checkboxId}">
              <input id="${checkboxId}" type="checkbox" data-nature-item="${item}" ${enabled ? 'checked' : ''} />
              <span class="nature-toggle-box" aria-hidden="true"></span>
            </label>
          </div>
          <strong class="nature-title ${enabled ? '' : 'nature-title-disabled'}">${item}</strong>
        </article>
      `;
    })
    .join('');
}

function updateEnabledCount(state) {
  document.getElementById('natureEnabledCount').textContent = String(countEnabledNatures(state));
}

function bindNatureToggleEvents(state) {
  const inputs = document.querySelectorAll('input[data-nature-item]');

  inputs.forEach((input) => {
    input.addEventListener('change', () => {
      const item = input.getAttribute('data-nature-item');
      state[item] = input.checked;
      writeNatureEnabledState(state);
      updateEnabledCount(state);

      const title = input.closest('.nature-card')?.querySelector('.nature-title');
      if (title) {
        title.classList.toggle('nature-title-disabled', !input.checked);
      }
    });
  });
}

function ensureAdminSession() {
  const token = localStorage.getItem('adminAccessToken');
  if (!token) {
    window.location.href = '/admin';
    return false;
  }

  return true;
}

function loadNaturePage() {
  if (!ensureAdminSession()) {
    return;
  }

  const state = readNatureEnabledState();
  document.getElementById('natureTotalCount').textContent = String(NATURE_ITEMS.length);
  updateEnabledCount(state);
  renderNatureList(NATURE_ITEMS, state);
  bindNatureToggleEvents(state);
}

document.getElementById('refreshBtn').addEventListener('click', () => {
  loadNaturePage();
});

loadNaturePage();