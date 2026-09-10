const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const express = require('express');
const { horarioAutomatico, criarControle } = require('../controle-bot');
const { instalarPainel } = require('../painel');

function temporario(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'alps-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return path.join(dir, 'estado.json');
}

test('limites dos horários em Campinas, independentemente de UTC', () => {
  for (const [hora, esperado] of [['08:59:59', true], ['09:00:00', false], ['11:59:59', false], ['12:00:00', true], ['12:59:59', true], ['13:00:00', false], ['17:59:59', false], ['18:00:00', true]]) {
    assert.equal(horarioAutomatico(new Date(`2026-09-10T${hora}-03:00`)).ativo, esperado, hora);
  }
  for (const dia of ['12', '13']) assert.equal(horarioAutomatico(new Date(`2026-09-${dia}T10:00:00-03:00`)).ativo, true);
  assert.equal(horarioAutomatico(new Date('2026-09-14T12:00:00Z')).ativo, false);
});

test('controle vence exatamente no prazo, persiste e invalida respostas anteriores', t => {
  const arquivo = temporario(t);
  let agora = Date.parse('2026-09-10T10:00:00-03:00');
  let c = criarControle(arquivo, () => agora);
  assert.equal(c.status().ativo, false);
  const ativacao = c.alterar('ativo', 30);
  assert.equal(c.permitido(ativacao.revisao), true);
  c = criarControle(arquivo, () => agora);
  assert.equal(c.status().ate, ativacao.ate);
  agora += 30 * 60000 - 1;
  assert.equal(c.status().ativo, true);
  agora++;
  assert.equal(c.status().ativo, false);
  assert.equal(c.status().modo, 'automatico');
  c.alterar('ativo', 60);
  c.alterar('pausado', 30);
  c.alterar('ativo', 120);
  assert.equal(c.permitido(ativacao.revisao), false);
  c.alterar('automatico');
  assert.equal(c.status().ativo, false);
  assert.throws(() => c.alterar('ativo', 999), TypeError);
  assert.throws(() => c.alterar('inexistente', 30), TypeError);
  agora = Date.parse('2026-09-12T10:00:00-03:00');
  c.alterar('pausado', 60);
  assert.equal(c.status().ativo, false);
  agora += 60 * 60000;
  assert.equal(c.status().ativo, true);
});

test('arquivo corrompido bloqueia inicialização; falha de gravação preserva modo anterior', t => {
  const arquivo = temporario(t);
  const c = criarControle(arquivo);
  const antes = c.status().revisao;
  fs.mkdirSync(arquivo + '.tmp');
  assert.throws(() => c.alterar('pausado', 30));
  assert.equal(c.status().revisao, antes);
  fs.writeFileSync(arquivo, '{quebrado');
  assert.throws(() => criarControle(arquivo), /Não foi possível ler/);
});

test('painel protege estado, valida entrada, controla bot e encerra sessão', async t => {
  let agora = Date.now();
  const app = express();
  const c = criarControle(temporario(t), () => agora);
  instalarPainel(app, c, { senha: 'senha-ficticia-para-teste', seguro: true, relogio: () => agora });
  const servidor = app.listen(0, '127.0.0.1');
  await new Promise(resolve => servidor.once('listening', resolve));
  t.after(() => { servidor.closeAllConnections(); servidor.close(); });
  const base = `http://127.0.0.1:${servidor.address().port}/painel`;
  let cookie = '';
  const post = (rota, dados, headers = {}) => fetch(base + '/api/' + rota, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Alps-Panel': '1', Cookie: cookie, ...headers }, body: JSON.stringify(dados) });
  assert.equal((await fetch(base + '/api/status')).status, 401);
  assert.equal((await post('modo', { modo: 'ativo', minutos: 30 })).status, 401);
  assert.equal((await post('login', { senha: 'senha-ficticia-para-teste' }, { 'X-Alps-Panel': '' })).status, 403);
  assert.equal((await post('login', { senha: 'errada' })).status, 401);
  const login = await post('login', { senha: 'senha-ficticia-para-teste' });
  assert.equal(login.status, 200);
  const setCookie = login.headers.get('set-cookie');
  assert.match(setCookie, /HttpOnly; SameSite=Strict;.*Secure/);
  cookie = setCookie.split(';')[0];
  assert.equal((await post('modo', { modo: 'ativo', minutos: 1 })).status, 400);
  const pausa = await post('modo', { modo: 'pausado', minutos: 60 });
  assert.equal((await pausa.json()).ativo, false);
  assert.equal((await post('modo', { modo: 'automatico' })).status, 200);
  agora += 8 * 60 * 60000;
  assert.equal((await fetch(base + '/api/status', { headers: { Cookie: cookie } })).status, 401);
  const novoLogin = await post('login', { senha: 'senha-ficticia-para-teste' });
  cookie = novoLogin.headers.get('set-cookie').split(';')[0];
  assert.equal((await post('logout', {})).status, 200);
  assert.equal((await post('modo', { modo: 'ativo', minutos: 30 })).status, 401);
  const html = await fetch(base);
  assert.match(html.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  assert.match(await html.text(), /Controle temporário/);
  for (let i = 0; i < 10; i++) assert.equal((await post('login', { senha: 'errada' })).status, 401);
  assert.equal((await post('login', { senha: 'errada' })).status, 429);
});
