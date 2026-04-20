/* ═══════════════════════════════════════════════════════════
      EclesiaSync · JavaScript v3.0
      Segurança backend-first · Permissões via RPC
   ═══════════════════════════════════════════════════════════ */

// ── CONFIGURAÇÃO SUPABASE ────────────────────────────────────
const SUPABASE_URL = 'https://xmemvwegmzykfdimnqbc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtZW12d2VnbXp5a2ZkaW1ucWJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0Nzc1MzEsImV4cCI6MjA5MjA1MzUzMX0.xL2KwbcFLPm8h8Ew3iTmH5WXTaGm_UYp_XIOd-4NX8Q';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── HELPERS ──────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const q = (table) => db.from(table);

const AVATAR_COLORS = ['#3b82f6', '#8b5cf6', '#14b8a6', '#f43f5e', '#f59e0b', '#06b6d4', '#ec4899', '#10b981'];
const avatarColor = name => AVATAR_COLORS[(name || 'A').charCodeAt(0) % AVATAR_COLORS.length];
const initials = name => (name || '?').trim().split(/\s+/).slice(0, 2).map(n => n[0]).join('').toUpperCase();
const escHtml = s => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmtMoney = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtDate = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—';

const toast = (msg, icon = 'success') => Swal.fire({
  toast: true, position: 'top-end', icon, title: msg,
  showConfirmButton: false, timer: 3000, timerProgressBar: true,
  background: '#111827', color: '#f1f5f9',
  iconColor: icon === 'success' ? '#14b8a6' : icon === 'info' ? '#3b82f6' : '#f43f5e'
});
const confirmDialog = (title, text) => Swal.fire({
  title, text, icon: 'warning', showCancelButton: true,
  confirmButtonText: 'Confirmar', cancelButtonText: 'Cancelar'
});
const loadingPage = () => `<div class="loading-page"><div class="spinner"></div><span>Carregando dados...</span></div>`;
const roleCls = r => ({ 'admin': 'role-admin', 'dirigente': 'role-dirigente', 'adjunto': 'role-adjunto', 'usuario': 'role-usuario' }[r] || 'role-usuario');

// ── ESTADO ───────────────────────────────────────────────────
let currentUser = null;
let currentPage = 'dashboard';
let sidebarCollapsed = false;
let mobileOpen = false;
let navState = { view: 'setores', setor: null, cong: null };
let activeRole = 'admin';
let chartInstances = {};
let userSearch = '';
let setorSearch = '';
let permissionsCache = {};   // { permission_code: boolean }
let currentUserSetor = null;
let relFiltroInicio = '';
let relFiltroFim = '';

const CARGOS = ['Pastor Local', 'Pastor Adjunto', 'Presbítero', 'Evangelista', 'Diácono',
  'Adjunto', 'Dirigente', 'Vice-Dirigente', 'Secretária', 'Auxiliar', 'Membro'];

const REGIOES = ['Abreu e Lima', 'Afogados da Ingazeira', 'Afrânio', 'Agrestina', 'Água Preta',
  'Águas Belas', 'Alagoinha', 'Aliança', 'Altinho', 'Amaraji', 'Angelim', 'Araçoiaba', 'Araripina',
  'Arcoverde', 'Barra de Guabiraba', 'Barreiros', 'Belém de Maria', 'Belém do São Francisco',
  'Belo Jardim', 'Betânia', 'Bezerros', 'Bodocó', 'Bom Conselho', 'Bom Jardim', 'Bonito', 'Brejão',
  'Brejinho', 'Brejo da Madre de Deus', 'Buenos Aires', 'Buíque', 'Cabo de Santo Agostinho',
  'Cabrobó', 'Cachoeirinha', 'Caetés', 'Calçado', 'Calumbi', 'Camaragibe', 'Camocim de São Félix',
  'Camutanga', 'Canhotinho', 'Capoeiras', 'Carnaíba', 'Carnaubeira da Penha', 'Carpina', 'Caruaru',
  'Casinhas', 'Catende', 'Cedro', 'Chã de Alegria', 'Chã Grande', 'Condado', 'Correntes', 'Cortês',
  'Cumaru', 'Cupira', 'Custódia', 'Dormentes', 'Escada', 'Exu', 'Feira Nova', 'Fernando de Noronha',
  'Ferreiros', 'Flores', 'Floresta', 'Frei Miguelinho', 'Gameleira', 'Garanhuns', 'Glória do Goitá',
  'Goiana', 'Granito', 'Gravatá', 'Iati', 'Ibimirim', 'Ibirajuba', 'Igarassu', 'Iguaracy',
  'Ilha de Itamaracá', 'Inajá', 'Ingazeira', 'Ipojuca', 'Ipubi', 'Itacuruba', 'Itaíba', 'Itambé',
  'Itapetim', 'Itapissuma', 'Itaquitinga', 'Jaboatão dos Guararapes', 'Jaqueira', 'Jataúba',
  'Jatobá', 'João Alfredo', 'Joaquim Nabuco', 'Jucati', 'Jupi', 'Jurema', 'Lagoa do Carro',
  'Lagoa do Itaenga', 'Lagoa do Ouro', 'Lagoa dos Gatos', 'Lagoa Grande', 'Lajedo', 'Limoeiro',
  'Macaparana', 'Machados', 'Manari', 'Maraial', 'Mirandiba', 'Moreilândia', 'Moreno',
  'Nazaré da Mata', 'Olinda', 'Orobó', 'Orocó', 'Ouricuri', 'Palmares', 'Palmeirina', 'Panelas',
  'Paranatama', 'Parnamirim', 'Passira', 'Paudalho', 'Paulista', 'Pedra', 'Pesqueira', 'Petrolândia',
  'Petrolina', 'Poção', 'Pombos', 'Primavera', 'Quipapá', 'Quixaba', 'Recife', 'Riacho das Almas',
  'Ribeirão', 'Rio Formoso', 'Sairé', 'Salgadinho', 'Salgueiro', 'Saloá', 'Sanharó', 'Santa Cruz',
  'Santa Cruz da Baixa Verde', 'Santa Cruz do Capibaribe', 'Santa Filomena',
  'Santa Maria da Boa Vista', 'Santa Maria do Cambucá', 'Santa Terezinha',
  'São Benedito do Sul', 'São Bento do Una', 'São Caitano', 'São João', 'São Joaquim do Monte',
  'São José da Coroa Grande', 'São José do Belmonte', 'São José do Egito',
  'São Lourenço da Mata', 'São Vicente Férrer', 'Serra Talhada', 'Serrita', 'Sertânia',
  'Sirinhaém', 'Solidão', 'Surubim', 'Tabira', 'Tacaimbó', 'Tacaratu', 'Tamandaré',
  'Taquaritinga do Norte', 'Terezinha', 'Terra Nova', 'Timbaúba', 'Toritama', 'Tracunhaém',
  'Trindade', 'Triunfo', 'Tupanatinga', 'Tuparetama', 'Venturosa', 'Verdejante',
  'Vertente do Lério', 'Vertentes', 'Vicência', 'Vitória de Santo Antão', 'Xexéu'];

const PERM_DESC = {
  'gerenciar_setores': { label: 'Gerenciar Setores', desc: 'Criar, editar e excluir setores' },
  'gerenciar_congregacoes': { label: 'Gerenciar Congregações', desc: 'Criar, editar e excluir congregações' },
  'gerenciar_membros': { label: 'Gerenciar Membros', desc: 'Adicionar, editar e remover membros' },
  'gerenciar_usuarios': { label: 'Gerenciar Usuários', desc: 'Controlar usuários do sistema' },
  'visualizar_dashboard': { label: 'Visualizar Dashboard', desc: 'Acessar o painel principal' },
  'ver_relatorios': { label: 'Ver Relatórios', desc: 'Acessar relatórios e gráficos' },
  'editar_permissoes': { label: 'Editar Permissões', desc: 'Alterar permissões de grupos' },
  'exportar_dados': { label: 'Exportar Dados', desc: 'Exportar dados para PDF' },
  'excluir_registros': { label: 'Excluir Registros', desc: 'Excluir qualquer registro' },
  'registrar_eventos': { label: 'Registrar Eventos', desc: 'Criar cultos, eventos e saídas' },
  'ver_todos_setores': { label: 'Ver Todos os Setores', desc: 'Visualizar dados de todos os setores (somente leitura)' },
  'gerenciar_agenda': { label: 'Gerenciar Agenda', desc: 'Criar e editar agenda da semana' },
};

// ── SISTEMA DE PERMISSÕES (cache local do backend) ─────────────
function isSuperAdmin() { return currentUser?.role === 'admin'; }

function hasPerm(perm) {
  if (isSuperAdmin()) return true;
  return !!permissionsCache[perm];
}

function canSeeAllSetores() {
  if (isSuperAdmin()) return true;
  return hasPerm('ver_todos_setores');
}

// Carrega permissões via RPC backend
async function loadPermissions() {
  if (!currentUser?.id) return;
  try {
    const { data, error } = await db.rpc('get_user_permissions', {
      p_user_id: currentUser.id
    });
    permissionsCache = {};
    if (data && !error) {
      // get_user_permissions retorna perm_code + perm_ativo (evita conflito de nomes no SQL)
      data.forEach(p => { permissionsCache[p.perm_code] = p.perm_ativo; });
    } else {
      // Fallback: tabela legada permissoes
      const { data: legado } = await q('permissoes')
        .select('permissao,ativo')
        .eq('role', currentUser.role);
      (legado || []).forEach(p => {
        // Mapear nomes legados para novos códigos
        const map = {
          'Gerenciar Setores': 'gerenciar_setores',
          'Gerenciar Congregações': 'gerenciar_congregacoes',
          'Gerenciar Membros': 'gerenciar_membros',
          'Gerenciar Usuários': 'gerenciar_usuarios',
          'Visualizar Dashboard': 'visualizar_dashboard',
          'Ver Relatórios': 'ver_relatorios',
          'Editar Permissões': 'editar_permissoes',
          'Exportar Dados': 'exportar_dados',
          'Excluir Registros': 'excluir_registros',
          'Registrar Eventos': 'registrar_eventos',
          'Ver Todos os Setores': 'ver_todos_setores',
          'Gerenciar Agenda': 'gerenciar_agenda',
        };
        const code = map[p.permissao] || p.permissao.toLowerCase().replace(/ /g, '_');
        permissionsCache[code] = p.ativo;
      });
    }
  } catch (e) {
    console.warn('Permissões via RPC indisponíveis, usando fallback:', e);
  }
}

async function loadUserSetor() {
  if (!currentUser?.setor_id) { currentUserSetor = null; return; }
  const { data } = await q('setores').select('*').eq('id', currentUser.setor_id).single();
  currentUserSetor = data || null;
}

// ── LOGIN ────────────────────────────────────────────────────
$('btn-login').addEventListener('click', doLogin);
$('inp-pass').addEventListener('keydown', e => e.key === 'Enter' && doLogin());
$('inp-user').addEventListener('keydown', e => e.key === 'Enter' && $('inp-pass').focus());

async function doLogin() {
  const username = $('inp-user').value.trim();
  const pass = $('inp-pass').value.trim();
  const errEl = $('login-err');
  if (!username || !pass) {
    errEl.textContent = '⚠ Preencha usuário e senha';
    errEl.classList.remove('hidden'); return;
  }
  errEl.classList.add('hidden');
  $('btn-login').disabled = true;
  $('btn-login').innerHTML = '<span class="login-spinner"></span> Entrando...';

  const { data: user, error } = await q('sistema_usuarios')
    .select('*').eq('username', username).eq('senha', pass).eq('ativo', true).single();

  if (error || !user) {
    errEl.textContent = '⚠ Usuário ou senha inválidos';
    errEl.classList.remove('hidden');
    $('btn-login').disabled = false;
    $('btn-login').innerHTML = '→ Entrar no Sistema';
    return;
  }
  localStorage.setItem('ecclesia_user', JSON.stringify(user));
  currentUser = user;
  await loadPermissions();
  await loadUserSetor();
  startApp(user);
}

function startApp(user) {
  currentUser = user;
  $('screen-login').classList.add('hidden');
  $('screen-app').classList.remove('hidden');
  const av = $('user-av');
  av.textContent = initials(user.nome);
  av.style.background = `linear-gradient(135deg,${avatarColor(user.nome)},#8b5cf6)`;
  $('user-name-side').textContent = user.nome.split(' ')[0];
  const rb = $('user-role-side');
  rb.textContent = user.role;
  rb.className = `role-badge ${roleCls(user.role)}`;
  $('topbar-user').textContent = user.nome.split(' ')[0];
  $('topbar-date').textContent = `EclesiaSync · ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}`;
  const ss = $('user-setor-side');
  if (ss) ss.textContent = currentUserSetor ? `📍 ${currentUserSetor.nome}` : (isSuperAdmin() ? '🌐 Todos os Setores' : '⚠ Sem setor');
  navigate('dashboard');
}

// ── SIDEBAR & NAV ────────────────────────────────────────────
$('sidebar-toggle').addEventListener('click', () => {
  sidebarCollapsed = !sidebarCollapsed;
  $('sidebar').classList.toggle('collapsed', sidebarCollapsed);
  $('main-wrap').classList.toggle('collapsed', sidebarCollapsed);
  $('sidebar-toggle').textContent = sidebarCollapsed ? '›' : '‹';
});
$('hamburger').addEventListener('click', () => toggleMobile(true));
$('mob-overlay').addEventListener('click', () => toggleMobile(false));

function toggleMobile(open) {
  mobileOpen = open;
  $('sidebar').classList.toggle('mob-open', open);
  $('mob-overlay').classList.toggle('show', open);
}

