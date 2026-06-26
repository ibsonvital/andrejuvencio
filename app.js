const SUPABASE_URL = 'COLE_AQUI_A_URL_DO_SUPABASE';
const SUPABASE_ANON_KEY = 'sb_publishable_XkyUMK06RemURsFy-aVDTw_IZ8HTsPS';
const DEMO_USER = 'andre';
const DEMO_PASSWORD = '123456';

const clientReady = SUPABASE_URL.startsWith('http') && SUPABASE_ANON_KEY.length > 40;
const supabaseClient = clientReady ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const loginView = document.querySelector('#loginView');
const appView = document.querySelector('#appView');
const loginForm = document.querySelector('#loginForm');
const loginMessage = document.querySelector('#loginMessage');
const userEmail = document.querySelector('#userEmail');
const logoutButton = document.querySelector('#logoutButton');
const themeToggle = document.querySelector('#themeToggle');
const tabs = document.querySelectorAll('.tab');

const osForm = document.querySelector('#osForm');
const osRows = document.querySelector('#osRows');
const osMessage = document.querySelector('#osMessage');
const newOsButton = document.querySelector('#newOsButton');

const planoForm = document.querySelector('#planoForm');
const planoRows = document.querySelector('#planoRows');
const planoMessage = document.querySelector('#planoMessage');
const newPlanoButton = document.querySelector('#newPlanoButton');
const reportSearch = document.querySelector('#reportSearch');
const osReportRows = document.querySelector('#osReportRows');
const planoReportRows = document.querySelector('#planoReportRows');
const exportOsButton = document.querySelector('#exportOsButton');
const exportPlanoButton = document.querySelector('#exportPlanoButton');
const exportAllButton = document.querySelector('#exportAllButton');
const deleteDialog = document.querySelector('#deleteDialog');
const deleteConfirmForm = document.querySelector('#deleteConfirmForm');
const deleteDialogText = document.querySelector('#deleteDialogText');
const deleteUser = document.querySelector('#deleteUser');
const deletePassword = document.querySelector('#deletePassword');
const deleteMessage = document.querySelector('#deleteMessage');
const cancelDeleteButton = document.querySelector('#cancelDeleteButton');

let currentUser = null;
let osData = [];
let planoData = [];
let pendingDelete = null;

const osFields = [
  'id',
  'numero_os',
  'data_abertura',
  'unidade',
  'solicitante',
  'ambiente',
  'classificacao',
  'categoria',
  'descricao',
  'responsavel',
  'prioridade',
  'status',
  'percentual_avanco',
  'atualizacao_status',
  'observacao',
];

const planoFields = [
  'id',
  'item',
  'unidade',
  'predio',
  'categoria',
  'descricao_demanda',
  'acao',
  'prioridade',
  'responsavel_a3v',
  'responsavel_avanfisio',
  'data_solicitacao',
  'previsao',
  'observacoes',
  'status',
  'percentual_avanco',
  'atualizacao_status',
];

function setMessage(element, text, isError = false) {
  element.textContent = text;
  element.classList.toggle('error', isError);
}

function formToObject(form, fields) {
  const formData = new FormData(form);
  return fields.reduce((payload, field) => {
    if (field === 'id') return payload;
    const value = formData.get(field);
    payload[field] = value === '' ? null : value;
    return payload;
  }, {});
}

function fillForm(form, fields, record) {
  fields.forEach((field) => {
    if (form.elements[field]) {
      form.elements[field].value = record?.[field] ?? '';
    }
  });
}

function escapeText(value) {
  const div = document.createElement('div');
  div.textContent = value ?? '';
  return div.innerHTML;
}

function createId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readLocalRecords(key) {
  return JSON.parse(localStorage.getItem(key) ?? '[]');
}

function writeLocalRecords(key, records) {
  localStorage.setItem(key, JSON.stringify(records));
}

function normalizeText(value) {
  return String(value ?? '').trim().toUpperCase();
}

function countBy(records, field) {
  return records.reduce((summary, record) => {
    const key = normalizeText(record[field]) || 'SEM INFORMACAO';
    summary[key] = (summary[key] ?? 0) + 1;
    return summary;
  }, {});
}

function renderSummaryList(elementId, summary) {
  const element = document.querySelector(`#${elementId}`);
  const entries = Object.entries(summary).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const max = Math.max(...entries.map((entry) => entry[1]), 1);

  element.innerHTML = entries.length
    ? entries.map(([label, count]) => `
      <div class="summary-row">
        <div>
          <strong>${escapeText(label)}</strong>
          <div class="summary-bar"><span style="width: ${(count / max) * 100}%"></span></div>
        </div>
        <span>${count}</span>
      </div>
    `).join('')
    : '<p class="muted">Nenhum registro preenchido ainda.</p>';
}

