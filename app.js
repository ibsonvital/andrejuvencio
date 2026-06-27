const SUPABASE_URL = 'https://qlaukoinddghygpqromk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_XkyUMK06RemURsFy-aVDTw_IZ8HTsPS';
const DEMO_USER = 'andre';
const DEMO_PASSWORD = '123456';
const SUPABASE_USER_BY_LOGIN = {
  andre: 'andre@avanfisio.local',
};

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
const osSearch = document.querySelector('#osSearch');

const planoForm = document.querySelector('#planoForm');
const planoRows = document.querySelector('#planoRows');
const planoMessage = document.querySelector('#planoMessage');
const newPlanoButton = document.querySelector('#newPlanoButton');
const planoSearch = document.querySelector('#planoSearch');
const reportSearch = document.querySelector('#reportSearch');
const osReportRows = document.querySelector('#osReportRows');
const planoReportRows = document.querySelector('#planoReportRows');
const exportOsButton = document.querySelector('#exportOsButton');
const exportPlanoButton = document.querySelector('#exportPlanoButton');
const exportAllButton = document.querySelector('#exportAllButton');
const osDoneMetric = document.querySelector('#osDoneMetric');
const osLateMetric = document.querySelector('#osLateMetric');
const planoDoneMetric = document.querySelector('#planoDoneMetric');
const planoLateMetric = document.querySelector('#planoLateMetric');
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
let demoMode = !clientReady && localStorage.getItem('avanfisio_demo_logged') === 'true';

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

function mergeSeedRecords(key, seedRecords) {
  const currentRecords = readLocalRecords(key);
  const currentIds = new Set(currentRecords.map((record) => record.id));
  const missingSeedRecords = seedRecords.filter((record) => !currentIds.has(record.id));

  if (missingSeedRecords.length) {
    writeLocalRecords(key, [...currentRecords, ...missingSeedRecords]);
  }
}

function isDemoLogin(username, password) {
  return username.trim().toLowerCase() === DEMO_USER && password === DEMO_PASSWORD;
}

function supabaseEmailForLogin(username) {
  const normalized = username.trim().toLowerCase();
  return SUPABASE_USER_BY_LOGIN[normalized] ?? normalized;
}