document.querySelectorAll('.nav-item').forEach(el => {
  el.addEventListener('click', () => { navigate(el.dataset.page); toggleMobile(false); });
});

$('user-pill').addEventListener('click', async () => {
  const r = await confirmDialog('Sair do sistema', 'Deseja encerrar sua sessão?');
  if (r.isConfirmed) { localStorage.removeItem('ecclesia_user'); location.reload(); }
});

function navigate(page) {
  currentPage = page;
  document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.page === page));
  const titles = { dashboard: 'Dashboard', setores: 'Setores', usuarios: 'Usuários', relatorios: 'Relatórios', permissoes: 'Permissões' };
  $('page-title').textContent = titles[page] || page;
  if (page === 'setores') navState = { view: 'setores', setor: null, cong: null };
  Object.values(chartInstances).forEach(c => c?.destroy?.());
  chartInstances = {};
  const pc = $('page-content');
  pc.style.animation = 'none'; pc.offsetHeight; pc.style.animation = '';
  switch (page) {
    case 'dashboard': renderDashboard(); break;
    case 'setores': renderSetores(); break;
    case 'usuarios': userSearch = ''; renderUsuarios(); break;
    case 'relatorios': renderRelatorios(); break;
    case 'permissoes': renderPermissoes(); break;
  }
}

// ════════════════════════════════════════════════════════════
//  DASHBOARD
// ════════════════════════════════════════════════════════════
async function renderDashboard() {
  if (!hasPerm('visualizar_dashboard')) {
    $('page-content').innerHTML = `<div class="empty"><div class="empty-ico">🔐</div><p>Você não tem permissão para acessar o dashboard.</p></div>`;
    return;
  }
  $('page-content').innerHTML = loadingPage();

  const now = new Date();
  const mesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const inicioMes = `${mesAtual}-01`;
  const fimMes = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

  let qSet = q('setores').select('id', { count: 'exact', head: true });
  let qCong = q('congregacoes').select('id', { count: 'exact', head: true });
  let qMem = q('membros').select('id', { count: 'exact', head: true });
  let qEv = q('eventos').select('*').order('data', { ascending: false });
  let qEvM = q('eventos').select('*').gte('data', inicioMes).lte('data', fimMes);

  if (!canSeeAllSetores() && currentUser?.setor_id) {
    const sid = currentUser.setor_id;
    qSet = qSet.eq('id', sid);
    qCong = qCong.eq('setor_id', sid);
    qMem = qMem.eq('setor_id', sid);
    qEv = qEv.eq('setor_id', sid);
    qEvM = qEvM.eq('setor_id', sid);
  }

  const [rSet, rCong, rMem, rEv, rEvM] = await Promise.all([qSet, qCong, qMem, qEv, qEvM]);
  const eventos = rEv.data || [];
  const eventosMes = rEvM.data || [];

  const totalOferMes = eventosMes.reduce((s, e) => s + (e.ofertas || 0), 0);
  const totalDizMes = eventosMes.reduce((s, e) => s + (e.dizimos || 0), 0);
  const totalConvMes = eventosMes.reduce((s, e) => s + (e.conversoes || 0), 0);
  const totalPartMes = eventosMes.reduce((s, e) => s + (e.participantes || 0), 0);

  const hoje = new Date().toISOString().slice(0, 10);
  const em7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  let qAg = q('agenda_semana').select('*,congregacoes(nome)').gte('data', hoje).lte('data', em7).order('data');
  if (!canSeeAllSetores() && currentUser?.setor_id) {
    qAg = qAg.eq('setor_id', currentUser.setor_id);
  }
  const { data: agendaItems } = await qAg.limit(10);
  const nomeMes = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  $('page-content').innerHTML = `
  <div class="dash-header">
    <div>
      <h2 class="dash-title">Bem-vindo, ${escHtml(currentUser.nome.split(' ')[0])} 👋</h2>
      <p class="dash-sub">${canSeeAllSetores() ? 'Visão geral — todos os setores' : (currentUserSetor ? `Setor: ${escHtml(currentUserSetor.nome)}` : 'Sem setor definido')}</p>
    </div>
    <div class="dash-period">
      <span class="tag tag-gold">📅 ${nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)}</span>
      <span class="tag" style="background:rgba(255,255,255,.05)">Dados do mês atual</span>
    </div>
  </div>
 
  <div class="stats-grid stats-4">
    ${statCard('🏙', 'ic-gold', rSet.count || 0, 'Setores', 'banco de dados')}
    ${statCard('⛪', 'ic-blue', rCong.count || 0, 'Congregações', 'cadastradas')}
    ${statCard('👥', 'ic-teal', rMem.count || 0, 'Membros', 'cadastrados')}
    ${statCard('📋', 'ic-violet', eventosMes.length, 'Eventos', 'este mês')}
  </div>
 
  <div class="sec-hdr" style="margin-top:4px"><h2>Resumo do Mês</h2><span class="tag tag-gold">Atualizado em tempo real</span></div>
  <div class="stats-grid stats-4" style="margin-bottom:28px">
    ${statCard('👥', 'ic-blue', totalPartMes, 'Participantes', 'este mês')}
    ${statCard('✝', 'ic-violet', totalConvMes, 'Conversões', 'este mês')}
    ${statCard('💰', 'ic-teal', fmtMoney(totalOferMes), 'Ofertas', 'este mês')}
    ${statCard('💎', 'ic-gold', fmtMoney(totalDizMes), 'Dízimos', 'este mês')}
  </div>
 
  <div class="charts-grid" style="margin-bottom:28px">
    <div class="chart-card chart-span2">
      <h3>Participantes por Mês</h3><p>Acumulado de todos os eventos do ano</p>
      <canvas id="chart-dash-line" height="100"></canvas>
    </div>
    <div class="chart-card">
      <h3>Tipos de Eventos</h3><p>Cultos, eventos e saídas</p>
      <canvas id="chart-dash-bar" height="180"></canvas>
    </div>
    <div class="chart-card">
      <h3>Financeiro do Mês</h3><p>Ofertas vs Dízimos</p>
      <canvas id="chart-dash-fin" height="180"></canvas>
    </div>
  </div>
 
  <div class="sec-hdr"><h2>📅 Agenda da Semana</h2><span class="tag">Próximos 7 dias</span></div>
  <div class="agenda-strip" style="margin-bottom:28px">${renderAgendaStrip(agendaItems || [])}</div>
 
  <div class="sec-hdr">
    <h2>Eventos Recentes</h2>
    <button class="btn btn-secondary btn-sm" onclick="navigate('relatorios')">Ver todos →</button>
  </div>
  <div class="act-list">
    ${eventos.slice(0, 6).map(e => `
      <div class="act-item">
        <div class="act-dot" style="background:${e.tipo === 'culto' ? 'var(--gold)' : e.tipo === 'saida' ? 'var(--teal)' : 'var(--blue)'}"></div>
        <div class="f1"><div class="fw5">${escHtml(tipoLabel(e.tipo))}</div><div class="fs-xs c3">${escHtml(e.resumo || '')}</div></div>
        <span class="tag">${e.participantes || 0} pessoas</span>
        <span class="act-time">${fmtDate(e.data)}</span>
      </div>`).join('') || '<p class="c3" style="padding:16px">Nenhum evento registrado.</p>'}
  </div>`;

  const byMonth = Array(12).fill(0);
  eventos.forEach(e => { const m = new Date(e.data + 'T00:00:00').getMonth(); byMonth[m] += (e.participantes || 0); });
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  const lCtx = document.getElementById('chart-dash-line');
  if (lCtx) chartInstances.dashLine = new Chart(lCtx, {
    type: 'line',
    data: { labels: meses, datasets: [{ label: 'Participantes', data: byMonth, borderColor: 'var(--gold)', backgroundColor: 'rgba(201,168,76,.1)', tension: .4, fill: true, pointRadius: 4, pointBackgroundColor: 'var(--gold)' }] },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,.03)' } }, y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,.05)' } } } }
  });

  const cultos = eventos.filter(e => e.tipo === 'culto').length;
  const genEvt = eventos.filter(e => e.tipo === 'evento').length;
  const saidas = eventos.filter(e => e.tipo === 'saida').length;
  const bCtx = document.getElementById('chart-dash-bar');
  if (bCtx) chartInstances.dashBar = new Chart(bCtx, {
    type: 'doughnut',
    data: { labels: ['Cultos', 'Eventos', 'Saídas'], datasets: [{ data: [cultos, genEvt, saidas], backgroundColor: ['rgba(201,168,76,.8)', 'rgba(59,130,246,.8)', 'rgba(20,184,166,.8)'], borderWidth: 0, hoverOffset: 6 }] },
    options: { responsive: true, plugins: { legend: { labels: { color: '#94a3b8' }, position: 'bottom' } }, cutout: '60%' }
  });

  const fCtx = document.getElementById('chart-dash-fin');
  if (fCtx) chartInstances.dashFin = new Chart(fCtx, {
    type: 'bar',
    data: { labels: ['Ofertas', 'Dízimos', 'Total'], datasets: [{ data: [totalOferMes, totalDizMes, totalOferMes + totalDizMes], backgroundColor: ['rgba(201,168,76,.8)', 'rgba(20,184,166,.7)', 'rgba(139,92,246,.7)'], borderRadius: 8 }] },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,.03)' } }, y: { ticks: { color: '#94a3b8', callback: v => 'R$' + v.toLocaleString() }, grid: { color: 'rgba(255,255,255,.05)' } } } }
  });
}

function renderAgendaStrip(items) {
  if (!items.length) return `<div class="agenda-empty"><span>📭</span><p>Nenhum evento agendado para os próximos 7 dias</p></div>`;
  return items.map(item => `
    <div class="agenda-item">
      <div class="agenda-date">
        <span class="ag-day">${new Date(item.data + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</span>
        <span class="ag-num">${new Date(item.data + 'T00:00:00').getDate()}</span>
      </div>
      <div class="agenda-body">
        <div class="fw5 fs-sm">${escHtml(item.titulo || '')}</div>
        <div class="fs-xs c3">${escHtml(item.descricao || '')} ${item.congregacoes ? `· ${escHtml(item.congregacoes.nome)}` : ''}</div>
      </div>
      ${item.hora ? `<span class="tag">${item.hora}</span>` : ''}
    </div>`).join('');
}

function statCard(icon, cls, val, label, sub) {
  return `<div class="stat-card"><div class="stat-ico ${cls}">${icon}</div>
  <div><div class="stat-val">${val}</div><div class="stat-lbl">${label}</div><div class="stat-chg">↑ ${sub}</div></div></div>`;
}
function tipoLabel(t) { return { culto: 'Culto', evento: 'Evento', saida: 'Saída Evangelística' }[t] || t || '—'; }

// ════════════════════════════════════════════════════════════
//  SETORES
// ════════════════════════════════════════════════════════════
async function renderSetores() {
  const pc = $('page-content');
  if (navState.view === 'setores') await renderSetoresMain(pc);
  else if (navState.view === 'congregacoes') await renderCongregacoes(pc);
  else if (navState.view === 'congregacao') await renderCongregacao(pc);
}
function breadcrumb() {
  let h = `<div class="breadcrumb"><span class="bc-link" onclick="goSetores()">Setores</span>`;
  if (navState.setor) h += `<span class="bc-sep">›</span><span class="bc-link" onclick="goCongs()">${escHtml(navState.setor.nome)}</span>`;
  if (navState.cong) h += `<span class="bc-sep">›</span><span class="bc-cur">${escHtml(navState.cong.nome)}</span>`;
  return h + '</div>';
}
function goSetores() { navState = { view: 'setores', setor: null, cong: null }; renderSetores(); }
function goCongs() { navState.view = 'congregacoes'; navState.cong = null; renderSetores(); }

async function renderSetoresMain(pc) {
  pc.innerHTML = loadingPage();
  let qSetores = q('setores').select('*').order('nome');
  if (!canSeeAllSetores() && currentUser?.setor_id) {
    qSetores = qSetores.eq('id', currentUser.setor_id);
  }
  const { data: setores, error } = await qSetores;
  if (error) { pc.innerHTML = `<div class="empty"><div class="empty-ico">⚠</div><p>${error.message}</p></div>`; return; }

  const filtered = (setores || []).filter(s => s.nome.toLowerCase().includes(setorSearch.toLowerCase()));
  const [rC, rM] = await Promise.all([
    q('congregacoes').select('setor_id'),
    q('membros').select('setor_id'),
  ]);
  const congCount = id => (rC.data || []).filter(c => c.setor_id === id).length;
  const memCount = id => (rM.data || []).filter(m => m.setor_id === id).length;

  pc.innerHTML = `
  <div class="sec-hdr">
    <h2>Setores <span class="count-badge">${(setores || []).length}</span></h2>
    <div class="sec-actions">
      <div class="search-wrap form-group" style="margin:0">
        <span class="search-ico">🔍</span>
        <input id="setor-search" value="${escHtml(setorSearch)}" placeholder="Buscar setor..." oninput="setorSearch=this.value;renderSetores()" style="width:200px"/>
      </div>
      ${hasPerm('gerenciar_setores') ? `<button class="btn btn-primary btn-sm" onclick="openAddModal('setor')">+ Novo Setor</button>` : ''}
    </div>
  </div>
  ${!canSeeAllSetores() && !isSuperAdmin() ? `<div class="access-notice"><span>🔒</span> Você está visualizando apenas o seu setor.</div>` : ''}
  <div class="cards-grid">
    ${filtered.length ? filtered.map((s, i) => `
      <div class="item-card" style="animation-delay:${i * .05}s" onclick="openSetor('${s.id}','${escHtml(s.nome)}','${s.regiao || ''}')">
        <div class="card-head"><div class="card-ico">🏙</div>
          <div><div class="card-name">${escHtml(s.nome)}</div><div class="card-sub">Região ${s.regiao || '—'}</div></div>
        </div>
        <div class="card-meta">
          <span class="tag tag-gold">⛪ ${congCount(s.id)} Cong.</span>
          <span class="tag tag-blue">👥 ${memCount(s.id)} Membros</span>
        </div>
        <div class="card-actions" onclick="event.stopPropagation()">
          ${hasPerm('excluir_registros') ? `<button class="btn btn-danger btn-sm" onclick="delSetor('${s.id}','${escHtml(s.nome)}')">🗑 Excluir</button>` : ''}
          <button class="btn btn-secondary btn-sm" onclick="openSetor('${s.id}','${escHtml(s.nome)}','${s.regiao || ''}')">→ Abrir</button>
        </div>
      </div>`).join('')
      : '<div class="empty"><div class="empty-ico">🏙</div><p>Nenhum setor encontrado.</p></div>'}
  </div>`;
}