function renderSummary() {
  const allRecords = [...osData, ...planoData];
  const statuses = countBy(allRecords, 'status');
  const units = countBy(allRecords, 'unidade');
  const andamento = allRecords.filter((record) => normalizeText(record.status).includes('ANDAMENTO')).length;
  const atrasados = allRecords.filter((record) => normalizeText(record.status).includes('ATRAS')).length;

  document.querySelector('#metricOsTotal').textContent = osData.length;
  document.querySelector('#metricPlanoTotal').textContent = planoData.length;
  document.querySelector('#metricEmAndamento').textContent = andamento;
  document.querySelector('#metricAtrasados').textContent = atrasados;
  renderSummaryList('statusSummary', statuses);
  renderSummaryList('unitSummary', units);
}

function matchesReportSearch(record, term) {
  if (!term) return true;
  return Object.values(record).some((value) => normalizeText(value).includes(term));
}

function renderReports() {
  const term = normalizeText(reportSearch?.value);
  const filteredOs = osData.filter((record) => matchesReportSearch(record, term));
  const filteredPlano = planoData.filter((record) => matchesReportSearch(record, term));

  osReportRows.innerHTML = filteredOs.length
    ? filteredOs.map((record) => `
      <tr>
        <td>${escapeText(record.numero_os)}</td>
        <td>${escapeText(record.data_abertura)}</td>
        <td>${escapeText(record.unidade)}</td>
        <td>${escapeText(record.solicitante)}</td>
        <td>${escapeText(record.categoria)}</td>
        <td>${escapeText(record.prioridade)}</td>
        <td>${escapeText(record.status)}</td>
        <td>${escapeText(formatProgress(record.percentual_avanco))}</td>
        <td><button class="danger subtle" data-delete-os="${record.id}" type="button">Apagar</button></td>
      </tr>
    `).join('')
    : '<tr><td colspan="9">Nenhum registro encontrado.</td></tr>';

  planoReportRows.innerHTML = filteredPlano.length
    ? filteredPlano.map((record) => `
      <tr>
        <td>${escapeText(record.item)}</td>
        <td>${escapeText(record.unidade)}</td>
        <td>${escapeText(record.predio)}</td>
        <td>${escapeText(record.categoria)}</td>
        <td>${escapeText(record.prioridade)}</td>
        <td>${escapeText(record.previsao)}</td>
        <td>${escapeText(record.status)}</td>
        <td>${escapeText(formatProgress(record.percentual_avanco))}</td>
        <td><button class="danger subtle" data-delete-plano="${record.id}" type="button">Apagar</button></td>
      </tr>
    `).join('')
    : '<tr><td colspan="9">Nenhum registro encontrado.</td></tr>';
}

function renderDashboard() {
  renderSummary();
  renderReports();
}

function formatProgress(value) {
  if (value === null || value === undefined || value === '') return '';
  return `${value}%`;
}

function tableToWorkbook(title, headers, rows) {
  const head = headers.map((header) => `<th>${escapeText(header.label)}</th>`).join('');
  const body = rows.map((row) => `
    <tr>${headers.map((header) => `<td>${escapeText(row[header.key] ?? '')}</td>`).join('')}</tr>
  `).join('');

  return `
    <html>
      <head><meta charset="utf-8"></head>
      <body>
        <table>
          <caption>${escapeText(title)}</caption>
          <thead><tr>${head}</tr></thead>
          <tbody>${body}</tbody>
        </table>
      </body>
    </html>
  `;
}