function seedLocalData() {
  if (!window.AVANFISIO_SEED_DATA) return;
  mergeSeedRecords('avanfisio_controle_os', window.AVANFISIO_SEED_DATA.controle_os ?? []);
  mergeSeedRecords('avanfisio_plano_estrategico', window.AVANFISIO_SEED_DATA.plano_estrategico ?? []);
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
  if (!element) return;
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

function renderBarSummary(elementId, summary) {
  const element = document.querySelector(`#${elementId}`);
  if (!element) return;
  const entries = Object.entries(summary).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const max = Math.max(...entries.map((entry) => entry[1]), 1);

  element.innerHTML = entries.length
    ? entries.map(([label, count]) => `
      <div class="bar-row">
        <span>${escapeText(label)}</span>
        <div class="bar-track"><i style="width: ${(count / max) * 100}%"></i></div>
        <strong>${count}</strong>
      </div>
    `).join('')
    : '<p class="muted">Nenhum registro preenchido ainda.</p>';
}

function toUnifiedRecord(record, type) {
  if (type === 'os') {
    return {
      id: record.id,
      code: record.numero_os,
      unit: record.unidade,
      type: 'O.S.',
      description: record.descricao,
      category: record.categoria,
      responsible: record.responsavel || record.solicitante,
      due: record.data_abertura,
      progress: Number(record.percentual_avanco ?? 0),
      status: record.status,
      priority: record.prioridade,
      created: record.created_at,
    };
  }

  return {
    id: record.id,
    code: record.item,
    unit: record.unidade,
    type: 'Plano',
    description: record.descricao_demanda,
    category: record.categoria,
    responsible: record.responsavel_a3v || record.responsavel_avanfisio,
    due: record.previsao,
    progress: Number(record.percentual_avanco ?? 0),
    status: record.status,
    priority: record.prioridade,
    created: record.created_at,
  };
}

function unifiedRecords() {
  return [
    ...osData.map((record) => toUnifiedRecord(record, 'os')),
    ...planoData.map((record) => toUnifiedRecord(record, 'plano')),
  ];
}

function renderDonut(element, summary) {
  const colors = ['#0b6fb3', '#18a058', '#f59e0b', '#dc2626', '#6d28d9', '#64748b'];
  const entries = Object.entries(summary).filter((entry) => entry[1] > 0);
  const total = entries.reduce((sum, entry) => sum + entry[1], 0);
  if (!total) {
    element.style.setProperty('--donut', 'conic-gradient(#d9e8f5 0 100%)');
    return;
  }

  let cursor = 0;
  const stops = entries.map((entry, index) => {
    const start = cursor;
    cursor += (entry[1] / total) * 100;
    return `${colors[index % colors.length]} ${start}% ${cursor}%`;
  });
  element.style.setProperty('--donut', `conic-gradient(${stops.join(', ')})`);
}

function renderTrend(records) {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
  const average = records.length
    ? Math.round(records.reduce((sum, record) => sum + (Number(record.progress) || 0), 0) / records.length)
    : 0;
  const values = months.map((month, index) => Math.min(100, Math.max(0, average - ((months.length - index - 1) * 6))));

  progressTrend.innerHTML = values.map((value, index) => `
    <div class="trend-point">
      <span style="height: ${Math.max(value, 6)}%"></span>
      <strong>${value}%</strong>
      <small>${months[index]}</small>
    </div>
  `).join('');
}

function renderMiniTable(element, records) {
  element.innerHTML = records.length
    ? records.map((record) => `
      <div class="mini-row">
        <strong>${escapeText(record.code)}</strong>
        <span>${escapeText(record.description || record.category)}</span>
        <em>${escapeText(record.unit)}</em>
      </div>
    `).join('')
    : '<p class="muted">Sem registros para exibir.</p>';
}

function renderSummary() {
  const allRecords = [...osData, ...planoData];
  const osStatuses = countBy(osData, 'status');
  const planoStatuses = countBy(planoData, 'status');
  const osUnits = countBy(osData, 'unidade');
  const planoPriorities = countBy(planoData, 'prioridade');
  const osAndamento = osData.filter((record) => normalizeText(record.status).includes('ANDAMENTO')).length;
  const planoAndamento = planoData.filter((record) => normalizeText(record.status).includes('ANDAMENTO')).length;
  const osAtrasados = osData.filter((record) => normalizeText(record.status).includes('ATRAS')).length;
  const planoAtrasados = planoData.filter((record) => normalizeText(record.status).includes('ATRAS')).length;
  const atrasados = osAtrasados + planoAtrasados;
  const osConcluidos = osData.filter((record) => normalizeText(record.status).includes('CONCL')).length;
  const planoConcluidos = planoData.filter((record) => normalizeText(record.status).includes('CONCL')).length;
  const concluidos = allRecords.filter((record) => normalizeText(record.status).includes('CONCL')).length;

  document.querySelector('#metricOsTotal').textContent = osData.length;
  document.querySelector('#metricPlanoTotal').textContent = planoData.length;
  document.querySelector('#metricOsOpen').textContent = `${osAndamento} em andamento`;
  document.querySelector('#metricPlanoOpen').textContent = `${planoAndamento} em andamento`;
  document.querySelector('#metricEmAndamento').textContent = concluidos;
  document.querySelector('#metricAtrasados').textContent = atrasados;
  if (osDoneMetric) osDoneMetric.textContent = osConcluidos;
  if (osLateMetric) osLateMetric.textContent = osAtrasados;
  if (planoDoneMetric) planoDoneMetric.textContent = planoConcluidos;
  if (planoLateMetric) planoLateMetric.textContent = planoAtrasados;
  renderBarSummary('osStatusBars', osStatuses);
  renderBarSummary('osUnitBars', osUnits);
  renderBarSummary('planoStatusBars', planoStatuses);
  renderBarSummary('planoPriorityBars', planoPriorities);
}

function renderDashboardTable(records) {
  const sorted = [...records].sort((a, b) => normalizeText(a.status).localeCompare(normalizeText(b.status))).slice(0, 80);
  dashboardRows.innerHTML = sorted.length
    ? sorted.map((record) => `
      <tr>
        <td>${escapeText(record.code)}</td>
        <td>${escapeText(record.unit)}</td>
        <td>${escapeText(record.type)}</td>
        <td>${escapeText(record.description)}</td>
        <td>${escapeText(record.category)}</td>
        <td>${escapeText(record.responsible)}</td>
        <td>${escapeText(record.due)}</td>
        <td>${escapeText(formatProgress(record.progress))}</td>
        <td>${escapeText(record.status)}</td>
        <td>${escapeText(record.priority)}</td>
      </tr>
    `).join('')
    : '<tr><td colspan="10">Nenhum registro encontrado.</td></tr>';

  renderMiniTable(nextDueRows, records.filter((record) => !normalizeText(record.status).includes('CONCL')).slice(0, 5));
  renderMiniTable(criticalRows, records.filter((record) => normalizeText(record.priority).includes('CRIT') || normalizeText(record.status).includes('ATRAS')).slice(0, 5));
  renderMiniTable(doneRows, records.filter((record) => normalizeText(record.status).includes('CONCL')).slice(0, 5));
}

function matchesReportSearch(record, term) {
  if (!term) return true;
  return Object.values(record).some((value) => normalizeText(value).includes(term));
}

function renderOsRows() {
  const term = normalizeText(osSearch?.value);
  const filteredRows = osData.filter((record) => matchesReportSearch(record, term));

  osRows.innerHTML = filteredRows.length
    ? filteredRows.map((record) => `
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
    `).join('')
    : '<tr><td colspan="7">Nenhum registro encontrado.</td></tr>';
}

function renderPlanoRows() {
  const term = normalizeText(planoSearch?.value);
  const filteredRows = planoData.filter((record) => matchesReportSearch(record, term));

  planoRows.innerHTML = filteredRows.length
    ? filteredRows.map((record) => `
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
    `).join('')
    : '<tr><td colspan="7">Nenhum registro encontrado.</td></tr>';
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
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; color: #082f57; }
          table { border-collapse: collapse; width: 100%; }
          caption { background: #082f57; color: #fff; font-size: 18px; font-weight: 700; padding: 12px; text-align: left; }
          th { background: #0b6fb3; color: #fff; border: 1px solid #c7d8e8; padding: 8px; text-transform: uppercase; font-size: 12px; }
          td { border: 1px solid #d7e4f0; padding: 7px; font-size: 12px; vertical-align: top; }
          tr:nth-child(even) td { background: #eef7ff; }
        </style>
      </head>
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
  if (demoMode || !clientReady) {
    return username.trim().toLowerCase() === DEMO_USER && password === DEMO_PASSWORD;
  }

  const { error } = await supabaseClient.auth.signInWithPassword({
    email: supabaseEmailForLogin(username),
    password,
  });
  return !error;
}

async function deleteRecord(type, id) {
  if (demoMode || !clientReady) {
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
  if (demoMode || !clientReady) {
    if (!demoMode) return;
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
  if (demoMode || !clientReady) {
    osData = readLocalRecords('avanfisio_controle_os');
    renderOsRows();
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
  renderOsRows();
  renderDashboard();
}

async function loadPlano() {
  if (demoMode || !clientReady) {
    planoData = readLocalRecords('avanfisio_plano_estrategico');
    renderPlanoRows();
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
  renderPlanoRows();
  renderDashboard();
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage(loginMessage, 'Entrando...');

  const username = loginForm.email.value.trim().toLowerCase();
  const password = loginForm.password.value;

  if (!clientReady && isDemoLogin(username, password)) {
    demoMode = true;
    localStorage.setItem('avanfisio_demo_logged', 'true');
    loginForm.reset();
    setMessage(loginMessage, '');
    await refreshSession();
    return;
  }

  if (!clientReady) {
    if (!isDemoLogin(username, password)) {
      setMessage(loginMessage, 'Usuario ou senha invalido.', true);
      return;
    }
  }

  const { error } = await supabaseClient.auth.signInWithPassword({
    email: supabaseEmailForLogin(username),
    password,
  });

  if (error) {
    setMessage(loginMessage, 'Usuario ainda nao existe no Supabase ou senha invalida.', true);
    return;
  }

  loginForm.reset();
  setMessage(loginMessage, '');
  await refreshSession();
});

logoutButton.addEventListener('click', async () => {
  if (clientReady && !demoMode) {
    await supabaseClient.auth.signOut();
  }
  localStorage.removeItem('avanfisio_demo_logged');
  demoMode = false;
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
osSearch.addEventListener('input', renderOsRows);
planoSearch.addEventListener('input', renderPlanoRows);
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

  if (demoMode || !clientReady) {
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

  if (demoMode || !clientReady) {
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
seedLocalData();
refreshSession();