function openSetor(id, nome, regiao) {
  if (!canSeeAllSetores() && currentUser?.setor_id && id !== currentUser.setor_id) {
    toast('Acesso negado a este setor', 'error'); return;
  }
  navState.setor = { id, nome, regiao }; navState.view = 'congregacoes'; navState.cong = null; renderSetores();
}

async function delSetor(id, nome) {
  if (!hasPerm('excluir_registros')) { toast('Sem permissão', 'error'); return; }
  const r = await confirmDialog('Excluir Setor', `"${nome}" e todas as congregações e membros serão removidos.`);
  if (!r.isConfirmed) return;
  const { error } = await q('setores').delete().eq('id', id);
  if (error) { toast(error.message, 'error'); return; }
  toast('Setor excluído!'); renderSetores();
}

// ─ CONGREGAÇÕES ──────────────────────────────────────────────
async function renderCongregacoes(pc) {
  pc.innerHTML = loadingPage();
  const { data: congs, error } = await q('congregacoes').select('*').eq('setor_id', navState.setor.id).order('nome');
  if (error) { pc.innerHTML = `<div class="empty"><div class="empty-ico">⚠</div><p>${error.message}</p></div>`; return; }
  const rM = await q('membros').select('congregacao_id');
  const memCount = id => (rM.data || []).filter(m => m.congregacao_id === id).length;

  pc.innerHTML = `
  ${breadcrumb()}
  <div class="sec-hdr">
    <div><h2>${escHtml(navState.setor.nome)}</h2><h3>Congregações deste setor</h3></div>
    <div class="sec-actions">
      <button class="btn btn-secondary btn-sm" onclick="goSetores()">← Voltar</button>
      ${hasPerm('gerenciar_congregacoes') ? `<button class="btn btn-primary btn-sm" onclick="openAddModal('congregacao')">+ Nova Congregação</button>` : ''}
    </div>
  </div>
  ${(congs || []).length ? `<div class="cards-grid">${(congs || []).map((c, i) => `
    <div class="item-card" style="animation-delay:${i * .05}s" onclick="openCong('${c.id}',${JSON.stringify(c).replace(/"/g, '&quot;')})">
      <div class="card-head"><div class="card-ico">⛪</div>
        <div><div class="card-name">${escHtml(c.nome)}</div><div class="card-sub">${escHtml(c.endereco || '')}</div></div>
      </div>
      <div style="font-size:.77rem;color:var(--txt2);margin:8px 0">👨‍⚖️ ${escHtml(c.pastor_local || 'A definir')}</div>
      <div class="card-meta"><span class="tag tag-teal">👥 ${memCount(c.id)} membros</span></div>
      <div class="card-actions" onclick="event.stopPropagation()">
        ${hasPerm('gerenciar_congregacoes') ? `<button class="btn btn-secondary btn-sm" onclick="openEditCongModal('${c.id}')">✏ Editar</button>` : ''}
        ${hasPerm('excluir_registros') ? `<button class="btn btn-danger btn-sm" onclick="delCong('${c.id}','${escHtml(c.nome)}')">🗑</button>` : ''}
        <button class="btn btn-secondary btn-sm" onclick="openCong('${c.id}',${JSON.stringify(c).replace(/"/g, '&quot;')})">→ Abrir</button>
      </div>
    </div>`).join('')}</div>`
      : '<div class="empty"><div class="empty-ico">⛪</div><p>Nenhuma congregação neste setor.</p></div>'}`;
}

function openCong(id, cObj) {
  const c = typeof cObj === 'string' ? JSON.parse(cObj.replace(/&quot;/g, '"')) : cObj;
  navState.cong = c; navState.view = 'congregacao'; renderSetores();
}
async function delCong(id, nome) {
  if (!hasPerm('excluir_registros')) { toast('Sem permissão', 'error'); return; }
  const r = await confirmDialog('Excluir Congregação', `"${nome}" e seus membros serão removidos.`);
  if (!r.isConfirmed) return;
  const { error } = await q('congregacoes').delete().eq('id', id);
  if (error) { toast(error.message, 'error'); return; }
  toast('Congregação excluída!'); navState.view = 'congregacoes'; navState.cong = null; renderSetores();
}

// ─ EDITAR CONGREGAÇÃO ────────────────────────────────────────
async function openEditCongModal(id) {
  if (!hasPerm('gerenciar_congregacoes')) { toast('Sem permissão', 'error'); return; }
  showModal(`
  <div class="modal-hdr"><span style="font-size:18px">✏</span><h2>Editar Congregação</h2><button class="modal-close" onclick="closeModal()">✕</button></div>
  <div class="modal-body" id="edit-cong-body"><div class="loading-page"><div class="spinner"></div></div></div>`);

  const [{ data: c }, { data: usuarios }] = await Promise.all([
    q('congregacoes').select('*').eq('id', id).single(),
    q('sistema_usuarios').select('id,nome,cargo').order('nome')
  ]);
  if (!c) { closeModal(); toast('Erro ao carregar', 'error'); return; }

  const userOptions = (usuarios || []).map(u => `<option value="${u.id}">${escHtml(u.nome)} (${escHtml(u.cargo || '—')})</option>`).join('');

  $('edit-cong-body').innerHTML = `
  <div class="form-group"><label>Nome *</label><input id="ec-nome" value="${escHtml(c.nome)}"/></div>
  <div class="form-group"><label>Endereço</label><input id="ec-end" value="${escHtml(c.endereco || '')}"/></div>
  <div class="form-group"><label>Pastor Local</label><input id="ec-pastor" value="${escHtml(c.pastor_local || '')}"/></div>
  <div class="form-row">
    <div class="form-group"><label>Latitude</label><input id="ec-lat" type="number" step="0.0000001" value="${c.latitude || ''}" placeholder="-8.2835"/></div>
    <div class="form-group"><label>Longitude</label><input id="ec-lng" type="number" step="0.0000001" value="${c.longitude || ''}" placeholder="-35.1975"/></div>
  </div>
  <div class="form-group">
    <label>Dirigente(s)</label>
    <select id="ec-dirigente" multiple style="height:90px">${userOptions}</select>
    <small class="c3 fs-xs">Segure Ctrl para selecionar múltiplos</small>
  </div>
  <div class="form-group">
    <label>Vice-Dirigente(s)</label>
    <select id="ec-vice" multiple style="height:90px">${userOptions}</select>
  </div>
  <div class="form-group">
    <label>Secretária(s)</label>
    <select id="ec-sec" multiple style="height:90px">${userOptions}</select>
  </div>`;

  const preSelect = (selId, val) => {
    if (!val) return;
    const names = val.split(',').map(s => s.trim());
    const sel = $(selId);
    if (!sel) return;
    [...sel.options].forEach(o => { if (names.some(n => o.text.startsWith(n))) o.selected = true; });
  };
  preSelect('ec-dirigente', c.dirigente);
  preSelect('ec-vice', c.vice_dirigente);
  preSelect('ec-sec', c.secretaria);

  const modal = document.querySelector('.modal');
  if (modal && !modal.querySelector('.modal-foot')) {
    const foot = document.createElement('div'); foot.className = 'modal-foot';
    foot.innerHTML = `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="saveCong('${id}')">💾 Salvar</button>`;
    modal.appendChild(foot);
  }
}

async function saveCong(id) {
  if (!hasPerm('gerenciar_congregacoes')) { toast('Sem permissão', 'error'); return; }
  const nome = ($('ec-nome')?.value || '').trim();
  if (!nome) { toast('Nome obrigatório', 'error'); return; }
  const getSelected = selId => [...($(selId)?.selectedOptions || [])].map(o => o.text.split(' (')[0]).join(', ');
  const payload = {
    nome,
    endereco: ($('ec-end')?.value || '').trim() || null,
    pastor_local: ($('ec-pastor')?.value || '').trim() || null,
    latitude: parseFloat($('ec-lat')?.value) || null,
    longitude: parseFloat($('ec-lng')?.value) || null,
    dirigente: getSelected('ec-dirigente') || null,
    vice_dirigente: getSelected('ec-vice') || null,
    secretaria: getSelected('ec-sec') || null,
  };
  const { error } = await q('congregacoes').update(payload).eq('id', id);
  if (error) { toast(error.message, 'error'); return; }
  closeModal(); toast('Congregação atualizada!');
  if (navState.cong?.id === id) navState.cong = { ...navState.cong, ...payload };
  renderSetores();
}

// ─ CONGREGAÇÃO DETALHE ───────────────────────────────────────
async function renderCongregacao(pc) {
  pc.innerHTML = loadingPage();
  const c = navState.cong;

  const [{ data: mems, error }, { data: eventos }] = await Promise.all([
    q('membros').select('*').eq('congregacao_id', c.id).order('nome'),
    q('eventos').select('*').eq('congregacao_id', c.id).order('data', { ascending: false }),
  ]);
  if (error) { pc.innerHTML = `<div class="empty"><div class="empty-ico">⚠</div><p>${error.message}</p></div>`; return; }

  const totalOfertas = (eventos || []).reduce((s, e) => s + (e.ofertas || 0), 0);
  const totalDizimos = (eventos || []).reduce((s, e) => s + (e.dizimos || 0), 0);

  const hoje = new Date();
  const inicioSemana = new Date(hoje); inicioSemana.setDate(hoje.getDate() - hoje.getDay());
  const fimSemana = new Date(inicioSemana); fimSemana.setDate(inicioSemana.getDate() + 6);
  const { data: agendaSemana } = await q('agenda_semana')
    .select('*').eq('congregacao_id', c.id)
    .gte('data', inicioSemana.toISOString().slice(0, 10))
    .lte('data', fimSemana.toISOString().slice(0, 10))
    .order('data');

  // Links de mapa
  const mapLinks = buildMapLinks(c);

  pc.innerHTML = `
  ${breadcrumb()}
  <div class="sec-hdr">
    <div>
      <h2>${escHtml(c.nome)}</h2>
      <h3>${escHtml(c.endereco || '')}${mapLinks}</h3>
    </div>
    <div class="sec-actions">
      <button class="btn btn-secondary btn-sm" onclick="goCongs()">← Voltar</button>
      ${hasPerm('gerenciar_congregacoes') ? `<button class="btn btn-secondary btn-sm" onclick="openEditCongModal('${c.id}')">✏ Editar</button>` : ''}
      ${hasPerm('gerenciar_membros') ? `<button class="btn btn-secondary btn-sm" onclick="openAddModal('membro')">+ Membro</button>` : ''}
      ${hasPerm('registrar_eventos') ? `
      <div class="dropdown-wrap" style="position:relative">
        <button class="btn btn-primary btn-sm" onclick="toggleEventMenu()">+ Evento ▾</button>
        <div id="event-menu" class="dropdown-menu hidden">
          <div class="dropdown-item" onclick="openEventModal('culto')">⛪ Culto</div>
          <div class="dropdown-item" onclick="openEventModal('evento')">🎉 Evento Genérico</div>
          <div class="dropdown-item" onclick="openEventModal('saida')">🚶 Saída Evangelística</div>
        </div>
      </div>` : ''}
    </div>
  </div>
 
  <div class="struct-grid">
    ${[['👨🏻‍⚖️', 'Pastor Local', c.pastor_local], ['👨🏻‍💼', 'Dirigente', c.dirigente], ['👥', 'Vice-Dirigente', c.vice_dirigente], ['👩‍💼', 'Secretária', c.secretaria]]
      .map(([icon, lbl, val], i) => `<div class="struct-card" style="animation-delay:${i * .07}s"><div class="s-icon">${icon}</div><div class="s-label">${lbl}</div><div class="s-value">${escHtml(val || 'A definir')}</div></div>`).join('')}
  </div>
 
  <div class="stats-grid stats-3" style="margin-bottom:22px">
    ${statCard('📋', 'ic-gold', (eventos || []).length, 'Eventos registrados', '')}
    ${statCard('💰', 'ic-teal', fmtMoney(totalOfertas), 'Total em Ofertas', '')}
    ${statCard('💵', 'ic-violet', fmtMoney(totalDizimos), 'Total em Dízimos', '')}
  </div>
 
  <div class="sec-hdr">
    <h2>📅 Agenda da Semana</h2>
    <div class="sec-actions">
      ${hasPerm('gerenciar_agenda') ? `<button class="btn btn-primary btn-sm" onclick="openAgendaModal('${c.id}')">+ Adicionar</button>` : ''}
      <button class="btn btn-secondary btn-sm" onclick="openAgendaCompleta('${c.id}')">Ver completa →</button>
    </div>
  </div>
  <div class="agenda-semana-grid" id="agenda-semana-${c.id}" style="margin-bottom:28px">
    ${renderAgendaSemanaGrid(agendaSemana || [], inicioSemana, c.id)}
  </div>
 
  <div class="sec-hdr"><h2>Eventos <span class="count-badge">${(eventos || []).length}</span></h2></div>
  ${(eventos || []).length ? `<div class="act-list" style="margin-bottom:28px">
    ${(eventos || []).map(e => `
      <div class="act-item" onclick="openEventDetail('${e.id}')" style="cursor:pointer">
        <div class="act-dot" style="background:${e.tipo === 'culto' ? 'var(--gold)' : e.tipo === 'saida' ? 'var(--teal)' : 'var(--blue)'}"></div>
        <div class="f1"><div class="fw5">${tipoLabel(e.tipo)}</div><div class="fs-xs c3">${escHtml(e.resumo || '')}</div></div>
        <div style="text-align:right">
          <span class="tag">${e.participantes || 0} pessoas</span>
          ${e.tipo === 'culto' ? `<div class="fs-xs c3 mt8">${fmtMoney(e.ofertas || 0)} + ${fmtMoney(e.dizimos || 0)}</div>` : ''}
        </div>
        <span class="act-time">${fmtDate(e.data)}</span>
        ${hasPerm('excluir_registros') ? `<button class="btn btn-danger btn-sm" style="margin-left:8px" onclick="event.stopPropagation();delEvento('${e.id}')">🗑</button>` : ''}
      </div>`).join('')}
  </div>` : '<div class="empty" style="margin-bottom:28px"><div class="empty-ico">📋</div><p>Nenhum evento registrado.</p></div>'}
 
  <div class="sec-hdr"><h2>Membros <span class="count-badge">${(mems || []).length}</span></h2></div>
  ${(mems || []).length ? `<div class="member-list">
    ${(mems || []).map((m, i) => `
      <div class="member-row" style="animation-delay:${i * .04}s" onclick="openMemberModal('${m.id}')">
        <div class="av" style="background:${avatarColor(m.nome)}">${initials(m.nome)}</div>
        <div class="f1"><div class="mem-name">${escHtml(m.nome)}</div><div class="mem-role">${escHtml(m.cargo)} · ${m.idade || '—'} anos</div></div>
        <div class="mem-actions" onclick="event.stopPropagation()">
          <button class="btn btn-teal btn-sm" onclick="openMemberModal('${m.id}')">Ver</button>
          ${hasPerm('excluir_registros') ? `<button class="btn btn-danger btn-sm" onclick="delMembro('${m.id}','${escHtml(m.nome)}')">🗑</button>` : ''}
        </div>
      </div>`).join('')}
  </div>` : '<div class="empty"><div class="empty-ico">👥</div><p>Nenhum membro cadastrado.</p></div>'}`;
}