function downloadExcel(filename, html) {
  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function exportOs() {
  const headers = [
    { key: 'numero_os', label: 'O.S.' },
    { key: 'data_abertura', label: 'Data de abertura' },
    { key: 'unidade', label: 'Unidade' },
    { key: 'solicitante', label: 'Solicitante' },
    { key: 'ambiente', label: 'Ambiente' },
    { key: 'classificacao', label: 'Classificacao' },
    { key: 'categoria', label: 'Categoria' },
    { key: 'descricao', label: 'Descricao' },
    { key: 'responsavel', label: 'Responsavel' },
    { key: 'prioridade', label: 'Prioridade' },
    { key: 'status', label: 'Status' },
    { key: 'percentual_avanco', label: 'Percentual de avanco' },
    { key: 'atualizacao_status', label: 'Andamento / atualizacao' },
    { key: 'observacao', label: 'Observacao' },
  ];
  const workbook = tableToWorkbook('Controle de O.S.', headers, osData);
  downloadExcel('controle-os-avanfisio.xls', workbook);
}

function exportPlano() {
  const headers = [
    { key: 'item', label: 'Item' },
    { key: 'unidade', label: 'Unidade' },
    { key: 'predio', label: 'Predio' },
    { key: 'categoria', label: 'Categoria' },
    { key: 'descricao_demanda', label: 'Descricao da demanda' },
    { key: 'acao', label: 'Acao' },
    { key: 'prioridade', label: 'Prioridade' },
    { key: 'responsavel_a3v', label: 'Responsavel A3V' },
    { key: 'responsavel_avanfisio', label: 'Responsavel Avanfisio' },
    { key: 'data_solicitacao', label: 'Data da solicitacao' },
    { key: 'previsao', label: 'Previsao' },
    { key: 'observacoes', label: 'Observacoes' },
    { key: 'status', label: 'Status' },
    { key: 'percentual_avanco', label: 'Percentual de avanco' },
    { key: 'atualizacao_status', label: 'Andamento / atualizacao' },
  ];
  const workbook = tableToWorkbook('Plano estrategico', headers, planoData);
  downloadExcel('plano-estrategico-avanfisio.xls', workbook);
}

function exportAll() {
  exportOs();
  setTimeout(exportPlano, 250);
}

function applyTheme(theme) {
  document.body.dataset.theme = theme;
  themeToggle.textContent = theme === 'dark' ? 'Modo claro' : 'Modo escuro';
  localStorage.setItem('avanfisio_theme', theme);
}

function getRecordLabel(type, record) {
  if (type === 'os') return `O.S. ${record?.numero_os ?? ''}`.trim();
  return `item ${record?.item ?? ''}`.trim();
}

function requestDelete(type, id) {
  const source = type === 'os' ? osData : planoData;
  const record = source.find((item) => item.id === id);
  if (!record) return;

  pendingDelete = { type, id };
  deleteDialogText.textContent = `Para apagar ${getRecordLabel(type, record)}, confirme seu usuario e senha. Essa acao nao pode ser desfeita.`;
  deleteConfirmForm.reset();
  setMessage(deleteMessage, '');
  deleteDialog.showModal();
  deleteUser.focus();
}

async function validateDeleteCredentials(username, password) {
  if (!clientReady) {
    return username.trim().toLowerCase() === DEMO_USER && password === DEMO_PASSWORD;
  }

  const { error } = await supabaseClient.auth.signInWithPassword({
    email: username.trim(),
    password,
  });
  return !error;
}

async function deleteRecord(type, id) {
  if (!clientReady) {
    const key = type === 'os' ? 'avanfisio_controle_os' : 'avanfisio_plano_estrategico';
    const records = readLocalRecords(key).filter((record) => record.id !== id);
    writeLocalRecords(key, records);
    if (type === 'os') {
      osForm.reset();
      await loadOs();
    } else {
      planoForm.reset();
      await loadPlano();
    }
    renderDashboard();
    return null;
  }

  const table = type === 'os' ? 'controle_os' : 'plano_estrategico';
  const { error } = await supabaseClient.from(table).delete().eq('id', id);
  if (error) return error;

  if (type === 'os') {
    osForm.reset();
    await loadOs();
  } else {
    planoForm.reset();
    await loadPlano();
  }
  renderDashboard();
  return null;
}

async function refreshSession() {
  if (!clientReady) {
    if (localStorage.getItem('avanfisio_demo_logged') !== 'true') return;
    currentUser = { id: 'demo-andre', email: 'andre' };
    loginView.classList.add('is-hidden');
    appView.classList.remove('is-hidden');
    userEmail.textContent = 'Andre Juvencio';
    await Promise.all([loadOs(), loadPlano()]);
    renderDashboard();
    return;
  }

  const { data } = await supabaseClient.auth.getSession();
  currentUser = data.session?.user ?? null;

  loginView.classList.toggle('is-hidden', Boolean(currentUser));
  appView.classList.toggle('is-hidden', !currentUser);

  if (currentUser) {
    userEmail.textContent = currentUser.email;
    await Promise.all([loadOs(), loadPlano()]);
    renderDashboard();
  }
}

async function loadOs() {
  if (!clientReady) {
    osData = readLocalRecords('avanfisio_controle_os');
    osRows.innerHTML = osData.map((record) => `
      <tr>
        <td>${escapeText(record.numero_os)}</td>
        <td>${escapeText(record.unidade)}</td>
        <td>${escapeText(record.categoria)}</td>
        <td>${escapeText(record.prioridade)}</td>
        <td>${escapeText(record.status)}</td>
        <td>${escapeText(formatProgress(record.percentual_avanco))}</td>
        <td class="row-actions">
          <button class="secondary" data-edit-os="${record.id}" type="button">Editar</button>
          <button class="danger subtle" data-delete-os="${record.id}" type="button">Apagar</button>
        </td>
      </tr>
    `).join('');
    renderDashboard();
    return;
  }

  const { data, error } = await supabaseClient
    .from('controle_os')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    setMessage(osMessage, error.message, true);
    return;
  }

  osData = data ?? [];
  osRows.innerHTML = osData.map((record) => `
    <tr>
      <td>${escapeText(record.numero_os)}</td>
      <td>${escapeText(record.unidade)}</td>
      <td>${escapeText(record.categoria)}</td>
      <td>${escapeText(record.prioridade)}</td>
      <td>${escapeText(record.status)}</td>
      <td>${escapeText(formatProgress(record.percentual_avanco))}</td>
      <td class="row-actions">
        <button class="secondary" data-edit-os="${record.id}" type="button">Editar</button>
        <button class="danger subtle" data-delete-os="${record.id}" type="button">Apagar</button>
      </td>
    </tr>
  `).join('');
  renderDashboard();
}

