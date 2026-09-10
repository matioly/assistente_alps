const crypto = require('node:crypto');
const path = require('node:path');
const express = require('express');

function instalarPainel(app, controle, { senha, seguro = true, relogio = () => Date.now() } = {}) {
  // Sem senha configurada, painel e API ficam indisponíveis.
  if (!senha) return;
  if (senha.length < 16) throw new Error('BOT_ADMIN_PASSWORD deve ter pelo menos 16 caracteres.');
  const esperado = crypto.createHash('sha256').update(senha).digest();
  const sessoes = new Map();
  let tentativas = [];
  const cookieNome = 'alps_painel';
  function cookie(valor, maxAge) {
    return `${cookieNome}=${valor}; Path=/painel; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${seguro ? '; Secure' : ''}`;
  }
  function sessao(req) {
    const agora = relogio();
    for (const [chave, valor] of sessoes) if (valor.ate <= agora) sessoes.delete(chave);
    const token = (req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith(cookieNome + '='))?.slice(cookieNome.length + 1);
    return { token, dados: sessoes.get(token) };
  }
  app.use('/painel', (req, res, next) => {
    res.set({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY',
      'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'" });
    next();
  });
  const pasta = path.join(__dirname, 'painel');
  app.get('/painel', (req, res) => res.sendFile(path.join(pasta, 'index.html')));
  for (const arquivo of ['app.js', 'style.css']) {
    app.get(`/painel/${arquivo}`, (req, res) => res.sendFile(path.join(pasta, arquivo)));
  }
  app.use('/painel/api', (req, res, next) => {
    // Cabeçalho não simples impede POST de outro site; nenhuma origem CORS é liberada.
    if (req.method === 'POST' && (req.get('X-Alps-Panel') !== '1' || !req.is('application/json'))) return res.sendStatus(403);
    next();
  }, express.json({ limit: '2kb' }));
  app.post('/painel/api/login', (req, res) => {
    const agora = relogio();
    tentativas = tentativas.filter(t => t > agora - 15 * 60000);
    if (tentativas.length >= 10) return res.status(429).json({ erro: 'Muitas tentativas. Aguarde 15 minutos.' });
    const fornecida = crypto.createHash('sha256').update(typeof req.body?.senha === 'string' ? req.body.senha : '').digest();
    if (!crypto.timingSafeEqual(fornecida, esperado)) {
      tentativas.push(agora);
      return res.status(401).json({ erro: 'Senha incorreta.' });
    }
    const anterior = sessao(req);
    sessoes.delete(anterior.token);
    if (sessoes.size >= 100) sessoes.delete(sessoes.keys().next().value);
    const token = crypto.randomBytes(32).toString('hex');
    sessoes.set(token, { ate: agora + 8 * 60 * 60000 });
    res.set('Set-Cookie', cookie(token, 8 * 3600)).json(controle.status());
  });
  app.use('/painel/api', (req, res, next) => {
    if (!sessao(req).dados) return res.status(401).json({ erro: 'Entre para acessar o painel.' });
    next();
  });
  app.get('/painel/api/status', (req, res) => res.json(controle.status()));
  app.post('/painel/api/modo', (req, res) => {
    try {
      const status = controle.alterar(req.body?.modo, req.body?.minutos);
      console.log('[CONTROLE BOT]', { modo: status.modo, ate: status.ate });
      res.json(status);
    } catch (erro) {
      res.status(erro instanceof TypeError ? 400 : 503).json({ erro: erro instanceof TypeError ? erro.message : 'Não foi possível salvar. O modo anterior foi mantido.' });
    }
  });
  app.post('/painel/api/logout', (req, res) => {
    sessoes.delete(sessao(req).token);
    res.set('Set-Cookie', cookie('', 0)).json({ ok: true });
  });
}
module.exports = { instalarPainel };