// ─ LINKS DE MAPA ─────────────────────────────────────────────
function buildMapLinks(c) {
  if (!c.endereco && !c.latitude) return '';
  const query = c.latitude && c.longitude
    ? `${c.latitude},${c.longitude}`
    : encodeURIComponent(c.endereco || c.nome);
  const gmaps = `https://www.google.com/maps/search/?api=1&query=${query}`;
  const waze = c.latitude && c.longitude
    ? `https://waze.com/ul?ll=${c.latitude},${c.longitude}&navigate=yes`
    : `https://waze.com/ul?q=${encodeURIComponent(c.endereco || c.nome)}`;
  return `
    <span class="map-links">
      <a href="${gmaps}" target="_blank" rel="noopener" class="map-btn maps-btn" title="Abrir no Google Maps">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
        Maps
      </a>
      <a href="${waze}" target="_blank" rel="noopener" class="map-btn waze-btn" title="Abrir no Waze">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.54 6.63C19.3 3.88 16.6 2 13.5 2 9.36 2 6 5.36 6 9.5c0 .66.08 1.3.24 1.92l-1.87 1.88c-.59.59-.59 1.54 0 2.13L6 17.06V19c0 1.1.9 2 2 2h2v-2H8v-2.41l-1.29-1.3 2.44-2.44C10.07 13.58 11.24 14 12.5 14c2.49 0 4.5-2.01 4.5-4.5 0-.34-.04-.67-.1-1l2.44 2.44-1.3 1.3V14h-2v2h2c1.1 0 2-.9 2-2v-1.94l1.63-1.63c.59-.59.59-1.54 0-2.13l-1.13-1.67z"/></svg>
        Waze
      </a>
    </span>`;
}

// ─ AGENDA ────────────────────────────────────────────────────
function renderAgendaSemanaGrid(items, inicioSemana, congId) {
  const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  let html = '<div class="agenda-grid-7">';
  for (let d = 0; d < 7; d++) {
    const dia = new Date(inicioSemana); dia.setDate(inicioSemana.getDate() + d);
    const dStr = dia.toISOString().slice(0, 10);
    const item = items.find(i => i.data === dStr);
    const isToday = dStr === new Date().toISOString().slice(0, 10);
    html += `
    <div class="agenda-day${isToday ? ' agenda-today' : ''}">
      <div class="ag-day-head">
        <span class="ag-day-name">${dias[d]}</span>
        <span class="ag-day-num">${dia.getDate()}</span>
      </div>
      <div class="ag-day-body">
        ${item ? `<div class="ag-event-chip" onclick="openAgendaDetail('${item.id}')">${escHtml(item.titulo || item.descricao || '')}</div>` : ''}
        ${hasPerm('gerenciar_agenda') ? `<button class="ag-add-btn" onclick="openAgendaModal('${congId}','${dStr}',${item ? `'${item.id}'` : 'null'})">+</button>` : ''}
      </div>
    </div>`;
  }
  return html + '</div>';
}

async function openAgendaModal(congId, dataPreset = '', editId = null) {
  if (!hasPerm('gerenciar_agenda')) { toast('Sem permissão para gerenciar agenda', 'error'); return; }
  showModal(`
  <div class="modal-hdr"><span style="font-size:18px">📅</span><h2>${editId ? 'Editar' : 'Adicionar'} Agenda</h2><button class="modal-close" onclick="closeModal()">✕</button></div>
  <div class="modal-body">
    <div class="form-group"><label>Data *</label><input id="ag-data" type="date" value="${dataPreset || new Date().toISOString().slice(0, 10)}"/></div>
    <div class="form-group"><label>Título *</label><input id="ag-titulo" placeholder="Ex: Culto de Domingo"/></div>
    <div class="form-group"><label>Horário</label><input id="ag-hora" type="time"/></div>
    <div class="form-group"><label>Descrição</label><textarea id="ag-desc" rows="3" placeholder="Detalhes do evento..."></textarea></div>
  </div>
  <div class="modal-foot">
    <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="saveAgenda('${congId}','${editId || ''}')">💾 Salvar</button>
  </div>`);

  if (editId) {
    const { data: ag } = await q('agenda_semana').select('*').eq('id', editId).single();
    if (ag) { $('ag-data').value = ag.data || ''; $('ag-titulo').value = ag.titulo || ''; $('ag-hora').value = ag.hora || ''; $('ag-desc').value = ag.descricao || ''; }
  }
}

async function saveAgenda(congId, editId) {
  if (!hasPerm('gerenciar_agenda')) { toast('Sem permissão', 'error'); return; }
  const titulo = ($('ag-titulo')?.value || '').trim();
  const data = $('ag-data')?.value;
  if (!titulo || !data) { toast('Título e data são obrigatórios', 'error'); return; }
  const payload = {
    congregacao_id: congId,
    setor_id: navState.setor?.id || null,
    data, titulo,
    hora: $('ag-hora')?.value || null,
    descricao: ($('ag-desc')?.value || '').trim() || null,
  };
  let error;
  if (editId) { ({ error } = await q('agenda_semana').update(payload).eq('id', editId)); }
  else { ({ error } = await q('agenda_semana').insert(payload)); }
  if (error) { toast(error.message, 'error'); return; }
  toast(editId ? 'Agenda atualizada!' : 'Evento adicionado à agenda!');
  closeModal(); renderSetores();
}

async function openAgendaDetail(id) {
  const { data: ag } = await q('agenda_semana').select('*').eq('id', id).single();
  if (!ag) return;
  showModal(`
  <div class="mem-profile">
    <button class="modal-close" style="position:absolute;top:14px;right:14px" onclick="closeModal()">✕</button>
    <div style="font-size:40px;margin-bottom:8px">📅</div>
    <div class="mem-modal-name">${escHtml(ag.titulo || '')}</div>
    <span class="tag tag-gold">${fmtDate(ag.data)}${ag.hora ? ' · ' + ag.hora : ''}</span>
  </div>
  <div style="padding:0 30px 16px">
    ${ag.descricao ? `<p style="color:var(--txt2);font-size:.88rem">${escHtml(ag.descricao)}</p>` : '<p class="c3">Sem descrição adicional.</p>'}
  </div>
  <div class="mem-modal-foot">
    ${hasPerm('gerenciar_agenda') ? `<button class="btn btn-secondary" onclick="openAgendaModal('${ag.congregacao_id}','${ag.data}','${ag.id}');closeModal()">✏ Editar</button>` : ''}
    ${hasPerm('excluir_registros') ? `<button class="btn btn-danger" onclick="delAgenda('${ag.id}')">🗑 Excluir</button>` : ''}
    <button class="btn btn-secondary" onclick="closeModal()">Fechar</button>
  </div>`);
}

async function delAgenda(id) {
  if (!hasPerm('excluir_registros')) { toast('Sem permissão', 'error'); return; }
  const r = await confirmDialog('Excluir Agenda', 'Este item será removido da agenda.');
  if (!r.isConfirmed) return;
  const { error } = await q('agenda_semana').delete().eq('id', id);
  if (error) { toast(error.message, 'error'); return; }
  toast('Removido da agenda!'); closeModal(); renderSetores();
}

async function openAgendaCompleta(congId) {
  showModal(`<div class="modal-hdr"><span>📅</span><h2>Agenda Completa</h2><button class="modal-close" onclick="closeModal()">✕</button></div>
  <div class="modal-body" id="agenda-completa-body"><div class="loading-page"><div class="spinner"></div></div></div>`);
  const mesAtual = new Date();
  const inicio = `${mesAtual.getFullYear()}-${String(mesAtual.getMonth() + 1).padStart(2, '0')}-01`;
  const fim = new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 0).toISOString().slice(0, 10);
  const { data: items } = await q('agenda_semana').select('*').eq('congregacao_id', congId).gte('data', inicio).lte('data', fim).order('data');
  $('agenda-completa-body').innerHTML = `
  <p class="c3 fs-sm" style="margin-bottom:16px">Mês atual — ${mesAtual.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p>
  ${(items || []).length ? (items || []).map(i => `
    <div class="act-item" onclick="openAgendaDetail('${i.id}');closeModal()" style="cursor:pointer;margin-bottom:8px">
      <div class="act-dot" style="background:var(--gold)"></div>
      <div class="f1"><div class="fw5">${escHtml(i.titulo || '')}</div><div class="fs-xs c3">${escHtml(i.descricao || '')}</div></div>
      <span class="act-time">${fmtDate(i.data)}${i.hora ? ' · ' + i.hora : ''}</span>
    </div>`).join('')
      : '<div class="empty"><div class="empty-ico">📅</div><p>Nenhum item na agenda deste mês.</p></div>'}`;
}

// ─ EVENTOS ───────────────────────────────────────────────────
function toggleEventMenu() {
  const m = $('event-menu');
  if (m) m.classList.toggle('hidden');
  const handler = e => { if (!e.target.closest('.dropdown-wrap')) { m?.classList.add('hidden'); document.removeEventListener('click', handler); } };
  setTimeout(() => document.addEventListener('click', handler), 0);
}