async function loadPlano() {
  if (!clientReady) {
    planoData = readLocalRecords('avanfisio_plano_estrategico');
    planoRows.innerHTML = planoData.map((record) => `
      <tr>
        <td>${escapeText(record.item)}</td>
        <td>${escapeText(record.unidade)}</td>
        <td>${escapeText(record.categoria)}</td>
        <td>${escapeText(record.prioridade)}</td>
        <td>${escapeText(record.status)}</td>
        <td>${escapeText(formatProgress(record.percentual_avanco))}</td>
        <td class="row-actions">
          <button class="secondary" data-edit-plano="${record.id}" type="button">Editar</button>
          <button class="danger subtle" data-delete-plano="${record.id}" type="button">Apagar</button>
        </td>
      </tr>
    `).join('');
    renderDashboard();
    return;
  }

  const { data, error } = await supabaseClient
    .from('plano_estrategico')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    setMessage(planoMessage, error.message, true);
    return;
  }

  planoData = data ?? [];
  planoRows.innerHTML = planoData.map((record) => `
    <tr>
      <td>${escapeText(record.item)}</td>
      <td>${escapeText(record.unidade)}</td>
      <td>${escapeText(record.categoria)}</td>
      <td>${escapeText(record.prioridade)}</td>
      <td>${escapeText(record.status)}</td>
      <td>${escapeText(formatProgress(record.percentual_avanco))}</td>
      <td class="row-actions">
        <button class="secondary" data-edit-plano="${record.id}" type="button">Editar</button>
        <button class="danger subtle" data-delete-plano="${record.id}" type="button">Apagar</button>
      </td>
    </tr>
  `).join('');
  renderDashboard();
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage(loginMessage, 'Entrando...');

  if (!clientReady) {
    const username = loginForm.email.value.trim().toLowerCase();
    const password = loginForm.password.value;

    if (username !== DEMO_USER || password !== DEMO_PASSWORD) {
      setMessage(loginMessage, 'Usuario ou senha invalido.', true);
      return;
    }

    localStorage.setItem('avanfisio_demo_logged', 'true');
    loginForm.reset();
    setMessage(loginMessage, '');
    await refreshSession();
    return;
  }

  const email = loginForm.email.value;
  const password = loginForm.password.value;
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

  if (error) {
    setMessage(loginMessage, error.message, true);
    return;
  }

  loginForm.reset();
  setMessage(loginMessage, '');
  await refreshSession();
});

logoutButton.addEventListener('click', async () => {
  if (clientReady) {
    await supabaseClient.auth.signOut();
  } else {
    localStorage.removeItem('avanfisio_demo_logged');
  }
  currentUser = null;
  appView.classList.add('is-hidden');
  loginView.classList.remove('is-hidden');
});

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    tabs.forEach((item) => item.classList.remove('is-active'));
    tab.classList.add('is-active');
    document.querySelectorAll('.panel').forEach((panel) => panel.classList.add('is-hidden'));
    document.querySelector(`#${tab.dataset.tab}Panel`).classList.remove('is-hidden');
    renderDashboard();
  });
});

themeToggle.addEventListener('click', () => {
  applyTheme(document.body.dataset.theme === 'dark' ? 'light' : 'dark');
});

reportSearch.addEventListener('input', renderReports);
exportOsButton.addEventListener('click', exportOs);
exportPlanoButton.addEventListener('click', exportPlano);
exportAllButton.addEventListener('click', exportAll);

