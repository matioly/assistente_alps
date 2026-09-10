const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { fork } = require('node:child_process');

test('webhook não chama IA na pausa e cancela envio em geração após pausa', { timeout: 15000 }, async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'alps-webhook-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const raiz = path.resolve(__dirname, '..');
  const fixture = path.join(dir, 'mock.cjs');
  fs.writeFileSync(fixture, `
    const Module = require('node:module');
    const original = Module._load;
    let liberar;
    Module._load = function(nome, ...args) {
      if (nome === 'openai') return class {
        responses = { create: async () => {
          process.send({ tipo: 'ia' });
          await new Promise(resolve => { liberar = resolve; });
          return { status: 'completed', output_text: 'Resposta simulada', usage: { total_tokens: 0 } };
        } };
      };
      return original.call(this, nome, ...args);
    };
    process.on('message', m => { if(m === 'liberar') liberar?.(); });
    global.fetch = async url => {
      if (!url.startsWith('https://graph.facebook.com/')) throw new Error('Chamada inesperada');
      process.send({ tipo: 'envio' });
      return { ok: true, json: async () => ({ messages: [{ id: 'simulado' }] }) };
    };
    const express = require(${JSON.stringify(path.join(raiz, 'node_modules/express'))});
    const listen = express.application.listen;
    express.application.listen = function(...args) {
      const s = listen.apply(this, args);
      s.once('listening', () => process.send({ tipo: 'pronto', porta: s.address().port }));
      return s;
    };
  `);
  const filho = fork(path.join(raiz, 'server.js'), [], { cwd: raiz, execArgv: ['--require', fixture], silent: true, env: {
    ...process.env, PORT: '0', NODE_ENV: 'test', WEBHOOK_VERIFY_TOKEN: 'teste', META_APP_SECRET: 'segredo-ficticio',
    OPENAI_API_KEY: 'chave-ficticia', WHATSAPP_PHONE_NUMBER_ID: '123', WHATSAPP_TEST_RECIPIENT: '5511999990000',
    WHATSAPP_ACCESS_TOKEN: 'token-ficticio', WHATSAPP_API_VERSION: 'v26.0',
    BOT_ADMIN_PASSWORD: 'senha-ficticia-para-teste', BOT_STATE_FILE: path.join(dir, 'estado.json')
  } });
  t.after(() => filho.kill());
  let ia = 0, envios = 0;
  let logs = '';
  filho.on('message', m => { if (m.tipo === 'ia') ia++; if (m.tipo === 'envio') envios++; });
  filho.stdout.on('data', d => { logs += d; });
  filho.stderr.on('data', d => { logs += d; });
  const pronto = await new Promise((resolve, reject) => {
    filho.on('message', m => { if (m.tipo === 'pronto') resolve(m); });
    filho.once('exit', code => reject(new Error(`Servidor encerrou: ${code} ${logs}`)));
  });
  const base = `http://127.0.0.1:${pronto.porta}`;
  let cookie = '';
  const post = (rota, dados) => fetch(base + '/painel/api/' + rota, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Alps-Panel': '1', Cookie: cookie }, body: JSON.stringify(dados) });
  const login = await post('login', { senha: 'senha-ficticia-para-teste' });
  cookie = login.headers.get('set-cookie').split(';')[0];
  async function modo(modo) { assert.equal((await post('modo', { modo, minutos: 30 })).status, 200); }
  async function mensagem(id, assinaturaCorreta = true) {
    const body = JSON.stringify({ object: 'whatsapp_business_account', entry: [{ changes: [{ field: 'messages', value: { metadata: { phone_number_id: '123' }, messages: [{ id, from: '5511999990000', type: 'text', text: { body: 'Olá' } }] } }] }] });
    const assinatura = crypto.createHmac('sha256', assinaturaCorreta ? 'segredo-ficticio' : 'outro').update(body).digest('hex');
    return fetch(base + '/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-hub-signature-256': 'sha256=' + assinatura }, body });
  }
  const esperar = async criterio => {
    const limite = Date.now() + 3000;
    while (!criterio()) { if (Date.now() > limite) throw new Error('Condição não atingida: ' + logs); await new Promise(r => setTimeout(r, 10)); }
  };
  await modo('pausado');
  assert.equal((await mensagem('pausa')).status, 200);
  await esperar(() => logs.includes('Mensagem sem resposta automática'));
  assert.equal(ia, 0); assert.equal(envios, 0);
  await modo('ativo');
  assert.equal((await mensagem('invalida', false)).status, 401);
  assert.equal((await mensagem('ativa')).status, 200);
  await esperar(() => ia === 1);
  await modo('pausado');
  filho.send('liberar');
  await esperar(() => logs.includes('Resposta cancelada'));
  assert.equal(envios, 0);
  await modo('ativo');
  await mensagem('pausa'); // Entrega repetida não ressuscita mensagem recebida na pausa.
  await mensagem('nova');
  await esperar(() => ia === 2);
  filho.send('liberar');
  await esperar(() => envios === 1);
  assert.equal(ia, 2);
});