async function openEventModal(tipo) {
  if (!hasPerm('registrar_eventos')) { toast('Sem permissão para registrar eventos', 'error'); return; }
  $('event-menu')?.classList.add('hidden');
  const { data: mems } = await q('membros').select('id,nome,cargo').eq('congregacao_id', navState.cong.id).order('nome');
  let qExt = q('membros').select('id,nome,cargo,congregacao_id').order('nome').neq('congregacao_id', navState.cong.id);
  if (!canSeeAllSetores() && currentUser?.setor_id) qExt = qExt.eq('setor_id', currentUser.setor_id);
  const { data: allMems } = await qExt;

  let extraFields = '';
  if (tipo === 'culto') {
    extraFields = `
    <div class="form-row">
      <div class="form-group"><label>Horário de Início</label><input id="ev-inicio" type="time"/></div>
      <div class="form-group"><label>Horário de Término</label><input id="ev-fim" type="time"/></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Vidas Convertidas</label><input id="ev-conversoes" type="number" min="0" placeholder="0"/></div>
      <div class="form-group"><label>Participantes (total)</label><input id="ev-participantes" type="number" min="0" placeholder="0"/></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Ofertas (R$)</label><input id="ev-ofertas" type="number" step="0.01" min="0" placeholder="0,00"/></div>
      <div class="form-group"><label>Dízimos (R$)</label><input id="ev-dizimos" type="number" step="0.01" min="0" placeholder="0,00"/></div>
    </div>`;
  } else if (tipo === 'saida') {
    extraFields = `
    <div class="form-row">
      <div class="form-group"><label>Horário de Início</label><input id="ev-inicio" type="time"/></div>
      <div class="form-group"><label>Horário de Término</label><input id="ev-fim" type="time"/></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Pessoas Evangelizadas</label><input id="ev-evangelizados" type="number" min="0" placeholder="0"/></div>
      <div class="form-group"><label>Vidas Salvas</label><input id="ev-conversoes" type="number" min="0" placeholder="0"/></div>
    </div>
    <div class="form-group"><label>Participantes (equipe)</label><input id="ev-participantes" type="number" min="0" placeholder="0"/></div>`;
  } else {
    extraFields = `<div class="form-group"><label>Participantes (total)</label><input id="ev-participantes" type="number" min="0" placeholder="0"/></div>`;
  }

  const titulos = { culto: 'Registrar Culto', evento: 'Registrar Evento', saida: 'Registrar Saída Evangelística' };
  showModal(`
  <div class="modal-hdr">
    <span style="font-size:18px">${tipo === 'culto' ? '⛪' : tipo === 'saida' ? '🚶' : '🎉'}</span>
    <h2>${titulos[tipo]}</h2>
    <button class="modal-close" onclick="closeModal()">✕</button>
  </div>
  <div class="modal-body">
    <div class="form-group"><label>Data *</label><input id="ev-data" type="date" value="${new Date().toISOString().slice(0, 10)}"/></div>
    <div class="form-group"><label>Resumo</label><textarea id="ev-resumo" rows="2" placeholder="Breve descrição..." style="resize:vertical"></textarea></div>
    ${extraFields}
    <div class="form-group">
      <label>Participantes da Congregação</label>
      <div class="member-select-list" id="ev-mems-local">
        ${(mems || []).map(m => `
          <label class="check-row">
            <input type="checkbox" class="ev-mem-check" value="${m.id}" data-nome="${escHtml(m.nome)}"/>
            <div class="av av-sm" style="background:${avatarColor(m.nome)}">${initials(m.nome)}</div>
            <span>${escHtml(m.nome)} <em class="c3">${escHtml(m.cargo)}</em></span>
          </label>`).join('') || '<p class="c3 fs-xs">Nenhum membro cadastrado.</p>'}
      </div>
    </div>
    <div class="form-group">
      <label>Participantes Externos (mesmo setor)</label>
      <input id="ev-ext-search" placeholder="Buscar por nome..." oninput="filterExtMembers(this.value)" style="margin-bottom:8px"/>
      <div class="member-select-list" id="ev-mems-ext" style="max-height:140px">
        ${(allMems || []).map(m => `
          <label class="check-row ev-ext-row">
            <input type="checkbox" class="ev-ext-check" value="${m.id}" data-nome="${escHtml(m.nome)}"/>
            <div class="av av-sm" style="background:${avatarColor(m.nome)}">${initials(m.nome)}</div>
            <span>${escHtml(m.nome)} <em class="c3">${escHtml(m.cargo)}</em></span>
          </label>`).join('') || '<p class="c3 fs-xs">Sem membros externos.</p>'}
      </div>
    </div>
  </div>
  <div class="modal-foot">
    <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="submitEvento('${tipo}')">✚ Registrar</button>
  </div>`);
}

function filterExtMembers(q2) {
  document.querySelectorAll('.ev-ext-row').forEach(row => {
    const nome = row.querySelector('input')?.dataset.nome?.toLowerCase() || '';
    row.style.display = nome.includes(q2.toLowerCase()) ? '' : 'none';
  });
}

async function submitEvento(tipo) {
  if (!hasPerm('registrar_eventos')) { toast('Sem permissão', 'error'); return; }
  const data = $('ev-data')?.value;
  if (!data) { toast('Data é obrigatória', 'error'); return; }
  const localChecked = [...document.querySelectorAll('.ev-mem-check:checked')].map(c => c.value);
  const extChecked = [...document.querySelectorAll('.ev-ext-check:checked')].map(c => c.value);
  const participanteIds = [...localChecked, ...extChecked];
  const payload = {
    congregacao_id: navState.cong.id,
    setor_id: navState.setor.id,
    tipo, data,
    resumo: ($('ev-resumo')?.value || '').trim(),
    participantes: parseInt($('ev-participantes')?.value) || participanteIds.length || 0,
    hora_inicio: $('ev-inicio')?.value || null,
    hora_fim: $('ev-fim')?.value || null,
    conversoes: parseInt($('ev-conversoes')?.value) || 0,
    ofertas: parseFloat($('ev-ofertas')?.value) || 0,
    dizimos: parseFloat($('ev-dizimos')?.value) || 0,
    evangelizados: parseInt($('ev-evangelizados')?.value) || 0,
    participante_ids: participanteIds,
  };
  const { error } = await q('eventos').insert(payload);
  if (error) { toast(error.message, 'error'); return; }
  toast({ culto: 'Culto registrado!', evento: 'Evento registrado!', saida: 'Saída registrada!' }[tipo]);
  closeModal(); renderSetores();
}

async function openEventDetail(id) {
  showModal(loadingPage());
  const { data: ev, error } = await q('eventos').select('*').eq('id', id).single();
  if (error || !ev) { closeModal(); toast('Erro ao carregar evento', 'error'); return; }
  let participantesHtml = '';
  if (ev.participante_ids?.length > 0) {
    const { data: partics } = await q('membros').select('id,nome,cargo').in('id', ev.participante_ids);
    if ((partics || []).length) {
      participantesHtml = `
      <div style="padding:0 30px 8px">
        <div class="sec-hdr" style="margin-bottom:10px"><h2 style="font-size:.9rem">Participantes (${partics.length})</h2></div>
        <div class="partic-list">
          ${partics.map(p => `
            <div class="partic-row">
              <div class="av av-sm" style="background:${avatarColor(p.nome)}">${initials(p.nome)}</div>
              <span class="fs-sm">${escHtml(p.nome)} <em class="c3 fs-xs">${escHtml(p.cargo || '')}</em></span>
            </div>`).join('')}
        </div>
      </div>`;
    }
  }
  const tipos = { culto: '⛪ Culto', evento: '🎉 Evento', saida: '🚶 Saída Evangelística' };
  let detalhes = '';
  if (ev.tipo === 'culto') {
    detalhes = `<div class="mem-info-grid"><div class="inf-item"><label>Horário</label><span>${ev.hora_inicio || '—'} – ${ev.hora_fim || '—'}</span></div><div class="inf-item"><label>Participantes</label><span>${ev.participantes || 0}</span></div><div class="inf-item"><label>Conversões</label><span>${ev.conversoes || 0}</span></div><div class="inf-item"><label>Ofertas</label><span>${fmtMoney(ev.ofertas)}</span></div><div class="inf-item"><label>Dízimos</label><span>${fmtMoney(ev.dizimos)}</span></div></div>`;
  } else if (ev.tipo === 'saida') {
    detalhes = `<div class="mem-info-grid"><div class="inf-item"><label>Horário</label><span>${ev.hora_inicio || '—'} – ${ev.hora_fim || '—'}</span></div><div class="inf-item"><label>Equipe</label><span>${ev.participantes || 0} pessoas</span></div><div class="inf-item"><label>Evangelizados</label><span>${ev.evangelizados || 0}</span></div><div class="inf-item"><label>Vidas Salvas</label><span>${ev.conversoes || 0}</span></div></div>`;
  } else {
    detalhes = `<div class="mem-info-grid"><div class="inf-item"><label>Participantes</label><span>${ev.participantes || 0}</span></div></div>`;
  }
  showModal(`
  <div class="mem-profile">
    <button class="modal-close" style="position:absolute;top:14px;right:14px" onclick="closeModal()">✕</button>
    <div style="font-size:40px;margin-bottom:8px">${ev.tipo === 'culto' ? '⛪' : ev.tipo === 'saida' ? '🚶' : '🎉'}</div>
    <div class="mem-modal-name">${tipos[ev.tipo] || ev.tipo}</div>
    <span class="tag tag-gold">${fmtDate(ev.data)}</span>
  </div>
  ${detalhes}
  ${ev.resumo ? `<div style="padding:0 30px 8px"><p style="color:var(--txt2);font-size:.88rem">${escHtml(ev.resumo)}</p></div>` : ''}
  ${participantesHtml}
  <div class="mem-modal-foot"><button class="btn btn-secondary" onclick="closeModal()">Fechar</button></div>`);
}

async function delEvento(id) {
  if (!hasPerm('excluir_registros')) { toast('Sem permissão', 'error'); return; }
  const r = await confirmDialog('Excluir Evento', 'Este evento será removido permanentemente.');
  if (!r.isConfirmed) return;
  const { error } = await q('eventos').delete().eq('id', id);
  if (error) { toast(error.message, 'error'); return; }
  toast('Evento removido!'); renderSetores();
}

// ─ MEMBROS ───────────────────────────────────────────────────
async function openMemberModal(id) {
  showModal(loadingPage());
  const { data: m, error } = await q('membros').select('*').eq('id', id).single();
  if (error || !m) { closeModal(); toast('Erro ao carregar membro', 'error'); return; }
  showModal(`
  <div class="mem-profile">
    <button class="modal-close" style="position:absolute;top:14px;right:14px" onclick="closeModal()">✕</button>
    <div class="mem-av-lg" style="background:${avatarColor(m.nome)}">${initials(m.nome)}</div>
    <div class="mem-modal-name">${escHtml(m.nome)}</div>
    <span class="tag tag-gold">${escHtml(m.cargo)}</span>
  </div>
  <div class="mem-info-grid">
    <div class="inf-item"><label>Idade</label><span>${m.idade || '—'} anos</span></div>
    <div class="inf-item"><label>Telefone</label><span>${escHtml(m.telefone || '—')}</span></div>
    <div class="inf-item"><label>Email</label><span style="font-size:.78rem">${escHtml(m.email || '—')}</span></div>
    <div class="inf-item"><label>Batismo</label><span>${m.data_batismo ? fmtDate(m.data_batismo) : '—'}</span></div>
  </div>
  <div class="mem-modal-foot">
    ${m.telefone ? `<a href="https://wa.me/${m.telefone.replace(/\D/g, '')}" target="_blank" class="btn btn-teal">📱 WhatsApp</a>` : ''}
    ${hasPerm('gerenciar_membros') ? `<button class="btn btn-secondary" onclick="openEditMembro('${m.id}')">✏ Editar</button>` : ''}
    <button class="btn btn-secondary" onclick="closeModal()">Fechar</button>
  </div>`);
}

function openEditMembro(id) {
  if (!hasPerm('gerenciar_membros')) { toast('Sem permissão', 'error'); return; }
  showModal(`
  <div class="modal-hdr"><span style="font-size:18px">✏</span><h2>Editar Membro</h2><button class="modal-close" onclick="closeModal()">✕</button></div>
  <div class="modal-body" id="edit-mem-body"><div class="loading-page"><div class="spinner"></div></div></div>`);
  q('membros').select('*').eq('id', id).single().then(({ data: m }) => {
    if (!m) return;
    $('edit-mem-body').innerHTML = `
    <div class="form-group"><label>Nome</label><input id="em-nome" value="${escHtml(m.nome)}"/></div>
    <div class="form-row">
      <div class="form-group"><label>Cargo</label><select id="em-cargo">${CARGOS.map(c => `<option${c === m.cargo ? ' selected' : ''}>${c}</option>`).join('')}</select></div>
      <div class="form-group"><label>Idade</label><input id="em-idade" type="number" value="${m.idade || ''}"/></div>
    </div>
    <div class="form-group"><label>Telefone</label><input id="em-tel" value="${escHtml(m.telefone || '')}"/></div>
    <div class="form-group"><label>Email</label><input id="em-email" value="${escHtml(m.email || '')}"/></div>`;
    const modal = document.querySelector('.modal');
    if (modal && !modal.querySelector('.modal-foot')) {
      const foot = document.createElement('div'); foot.className = 'modal-foot';
      foot.innerHTML = `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="saveMembro('${id}')">💾 Salvar</button>`;
      modal.appendChild(foot);
    }
  });
}

async function saveMembro(id) {
  if (!hasPerm('gerenciar_membros')) { toast('Sem permissão', 'error'); return; }
  const payload = {
    nome: ($('em-nome')?.value || '').trim(),
    cargo: $('em-cargo')?.value,
    idade: parseInt($('em-idade')?.value) || null,
    telefone: ($('em-tel')?.value || '').trim(),
    email: ($('em-email')?.value || '').trim(),
  };
  if (!payload.nome) { toast('Nome obrigatório', 'error'); return; }
  const { error } = await q('membros').update(payload).eq('id', id);
  if (error) { toast(error.message, 'error'); return; }
  closeModal(); toast('Membro atualizado!');
  if (currentPage === 'setores') renderSetores();
}

async function delMembro(id, nome) {
  if (!hasPerm('excluir_registros')) { toast('Sem permissão', 'error'); return; }
  const r = await confirmDialog('Remover Membro', `"${nome}" será removido permanentemente.`);
  if (!r.isConfirmed) return;
  const { error } = await q('membros').delete().eq('id', id);
  if (error) { toast(error.message, 'error'); return; }
  toast('Membro removido!'); renderSetores();
}

