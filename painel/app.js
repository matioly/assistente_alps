const $ = id => document.getElementById(id);
let logado = false;
let ocupado = false;
const hora = valor => new Date(valor).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
function acesso(valor) { logado = valor; $('login').hidden = valor; $('controle').hidden = !valor; $('sair').hidden = !valor; }
async function api(rota, dados) {
  const resposta = await fetch('/painel/api/' + rota, { method: dados ? 'POST' : 'GET', headers: dados ? { 'Content-Type': 'application/json', 'X-Alps-Panel': '1' } : {}, body: dados ? JSON.stringify(dados) : undefined, signal: AbortSignal.timeout(10000) });
  const valor = await resposta.json();
  if (resposta.status === 401) acesso(false);
  if (!resposta.ok) throw new Error(valor.erro || 'Não foi possível concluir.');
  return valor;
}
function mostrar(s) {
  acesso(true);
  $('situacao').textContent = s.ativo ? 'Bot ativo' : 'Bot pausado';
  $('situacao').parentElement.dataset.ativo = String(s.ativo);
  $('modo').textContent = s.modo === 'automatico' ? 'AUTOMÁTICO' : 'TEMPORÁRIO';
  $('motivo').textContent = s.motivo;
  $('prazo').textContent = s.ate ? `Volta ao automático em ${hora(s.ate)}.` : 'Seguindo os horários da clínica.';
  $('atualizacao').textContent = `Atualizado em ${hora(s.agora)}.`;
}
async function executar(acao) {
  if (ocupado) return;
  ocupado = true;
  document.querySelectorAll('button').forEach(b => b.disabled = true);
  try { await acao(); $('aviso').textContent = ''; }
  catch (e) { $('aviso').textContent = e.name === 'TimeoutError' || e instanceof TypeError ? 'Sem conexão. Não foi possível confirmar o estado do bot. Tente novamente.' : e.message; }
  finally { ocupado = false; document.querySelectorAll('button').forEach(b => b.disabled = false); }
}
$('login').addEventListener('submit', e => { e.preventDefault(); executar(async () => { mostrar(await api('login', { senha: $('senha').value })); $('senha').value = ''; }); });
document.querySelectorAll('[data-modo]').forEach(b => b.addEventListener('click', () => executar(async () => mostrar(await api('modo', { modo: b.dataset.modo, minutos: Number($('duracao').value) })))));
$('sair').addEventListener('click', () => executar(async () => { await api('logout', {}); acesso(false); }));
acesso(false);
executar(async () => mostrar(await api('status')));
setInterval(() => { if (logado && !document.hidden) executar(async () => mostrar(await api('status'))); }, 15000);