newOsButton.addEventListener('click', () => {
  osForm.reset();
  osForm.id.value = '';
  osForm.numero_os.focus();
});

newPlanoButton.addEventListener('click', () => {
  planoForm.reset();
  planoForm.id.value = '';
  planoForm.item.focus();
});

osRows.addEventListener('click', (event) => {
  const deleteId = event.target.dataset.deleteOs;
  if (deleteId) {
    requestDelete('os', deleteId);
    return;
  }

  const id = event.target.dataset.editOs;
  if (!id) return;
  fillForm(osForm, osFields, osData.find((record) => record.id === id));
  window.scrollTo({ top: osForm.offsetTop - 20, behavior: 'smooth' });
});

planoRows.addEventListener('click', (event) => {
  const deleteId = event.target.dataset.deletePlano;
  if (deleteId) {
    requestDelete('plano', deleteId);
    return;
  }

  const id = event.target.dataset.editPlano;
  if (!id) return;
  fillForm(planoForm, planoFields, planoData.find((record) => record.id === id));
  window.scrollTo({ top: planoForm.offsetTop - 20, behavior: 'smooth' });
});

osReportRows.addEventListener('click', (event) => {
  const deleteId = event.target.dataset.deleteOs;
  if (deleteId) requestDelete('os', deleteId);
});

planoReportRows.addEventListener('click', (event) => {
  const deleteId = event.target.dataset.deletePlano;
  if (deleteId) requestDelete('plano', deleteId);
});

cancelDeleteButton.addEventListener('click', () => {
  pendingDelete = null;
  deleteDialog.close();
});

deleteConfirmForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!pendingDelete) return;

  setMessage(deleteMessage, 'Conferindo usuario e senha...');
  const allowed = await validateDeleteCredentials(deleteUser.value, deletePassword.value);
  if (!allowed) {
    setMessage(deleteMessage, 'Usuario ou senha invalido. Registro nao apagado.', true);
    return;
  }

  setMessage(deleteMessage, 'Apagando registro...');
  const error = await deleteRecord(pendingDelete.type, pendingDelete.id);
  if (error) {
    setMessage(deleteMessage, error.message, true);
    return;
  }

  pendingDelete = null;
  deleteDialog.close();
});

osForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage(osMessage, 'Salvando...');

  const id = osForm.id.value;
  const payload = formToObject(osForm, osFields);
  payload.created_by = currentUser.id;

  if (!clientReady) {
    const records = readLocalRecords('avanfisio_controle_os');
    if (id) {
      const index = records.findIndex((record) => record.id === id);
      records[index] = { ...records[index], ...payload, id };
    } else {
      records.unshift({ ...payload, id: createId(), created_at: new Date().toISOString() });
    }
    writeLocalRecords('avanfisio_controle_os', records);
    osForm.reset();
    setMessage(osMessage, 'Registro salvo no modo demonstracao.');
    await loadOs();
    renderDashboard();
    return;
  }

  const query = id
    ? supabaseClient.from('controle_os').update(payload).eq('id', id)
    : supabaseClient.from('controle_os').insert(payload);

  const { error } = await query;
  if (error) {
    setMessage(osMessage, error.message, true);
    return;
  }

  osForm.reset();
  setMessage(osMessage, 'Registro salvo.');
  await loadOs();
  renderDashboard();
});

planoForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage(planoMessage, 'Salvando...');

  const id = planoForm.id.value;
  const payload = formToObject(planoForm, planoFields);
  payload.created_by = currentUser.id;

  if (!clientReady) {
    const records = readLocalRecords('avanfisio_plano_estrategico');
    if (id) {
      const index = records.findIndex((record) => record.id === id);
      records[index] = { ...records[index], ...payload, id };
    } else {
      records.unshift({ ...payload, id: createId(), created_at: new Date().toISOString() });
    }
    writeLocalRecords('avanfisio_plano_estrategico', records);
    planoForm.reset();
    setMessage(planoMessage, 'Registro salvo no modo demonstracao.');
    await loadPlano();
    renderDashboard();
    return;
  }

  const query = id
    ? supabaseClient.from('plano_estrategico').update(payload).eq('id', id)
    : supabaseClient.from('plano_estrategico').insert(payload);

  const { error } = await query;
  if (error) {
    setMessage(planoMessage, error.message, true);
    return;
  }

  planoForm.reset();
  setMessage(planoMessage, 'Registro salvo.');
  await loadPlano();
  renderDashboard();
});

applyTheme(localStorage.getItem('avanfisio_theme') ?? 'light');
refreshSession();