// ─ ADD MODAL ─────────────────────────────────────────────────
function openAddModal(type) {
  const labels = { setor: 'Novo Setor', congregacao: 'Nova Congregação', membro: 'Novo Membro' };
  let body = '';
  if (type === 'setor') {
    body = `<div class="form-group"><label>Nome do Setor *</label><input id="add-nome" placeholder="Ex: Setor Alpha"/></div>
    <div class="form-group"><label>Região</label><select id="add-reg">${REGIOES.map(r => `<option>${r}</option>`).join('')}</select></div>`;
  } else if (type === 'congregacao') {
    body = `<div class="form-group"><label>Nome *</label><input id="add-nome" placeholder="Nome da congregação"/></div>
    <div class="form-group"><label>Endereço</label><input id="add-end" placeholder="Rua, número — Bairro"/></div>
    <div class="form-group"><label>Pastor Local</label><input id="add-past" placeholder="Nome do pastor"/></div>
    <div class="form-row">
      <div class="form-group"><label>Latitude (opcional)</label><input id="add-lat" type="number" step="0.0000001" placeholder="-8.2835"/></div>
      <div class="form-group"><label>Longitude (opcional)</label><input id="add-lng" type="number" step="0.0000001" placeholder="-35.1975"/></div>
    </div>`;
  } else {
    body = `<div class="form-group"><label>Nome Completo *</label><input id="add-nome" placeholder="Nome completo"/></div>
    <div class="form-row">
      <div class="form-group"><label>Cargo</label><select id="add-cargo">${CARGOS.map(c => `<option>${c}</option>`).join('')}</select></div>
      <div class="form-group"><label>Idade</label><input id="add-idade" type="number" placeholder="25"/></div>
    </div>
    <div class="form-group"><label>Telefone</label><input id="add-tel" placeholder="5585999999999"/></div>
    <div class="form-group"><label>Email</label><input id="add-email" type="email" placeholder="email@exemplo.com"/></div>`;
  }
  showModal(`
  <div class="modal-hdr"><span style="font-size:18px">✚</span><h2>${labels[type]}</h2><button class="modal-close" onclick="closeModal()">✕</button></div>
  <div class="modal-body">${body}</div>
  <div class="modal-foot">
    <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="submitAdd('${type}')">✚ Criar</button>
  </div>`);
  setTimeout(() => { const n = $('add-nome'); if (n) n.focus(); }, 100);
}

async function submitAdd(type) {
  const nome = ($('add-nome')?.value || '').trim();
  if (!nome) { toast('Nome é obrigatório', 'error'); return; }
  let error;
  if (type === 'setor') {
    if (!hasPerm('gerenciar_setores')) { toast('Sem permissão', 'error'); return; }
    ({ error } = await q('setores').insert({ nome, regiao: $('add-reg').value }));
  } else if (type === 'congregacao') {
    if (!hasPerm('gerenciar_congregacoes')) { toast('Sem permissão', 'error'); return; }
    ({ error } = await q('congregacoes').insert({
      nome, setor_id: navState.setor.id,
      endereco: $('add-end')?.value || null,
      pastor_local: $('add-past')?.value || null,
      latitude: parseFloat($('add-lat')?.value) || null,
      longitude: parseFloat($('add-lng')?.value) || null,
    }));
  } else {
    if (!hasPerm('gerenciar_membros')) { toast('Sem permissão', 'error'); return; }
    ({ error } = await q('membros').insert({
      nome, congregacao_id: navState.cong.id, setor_id: navState.setor.id,
      cargo: $('add-cargo').value, idade: parseInt($('add-idade')?.value) || null,
      telefone: $('add-tel')?.value || null, email: $('add-email')?.value || null
    }));
  }
  if (error) { toast(error.message, 'error'); return; }
  toast({ setor: 'Setor criado!', congregacao: 'Congregação criada!', membro: 'Membro adicionado!' }[type]);
  closeModal(); renderSetores();
}

// ════════════════════════════════════════════════════════════
//  USUÁRIOS
// ════════════════════════════════════════════════════════════
async function renderUsuarios() {
  if (!hasPerm('gerenciar_usuarios')) {
    $('page-content').innerHTML = `<div class="empty"><div class="empty-ico">🔐</div><p>Você não tem permissão para acessar esta área.</p></div>`; return;
  }
  $('page-content').innerHTML = loadingPage();
  const { data, error } = await q('sistema_usuarios').select('*').order('nome');
  if (error) { $('page-content').innerHTML = `<div class="empty"><div class="empty-ico">⚠</div><p>${error.message}</p></div>`; return; }
  const { data: setores } = await q('setores').select('id,nome').order('nome');
  const usuarios = (data || []).filter(u => u.nome.toLowerCase().includes(userSearch.toLowerCase()));
  const setorNome = id => (setores || []).find(s => s.id === id)?.nome || '—';

  $('page-content').innerHTML = `
  <div class="sec-hdr">
    <h2>Usuários do Sistema</h2>
    <div class="sec-actions">
      <div class="search-wrap form-group" style="margin:0">
        <span class="search-ico">🔍</span>
        <input value="${escHtml(userSearch)}" placeholder="Buscar usuário..." oninput="userSearch=this.value;renderUsuarios()" style="width:200px"/>
      </div>
      <button class="btn btn-primary btn-sm" onclick="openUserModal(null)">+ Novo Usuário</button>
    </div>
  </div>
  <div class="tbl-wrap"><div class="tbl-scroll">
    <table>
      <thead><tr><th>Usuário</th><th>Username</th><th>Cargo</th><th>Setor</th><th>Congregação</th><th>Acesso</th><th>Status</th><th>Ações</th></tr></thead>
      <tbody>
        ${usuarios.map(u => `
          <tr>
            <td data-label="Usuário"><div class="flex items-center gap8">
              <div class="av av-sm" style="background:${avatarColor(u.nome)}">${initials(u.nome)}</div>
              <div><div class="fw5 fs-sm">${escHtml(u.nome)}</div><div class="fs-xs c3">${u.idade || '—'} anos</div></div>
            </div></td>
            <td data-label="Username" class="fs-sm c2">${escHtml(u.username || '—')}</td>
            <td data-label="Cargo" class="fs-sm">${escHtml(u.cargo || '—')}</td>
            <td data-label="Setor" class="fs-sm c2">${u.setor_id ? setorNome(u.setor_id) : '<span class="tag tag-rose">Sem setor</span>'}</td>
            <td data-label="Congregação" class="fs-sm c2">${escHtml(u.congregacao || '—')}</td>
            <td data-label="Acesso"><span class="role-badge ${roleCls(u.role)}">${u.role}</span></td>
            <td data-label="Status"><span class="tag ${u.ativo ? 'tag-teal' : 'tag-rose'}">${u.ativo ? 'Ativo' : 'Inativo'}</span></td>
            <td class="td-no-label"><div class="td-act">
              <button class="btn btn-secondary btn-sm" onclick="openUserModal('${u.id}')">✏</button>
              ${isSuperAdmin() ? `<button class="btn btn-secondary btn-sm" onclick="openUserPermModal('${u.id}','${escHtml(u.nome)}')">🔐</button>` : ''}
              <button class="btn btn-danger btn-sm" onclick="delUser('${u.id}','${escHtml(u.nome)}')">🗑</button>
            </div></td>
          </tr>`).join('')}
      </tbody>
    </table>
  </div></div>`;
}

function openUserModal(id) {
  const ROLES = ['admin', 'dirigente', 'adjunto', 'usuario'];
  showModal(`
  <div class="modal-hdr"><span style="font-size:18px">👤</span><h2>${id ? 'Editar Usuário' : 'Novo Usuário'}</h2>
    <button class="modal-close" onclick="closeModal()">✕</button></div>
  <div class="modal-body" id="user-modal-body">
    ${id ? '<div class="loading-page"><div class="spinner"></div></div>' : userFormHtml(null, ROLES)}
  </div>
  <div class="modal-foot" id="user-modal-foot">
    ${id ? '' : `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="saveUser(null)">💾 Salvar</button>`}
  </div>`);
  if (id) {
    Promise.all([
      q('sistema_usuarios').select('*').eq('id', id).single(),
      q('setores').select('id,nome').order('nome')
    ]).then(([{ data: u }, { data: setores }]) => {
      if (!u) return;
      $('user-modal-body').innerHTML = userFormHtml(u, ROLES, setores || []);
      $('user-modal-foot').innerHTML = `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="saveUser('${id}')">💾 Salvar</button>`;
    });
  } else {
    q('setores').select('id,nome').order('nome').then(({ data: setores }) => {
      $('user-modal-body').innerHTML = userFormHtml(null, ROLES, setores || []);
    });
  }
  setTimeout(() => { const n = $('um-name'); if (n) n.focus(); }, 200);
}

function userFormHtml(u, ROLES, setores = []) {
  return `
  <div class="form-group"><label>Nome Completo *</label><input id="um-name" value="${escHtml(u?.nome || '')}" placeholder="Nome completo"/></div>
  <div class="form-group"><label>Username *</label><input id="um-username" value="${escHtml(u?.username || '')}" placeholder="login do usuário"/></div>
  <div class="form-group"><label>Senha ${!u ? '*' : '(deixe vazio para manter)'}</label><input id="um-pass" type="password" placeholder="Digite a senha"/></div>
  <div class="form-row">
    <div class="form-group"><label>Idade</label><input id="um-age" type="number" value="${u?.idade || ''}"/></div>
    <div class="form-group"><label>Tipo de Acesso</label>
      <select id="um-role">${ROLES.map(r => `<option value="${r}" ${r === (u?.role || 'usuario') ? 'selected' : ''}>${r}</option>`).join('')}</select>
    </div>
  </div>
  <div class="form-group"><label>Setor *</label>
    <select id="um-setor">
      <option value="">— Selecione o setor —</option>
      ${setores.map(s => `<option value="${s.id}" ${s.id === u?.setor_id ? 'selected' : ''}>${escHtml(s.nome)}</option>`).join('')}
    </select>
  </div>
  <div class="form-group"><label>Cargo na Igreja</label>
    <select id="um-cargo">${CARGOS.map(c => `<option ${c === (u?.cargo || 'Membro') ? 'selected' : ''}>${c}</option>`).join('')}</select>
  </div>
  <div class="form-group"><label>Congregação</label><input id="um-cong" value="${escHtml(u?.congregacao || 'Sede Central')}"/></div>
  <div class="form-group"><label>Status</label>
    <select id="um-ativo">
      <option value="true" ${u?.ativo !== false ? 'selected' : ''}>Ativo</option>
      <option value="false" ${u?.ativo === false ? 'selected' : ''}>Inativo</option>
    </select>
  </div>`;
}

async function saveUser(id) {
  const nome = ($('um-name')?.value || '').trim();
  const username = ($('um-username')?.value || '').trim();
  const senha = ($('um-pass')?.value || '').trim();
  const setorId = $('um-setor')?.value || null;
  if (!nome || !username) { toast('Nome e username são obrigatórios', 'error'); return; }
  if (!id && !senha) { toast('Senha é obrigatória', 'error'); return; }
  const payload = {
    nome, username,
    role: $('um-role').value,
    cargo: $('um-cargo').value,
    congregacao: $('um-cong').value,
    idade: parseInt($('um-age')?.value) || null,
    ativo: $('um-ativo').value === 'true',
    setor_id: setorId || null,
  };
  if (senha) payload.senha = senha;
  const { error } = id
    ? await q('sistema_usuarios').update(payload).eq('id', id)
    : await q('sistema_usuarios').insert(payload);
  if (error) { toast(error.message, 'error'); return; }
  closeModal(); toast(id ? 'Usuário atualizado!' : 'Usuário criado!'); renderUsuarios();
}

async function delUser(id, nome) {
  if (!isSuperAdmin() && !hasPerm('gerenciar_usuarios')) { toast('Sem permissão', 'error'); return; }
  const r = await confirmDialog('Remover Usuário', `"${nome}" será removido do sistema.`);
  if (!r.isConfirmed) return;
  const { error } = await q('sistema_usuarios').delete().eq('id', id);
  if (error) { toast(error.message, 'error'); return; }
  toast('Usuário removido!'); renderUsuarios();
}

// ─ PERMISSÕES INDIVIDUAIS DE USUÁRIO ────────────────────────
async function openUserPermModal(userId, userName) {
  if (!isSuperAdmin()) { toast('Apenas admin pode alterar permissões individuais', 'error'); return; }
  showModal(`
  <div class="modal-hdr"><span>🔐</span><h2>Permissões — ${escHtml(userName)}</h2><button class="modal-close" onclick="closeModal()">✕</button></div>
  <div class="modal-body" id="uperm-body"><div class="loading-page"><div class="spinner"></div></div></div>`);

  const [{ data: rp }, { data: up }, { data: userRow }] = await Promise.all([
    q('role_permissions').select('permission_code,ativo'),
    q('user_permissions').select('permission_code,ativo').eq('user_id', userId),
    q('sistema_usuarios').select('role').eq('id', userId).single(),
  ]);

  const role = userRow?.role || 'usuario';
  const rolePerms = {};
  (rp || []).filter(p => p).forEach(p => { rolePerms[p.permission_code] = p.ativo; });
  const userOverrides = {};
  (up || []).forEach(p => { userOverrides[p.permission_code] = p.ativo; });

  const resolved = {};
  Object.keys(PERM_DESC).forEach(code => {
    resolved[code] = userOverrides.hasOwnProperty(code) ? userOverrides[code] : (rolePerms[code] || false);
  });

  $('uperm-body').innerHTML = `
  <p class="c3 fs-sm" style="margin-bottom:14px">Permissões específicas para este usuário. Sobrescreve as do grupo <span class="role-badge ${roleCls(role)}">${role}</span>.</p>
  ${Object.entries(PERM_DESC).map(([code, { label, desc }]) => {
    const on = !!resolved[code];
    const isOverride = userOverrides.hasOwnProperty(code);
    return `
    <div class="perm-row">
      <div class="perm-lbl">
        <strong>${label} ${isOverride ? '<span class="tag tag-gold" style="font-size:.6rem">override</span>' : ''}</strong>
        <span>${desc}</span>
      </div>
      <div class="toggle-sw${on ? ' on' : ''}" onclick="toggleUserPerm('${userId}','${code}',${on})"></div>
    </div>`;
  }).join('')}`;
}

async function toggleUserPerm(userId, perm, current) {
  if (!isSuperAdmin()) { toast('Sem permissão', 'error'); return; }
  const novoValor = !current;
  try {
    const { error } = await db.rpc('toggle_user_permission', {
      p_target_user: userId, p_perm: perm, p_ativo: novoValor
    });
    if (error) throw error;
  } catch (e) {
    // Fallback direto
    const { error } = await q('user_permissions')
      .upsert({ user_id: userId, permission_code: perm, ativo: novoValor }, { onConflict: 'user_id,permission_code' });
    if (error) { toast(error.message, 'error'); return; }
  }
  toast(`Permissão ${novoValor ? 'concedida' : 'removida'}`);
  const userName = document.querySelector('#modal-container .modal-hdr h2')?.textContent.replace('Permissões — ', '') || '';
  openUserPermModal(userId, userName);
}

// ════════════════════════════════════════════════════════════
//  RELATÓRIOS
// ════════════════════════════════════════════════════════════
async function renderRelatorios() {
  if (!hasPerm('ver_relatorios')) {
    $('page-content').innerHTML = `<div class="empty"><div class="empty-ico">🔐</div><p>Você não tem permissão para acessar relatórios.</p></div>`; return;
  }
  $('page-content').innerHTML = loadingPage();
  const now = new Date();
  if (!relFiltroInicio) relFiltroInicio = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  if (!relFiltroFim) relFiltroFim = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

  let qEv = q('eventos').select('*').order('data', { ascending: false }).gte('data', relFiltroInicio).lte('data', relFiltroFim);
  let qCong = q('congregacoes').select('id,nome,setor_id');
  let qSet = q('setores').select('id,nome');
  let qMem = q('membros').select('congregacao_id,setor_id');

  if (!canSeeAllSetores() && currentUser?.setor_id) {
    const sid = currentUser.setor_id;
    qEv = qEv.eq('setor_id', sid);
    qCong = qCong.eq('setor_id', sid);
    qSet = qSet.eq('id', sid);
    qMem = qMem.eq('setor_id', sid);
  }

  const [rEv, rCong, rSet, rMem] = await Promise.all([qEv, qCong, qSet, qMem]);
  const eventos = rEv.data || [], congs = rCong.data || [], setores = rSet.data || [];
  const memCount = id => (rMem.data || []).filter(m => m.congregacao_id === id).length;

  const cultos = eventos.filter(e => e.tipo === 'culto').length;
  const genEvt = eventos.filter(e => e.tipo === 'evento').length;
  const saidas = eventos.filter(e => e.tipo === 'saida').length;
  const totalPart = eventos.reduce((s, e) => s + (e.participantes || 0), 0);
  const totalOfer = eventos.reduce((s, e) => s + (e.ofertas || 0), 0);
  const totalDiz = eventos.reduce((s, e) => s + (e.dizimos || 0), 0);
  const totalConv = eventos.reduce((s, e) => s + (e.conversoes || 0), 0);
  const canExport = hasPerm('exportar_dados');

  $('page-content').innerHTML = `
  <div class="sec-hdr">
    <h2>Relatórios e Estatísticas</h2>
    <div class="sec-actions">
      ${canExport ? `<button class="btn btn-primary btn-sm" onclick="exportarPDF()">📄 Exportar PDF</button>` : ''}
    </div>
  </div>
 
  <div class="filter-bar">
    <div class="filter-title">📅 Filtro por período</div>
    <div class="filter-fields">
      <div class="form-group" style="margin:0"><label>Data Inicial</label><input type="date" id="rel-inicio" value="${relFiltroInicio}" onchange="relFiltroInicio=this.value"/></div>
      <div class="form-group" style="margin:0"><label>Data Final</label><input type="date" id="rel-fim" value="${relFiltroFim}" onchange="relFiltroFim=this.value"/></div>
      <div style="display:flex;gap:8px;align-items:flex-end">
        <button class="btn btn-primary btn-sm" onclick="renderRelatorios()">🔍 Filtrar</button>
        <button class="btn btn-secondary btn-sm" onclick="relFiltroInicio='';relFiltroFim='';renderRelatorios()">↺ Limpar</button>
      </div>
    </div>
    <div class="filter-presets">
      <button class="btn btn-secondary btn-sm" onclick="setRelFiltro('mes')">Este mês</button>
      <button class="btn btn-secondary btn-sm" onclick="setRelFiltro('quinzena1')">1ª quinzena</button>
      <button class="btn btn-secondary btn-sm" onclick="setRelFiltro('quinzena2')">2ª quinzena</button>
      <button class="btn btn-secondary btn-sm" onclick="setRelFiltro('semana')">Esta semana</button>
      <button class="btn btn-secondary btn-sm" onclick="setRelFiltro('ano')">Este ano</button>
    </div>
  </div>
 
  ${!canSeeAllSetores() && !isSuperAdmin() ? `<div class="access-notice">🔒 Exibindo apenas dados do seu setor: <strong>${escHtml(currentUserSetor?.nome || 'Seu setor')}</strong></div>` : ''}
 
  <div class="stats-grid stats-4" style="margin-bottom:26px">
    ${statCard('⛪', 'ic-gold', cultos, 'Cultos Registrados', '')}
    ${statCard('🎉', 'ic-blue', genEvt, 'Eventos Realizados', '')}
    ${statCard('🚶', 'ic-teal', saidas, 'Saídas Evangelísticas', '')}
    ${statCard('✝', 'ic-violet', totalConv, 'Total de Conversões', '')}
  </div>
  <div class="stats-grid stats-4" style="margin-bottom:26px">
    ${statCard('👥', 'ic-blue', totalPart, 'Total Participantes', '')}
    ${statCard('💰', 'ic-teal', fmtMoney(totalOfer), 'Total Ofertas', '')}
    ${statCard('💎', 'ic-violet', fmtMoney(totalDiz), 'Total Dízimos', '')}
    ${statCard('💵', 'ic-gold', fmtMoney(totalOfer + totalDiz), 'Total Arrecadado', '')}
  </div>
 
  <div class="charts-grid" style="margin-bottom:26px">
    <div class="chart-card chart-span2"><h3>Participantes por Mês</h3><p>Acumulado de todos os eventos</p><canvas id="chart-line" height="100"></canvas></div>
    <div class="chart-card"><h3>Membros por Congregação</h3><p>Top congregações</p><canvas id="chart-pie" height="200"></canvas></div>
    <div class="chart-card"><h3>Financeiro Mensal</h3><p>Ofertas vs Dízimos</p><canvas id="chart-fin" height="200"></canvas></div>
  </div>
 
  <div class="sec-hdr"><h2>Resumo por Setor</h2></div>
  <div class="tbl-wrap" style="margin-bottom:28px"><div class="tbl-scroll">
    <table>
      <thead><tr><th>Setor</th><th>Cong.</th><th>Membros</th><th>Eventos</th><th>Conv.</th><th>Ofertas</th><th>Dízimos</th></tr></thead>
      <tbody>
        ${setores.map(s => {
    const sCongs = congs.filter(c => c.setor_id === s.id);
    const sEvs = eventos.filter(e => e.setor_id === s.id);
    const sMems = (rMem.data || []).filter(m => sCongs.some(c => c.id === m.congregacao_id)).length;
    const sOfer = sEvs.reduce((x, e) => x + (e.ofertas || 0), 0);
    const sDiz = sEvs.reduce((x, e) => x + (e.dizimos || 0), 0);
    const sConv = sEvs.reduce((x, e) => x + (e.conversoes || 0), 0);
    return `<tr>
            <td data-label="Setor" class="fw5">${escHtml(s.nome)}</td>
            <td data-label="Cong.">${sCongs.length}</td>
            <td data-label="Membros">${sMems}</td>
            <td data-label="Eventos">${sEvs.length}</td>
            <td data-label="Conv.">${sConv}</td>
            <td data-label="Ofertas">${fmtMoney(sOfer)}</td>
            <td data-label="Dízimos">${fmtMoney(sDiz)}</td>
          </tr>`;
  }).join('')}
        <tr class="tr-total">
          <td data-label="Setor" class="fw5">TOTAL</td>
          <td data-label="Cong.">${congs.length}</td>
          <td data-label="Membros">${(rMem.data || []).length}</td>
          <td data-label="Eventos">${eventos.length}</td>
          <td data-label="Conv.">${totalConv}</td>
          <td data-label="Ofertas">${fmtMoney(totalOfer)}</td>
          <td data-label="Dízimos">${fmtMoney(totalDiz)}</td>
        </tr>
      </tbody>
    </table>
  </div></div>
 
  <div class="sec-hdr"><h2>Todos os Eventos <span class="count-badge">${eventos.length}</span></h2></div>
  <div class="tbl-wrap"><div class="tbl-scroll">
    <table>
      <thead><tr><th>Data</th><th>Tipo</th><th>Congregação</th><th>Resumo</th><th>Part.</th><th>Conv.</th><th>Ofertas</th><th>Dízimos</th></tr></thead>
      <tbody>
        ${eventos.map(e => {
    const cong = congs.find(c => c.id === e.congregacao_id);
    return `<tr>
            <td data-label="Data" class="fs-sm">${fmtDate(e.data)}</td>
            <td data-label="Tipo"><span class="tag ${e.tipo === 'culto' ? 'tag-gold' : e.tipo === 'saida' ? 'tag-teal' : 'tag-blue'}">${tipoLabel(e.tipo)}</span></td>
            <td data-label="Congregação" class="fs-sm c2">${escHtml(cong?.nome || '—')}</td>
            <td data-label="Resumo" class="fs-sm">${escHtml(e.resumo || '—')}</td>
            <td data-label="Part.">${e.participantes || 0}</td>
            <td data-label="Conv.">${e.conversoes || 0}</td>
            <td data-label="Ofertas" class="fs-sm">${fmtMoney(e.ofertas)}</td>
            <td data-label="Dízimos" class="fs-sm">${fmtMoney(e.dizimos)}</td>
          </tr>`;
  }).join('') || '<tr><td colspan="8" class="td-no-label" style="text-align:center;color:var(--txt3);padding:20px">Nenhum evento registrado neste período</td></tr>'}
      </tbody>
    </table>
  </div></div>`;

  // Charts
  const byMonth = Array(12).fill(0);
  eventos.forEach(e => { const m = new Date(e.data + 'T00:00:00').getMonth(); byMonth[m] += (e.participantes || 0); });
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const lCtx = document.getElementById('chart-line');
  if (lCtx) chartInstances.line = new Chart(lCtx, { type: 'line', data: { labels: meses, datasets: [{ label: 'Participantes', data: byMonth, borderColor: 'var(--gold)', backgroundColor: 'rgba(201,168,76,.1)', tension: .4, fill: true, pointRadius: 3 }] }, options: { responsive: true, plugins: { legend: { labels: { color: '#94a3b8' } } }, scales: { x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,.03)' } }, y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,.05)' } } } } });
  const top6 = congs.slice(0, 6);
  const pCtx = document.getElementById('chart-pie');
  if (pCtx) chartInstances.pie = new Chart(pCtx, { type: 'doughnut', data: { labels: top6.map(c => c.nome.split('—')[0].trim()), datasets: [{ data: top6.map(c => memCount(c.id)), backgroundColor: ['rgba(201,168,76,.8)', 'rgba(59,130,246,.8)', 'rgba(20,184,166,.8)', 'rgba(244,63,94,.8)', 'rgba(139,92,246,.8)', 'rgba(249,115,22,.8)'], borderWidth: 0, hoverOffset: 6 }] }, options: { responsive: true, plugins: { legend: { labels: { color: '#94a3b8' }, position: 'bottom' } }, cutout: '60%' } });
  const oferMes = Array(12).fill(0), dizMes = Array(12).fill(0);
  eventos.forEach(e => { const m = new Date(e.data + 'T00:00:00').getMonth(); oferMes[m] += (e.ofertas || 0); dizMes[m] += (e.dizimos || 0); });
  const fCtx = document.getElementById('chart-fin');
  if (fCtx) chartInstances.fin = new Chart(fCtx, { type: 'bar', data: { labels: meses, datasets: [{ label: 'Ofertas', data: oferMes, backgroundColor: 'rgba(201,168,76,.75)', borderRadius: 6 }, { label: 'Dízimos', data: dizMes, backgroundColor: 'rgba(20,184,166,.55)', borderRadius: 6 }] }, options: { responsive: true, plugins: { legend: { labels: { color: '#94a3b8' } } }, scales: { x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,.03)' } }, y: { ticks: { color: '#94a3b8', callback: v => 'R$' + v }, grid: { color: 'rgba(255,255,255,.05)' } } } } });
}

function setRelFiltro(tipo) {
  const now = new Date(), ano = now.getFullYear(), mes = now.getMonth() + 1;
  const mesStr = String(mes).padStart(2, '0'), ultimoDia = new Date(ano, mes, 0).getDate();
  switch (tipo) {
    case 'mes': relFiltroInicio = `${ano}-${mesStr}-01`; relFiltroFim = `${ano}-${mesStr}-${ultimoDia}`; break;
    case 'quinzena1': relFiltroInicio = `${ano}-${mesStr}-01`; relFiltroFim = `${ano}-${mesStr}-15`; break;
    case 'quinzena2': relFiltroInicio = `${ano}-${mesStr}-16`; relFiltroFim = `${ano}-${mesStr}-${ultimoDia}`; break;
    case 'semana': { const d = new Date(); d.setDate(d.getDate() - d.getDay()); const f = new Date(d); f.setDate(d.getDate() + 6); relFiltroInicio = d.toISOString().slice(0, 10); relFiltroFim = f.toISOString().slice(0, 10); break; }
    case 'ano': relFiltroInicio = `${ano}-01-01`; relFiltroFim = `${ano}-12-31`; break;
  }
  renderRelatorios();
}

// ─ PDF ───────────────────────────────────────────────────────
async function exportarPDF() {
  if (!hasPerm('exportar_dados')) { toast('Sem permissão para exportar', 'error'); return; }
  const { jsPDF } = window.jspdf;
  if (!jsPDF) { toast('Biblioteca PDF não carregada', 'error'); return; }
  toast('Gerando PDF...', 'info');

  let qEv = q('eventos').select('*').order('data', { ascending: false }).gte('data', relFiltroInicio).lte('data', relFiltroFim);
  let qCong = q('congregacoes').select('*').order('nome');
  let qSet = q('setores').select('*').order('nome');
  let qMem = q('membros').select('congregacao_id');

  if (!canSeeAllSetores() && currentUser?.setor_id) {
    const sid = currentUser.setor_id;
    qEv = qEv.eq('setor_id', sid);
    qCong = qCong.eq('setor_id', sid);
    qSet = qSet.eq('id', sid);
    qMem = qMem.eq('setor_id', sid);
  }

  const [rEv, rCong, rSet, rMem] = await Promise.all([qEv, qCong, qSet, qMem]);
  const eventos = rEv.data || [], congs = rCong.data || [], setores = rSet.data || [];
  const memCount = id => (rMem.data || []).filter(m => m.congregacao_id === id).length;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, margin = 16;
  let y = 20;

  doc.setFillColor(9, 12, 24); doc.rect(0, 0, W, 44, 'F');
  doc.setTextColor(201, 168, 76); doc.setFontSize(20); doc.setFont('helvetica', 'bold');
  doc.text('EclesiaSync', margin, 18);
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(148, 163, 184);
  doc.text('Sistema de Gestão Eclesiástica', margin, 25);
  doc.text(`Relatório: ${fmtDate(relFiltroInicio)} a ${fmtDate(relFiltroFim)}`, margin, 31);
  doc.text(`Gerado por: ${currentUser?.nome || '—'} · ${new Date().toLocaleDateString('pt-BR')}`, margin, 37);
  y = 54;

  const totalOfer = eventos.reduce((s, e) => s + (e.ofertas || 0), 0);
  const totalDiz = eventos.reduce((s, e) => s + (e.dizimos || 0), 0);
  const totalConv = eventos.reduce((s, e) => s + (e.conversoes || 0), 0);
  const totalPart = eventos.reduce((s, e) => s + (e.participantes || 0), 0);

  doc.setFontSize(13); doc.setTextColor(201, 168, 76); doc.setFont('helvetica', 'bold');
  doc.text('Resumo Geral', margin, y); y += 8;

  doc.autoTable({
    startY: y, margin: { left: margin, right: margin },
    head: [['Indicador', 'Valor']],
    body: [
      ['Total de Setores', setores.length], ['Total de Congregações', congs.length],
      ['Total de Membros', (rMem.data || []).length], ['Total de Eventos', eventos.length],
      ['Cultos', eventos.filter(e => e.tipo === 'culto').length],
      ['Eventos Genéricos', eventos.filter(e => e.tipo === 'evento').length],
      ['Saídas Evangelísticas', eventos.filter(e => e.tipo === 'saida').length],
      ['Total de Participantes', totalPart], ['Total de Conversões', totalConv],
      ['Total de Ofertas', fmtMoney(totalOfer)], ['Total de Dízimos', fmtMoney(totalDiz)],
      ['Total Arrecadado', fmtMoney(totalOfer + totalDiz)],
    ],
    theme: 'grid',
    headStyles: { fillColor: [9, 12, 24], textColor: [201, 168, 76], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 245, 250] },
    styles: { fontSize: 9 },
  });
  y = doc.lastAutoTable.finalY + 12;

  for (const s of setores) {
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFontSize(12); doc.setFont('helvetica', 'bold');
    doc.setFillColor(240, 238, 230); doc.rect(margin, y - 5, W - margin * 2, 10, 'F');
    doc.setTextColor(100, 80, 10);
    doc.text(`Setor: ${s.nome} (Região ${s.regiao || '—'})`, margin + 2, y + 2);
    y += 12;
    const sCongs = congs.filter(c => c.setor_id === s.id);
    if (!sCongs.length) { doc.setFontSize(9); doc.setTextColor(150, 150, 150); doc.text('Nenhuma congregação.', margin + 4, y); y += 8; continue; }
    for (const c of sCongs) {
      if (y > 255) { doc.addPage(); y = 20; }
      const cEvs = eventos.filter(e => e.congregacao_id === c.id);
      const cOfer = cEvs.reduce((x, e) => x + (e.ofertas || 0), 0), cDiz = cEvs.reduce((x, e) => x + (e.dizimos || 0), 0);
      const cConv = cEvs.reduce((x, e) => x + (e.conversoes || 0), 0), cPart = cEvs.reduce((x, e) => x + (e.participantes || 0), 0);
      doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(50, 50, 50);
      doc.text(`  ⛪ ${c.nome}`, margin + 2, y);
      doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100);
      doc.text(`Membros:${memCount(c.id)} | Eventos:${cEvs.length} | Part:${cPart} | Conv:${cConv} | Ofertas:${fmtMoney(cOfer)} | Dízimos:${fmtMoney(cDiz)}`, margin + 4, y + 5);
      y += 12;
      if (cEvs.length) {
        doc.autoTable({
          startY: y, margin: { left: margin + 6, right: margin },
          head: [['Data', 'Tipo', 'Resumo', 'Part.', 'Conv.', 'Ofertas', 'Dízimos']],
          body: cEvs.map(e => [fmtDate(e.data), tipoLabel(e.tipo), (e.resumo || '').slice(0, 40), e.participantes || 0, e.conversoes || 0, fmtMoney(e.ofertas), fmtMoney(e.dizimos)]),
          theme: 'striped',
          headStyles: { fillColor: [30, 30, 50], textColor: [201, 168, 76], fontSize: 7, fontStyle: 'bold' },
          styles: { fontSize: 7.5 },
          columnStyles: { 0: { cellWidth: 20 }, 1: { cellWidth: 22 }, 2: { cellWidth: 50 }, 3: { cellWidth: 12 }, 4: { cellWidth: 12 }, 5: { cellWidth: 24 }, 6: { cellWidth: 24 } },
        });
        y = doc.lastAutoTable.finalY + 6;
      }
    }
    y += 4;
  }
  doc.save(`EclesiaSync-Relatorio-${relFiltroInicio}-${relFiltroFim}.pdf`);
  toast('PDF gerado com sucesso!');
}

// ════════════════════════════════════════════════════════════
//  PERMISSÕES
// ════════════════════════════════════════════════════════════
async function renderPermissoes() {
  if (!isSuperAdmin() && !hasPerm('editar_permissoes')) {
    $('page-content').innerHTML = `<div class="empty"><div class="empty-ico">🔐</div><p>Você não tem permissão para gerenciar permissões.</p></div>`; return;
  }
  $('page-content').innerHTML = loadingPage();
  const ROLES = ['admin', 'dirigente', 'adjunto', 'usuario'];

  // Busca da nova tabela role_permissions
  let { data, error } = await q('role_permissions').select('*').eq('role', activeRole);

  // Fallback para tabela legada
  if (error || !data?.length) {
    const legacy = await q('permissoes').select('*').eq('role', activeRole);
    data = (legacy.data || []).map(p => {
      const map = {
        'Gerenciar Setores': 'gerenciar_setores', 'Gerenciar Congregações': 'gerenciar_congregacoes',
        'Gerenciar Membros': 'gerenciar_membros', 'Gerenciar Usuários': 'gerenciar_usuarios',
        'Visualizar Dashboard': 'visualizar_dashboard', 'Ver Relatórios': 'ver_relatorios',
        'Editar Permissões': 'editar_permissoes', 'Exportar Dados': 'exportar_dados',
        'Excluir Registros': 'excluir_registros', 'Registrar Eventos': 'registrar_eventos',
        'Ver Todos os Setores': 'ver_todos_setores', 'Gerenciar Agenda': 'gerenciar_agenda',
      };
      return { role: p.role, permission_code: map[p.permissao] || p.permissao, ativo: p.ativo };
    });
  }

  const perms = {};
  (data || []).forEach(p => { perms[p.permission_code] = p.ativo; });
  const displayPerms = activeRole === 'admin'
    ? Object.fromEntries(Object.keys(PERM_DESC).map(k => [k, true]))
    : perms;
  const activeCount = Object.values(displayPerms).filter(Boolean).length;

  $('page-content').innerHTML = `
  <div class="sec-hdr">
    <h2>Controle de Permissões</h2>
    ${!isSuperAdmin() ? '<span class="tag tag-rose">Somente visualização</span>' : ''}
  </div>
  <div style="background:rgba(201,168,76,.07);border:1px solid rgba(201,168,76,.2);border-radius:10px;padding:12px 16px;margin-bottom:20px;font-size:.82rem;color:var(--txt2)">
    ⭐ O perfil <strong style="color:var(--gold)">admin</strong> é superusuário — possui acesso total a todas as funcionalidades.
    <br>🔒 <strong>Ver Todos os Setores</strong> — somente leitura. Usuários com esta permissão não podem modificar dados de outros setores.
    <br>🔐 Use o botão <strong>Permissões Individuais</strong> na lista de usuários para sobrescrever permissões por usuário.
  </div>
  <div class="role-tabs">
    ${ROLES.map(r => `<button class="btn ${r === activeRole ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="setActiveRole('${r}')">
      <span class="role-badge ${roleCls(r)}">${r}</span></button>`).join('')}
  </div>
  <div class="tbl-wrap" style="max-width:680px">
    <div style="padding:15px 18px;border-bottom:1px solid var(--bdr2)">
      <div style="font-family:'Cinzel',serif;font-size:.88rem">Grupo: <span class="role-badge ${roleCls(activeRole)}">${activeRole}</span>
        ${activeRole === 'admin' ? '<span class="tag tag-gold" style="margin-left:8px">⭐ Superusuário</span>' : ''}
      </div>
      <div class="fs-xs c3 mt8">${activeCount} permissões ativas</div>
    </div>
    <div style="padding:6px 18px">
      ${Object.entries(PERM_DESC).map(([perm, { label, desc }]) => {
    const on = !!displayPerms[perm];
    const isAdminRole = activeRole === 'admin';
    const isSecurityPerm = perm === 'ver_todos_setores';
    return `
        <div class="perm-row ${isSecurityPerm ? 'perm-security' : ''}">
          <div class="perm-lbl">
            <strong>${label}${isSecurityPerm ? ' 🔒' : ''}</strong>
            <span>${desc}</span>
          </div>
          <div class="toggle-sw${on ? ' on' : ''}" 
            onclick="${isAdminRole ? "toast('Admin sempre tem acesso total','info')" : `toggleRolePerm('${perm}',${on})`}"
            title="${isAdminRole ? 'Superusuário — sempre ativo' : (isSuperAdmin() ? 'Clique para alternar' : 'Sem permissão para alterar')}"
            style="${isAdminRole ? 'opacity:.6;cursor:default' : ''}"></div>
        </div>`;
  }).join('')}
    </div>
  </div>`;
}

function setActiveRole(r) { activeRole = r; renderPermissoes(); }

async function toggleRolePerm(perm, current) {
  if (!isSuperAdmin()) { toast('Sem permissão para alterar', 'error'); return; }
  const novoValor = !current;
  try {
    const { error } = await db.rpc('toggle_role_permission', {
      p_role: activeRole, p_perm: perm, p_ativo: novoValor
    });
    if (error) throw error;
  } catch (e) {
    // Fallback para tabela legada + nova
    await Promise.all([
      q('role_permissions').upsert({ role: activeRole, permission_code: perm, ativo: novoValor }, { onConflict: 'role,permission_code' }),
      q('permissoes').upsert({ role: activeRole, permissao: perm, ativo: novoValor }, { onConflict: 'role,permissao' })
    ]);
  }
  if (!permissionsCache[activeRole]) permissionsCache[activeRole] = {};
  permissionsCache[perm] = novoValor;
  toast(`Permissão ${novoValor ? 'concedida' : 'removida'}`);
  renderPermissoes();
}

// ════════════════════════════════════════════════════════════
//  MODAL ENGINE
// ════════════════════════════════════════════════════════════
function showModal(html) {
  const mc = $('modal-container');
  mc.innerHTML = `<div class="overlay" id="modal-overlay" onclick="handleOverlayClick(event)"><div class="modal" onclick="event.stopPropagation()">${html}</div></div>`;
}
function handleOverlayClick(e) { if (e.target.id === 'modal-overlay') closeModal(); }
function closeModal() {
  const mc = $('modal-container');
  const ov = mc.querySelector('.overlay');
  if (ov) { ov.style.opacity = '0'; ov.style.transition = 'opacity .15s'; setTimeout(() => mc.innerHTML = '', 150); }
}

// ── INIT ─────────────────────────────────────────────────────
(async function () {
  try {
    const saved = JSON.parse(localStorage.getItem('ecclesia_user'));
    if (saved) {
      currentUser = saved;
      await loadPermissions();
      await loadUserSetor();
      startApp(saved);
    }
  } catch (e) { }
  $('inp-user').focus();
})();