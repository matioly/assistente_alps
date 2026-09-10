const fs = require('node:fs');
const path = require('node:path');

const fuso = 'America/Sao_Paulo';
const formato = new Intl.DateTimeFormat('en-US', {
  timeZone: fuso, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
});

function horarioAutomatico(data = new Date()) {
  const p = Object.fromEntries(formato.formatToParts(data).map(x => [x.type, x.value]));
  const minutos = Number(p.hour) * 60 + Number(p.minute);
  const fimDeSemana = ['Sat', 'Sun'].includes(p.weekday);
  const almoco = minutos >= 720 && minutos < 780;
  const ativo = fimDeSemana || minutos < 540 || minutos >= 1080 || almoco;
  return { ativo, motivo: fimDeSemana ? 'Fim de semana' : almoco ? 'Almoço' : ativo ? 'Fora do expediente' : 'Recepção em atendimento' };
}

function criarControle(arquivo, relogio = () => Date.now()) {
  let estado = { modo: 'automatico', ate: null, revisao: 0 };
  try {
    estado = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
    if (!['automatico', 'ativo', 'pausado'].includes(estado.modo) ||
        !Number.isSafeInteger(estado.revisao) || estado.revisao < 0 ||
        (estado.modo === 'automatico' ? estado.ate !== null : !Number.isSafeInteger(estado.ate))) {
      throw new Error('Estado inválido');
    }
  } catch (erro) {
    if (erro.code !== 'ENOENT') throw new Error('Não foi possível ler o estado do bot. Confira BOT_STATE_FILE.');
    fs.mkdirSync(path.dirname(arquivo), { recursive: true });
    fs.writeFileSync(arquivo, JSON.stringify(estado), { mode: 0o600 });
  }
  function status(instante = relogio()) {
    const automatico = horarioAutomatico(new Date(instante));
    const temporario = estado.modo !== 'automatico' && instante < estado.ate;
    return {
      ...automatico,
      ativo: temporario ? estado.modo === 'ativo' : automatico.ativo,
      motivo: temporario ? 'Controle da recepção' : automatico.motivo,
      modo: temporario ? estado.modo : 'automatico',
      ate: temporario ? new Date(estado.ate).toISOString() : null,
      revisao: estado.revisao, fuso, agora: new Date(instante).toISOString()
    };
  }
  function alterar(modo, minutos) {
    if (!['automatico', 'ativo', 'pausado'].includes(modo) ||
        (modo !== 'automatico' && ![30, 60, 120].includes(minutos))) {
      throw new TypeError('Escolha um modo e uma duração válidos.');
    }
    const novo = { modo, ate: modo === 'automatico' ? null : relogio() + minutos * 60000, revisao: estado.revisao + 1 };
    fs.writeFileSync(arquivo + '.tmp', JSON.stringify(novo), { mode: 0o600 });
    fs.renameSync(arquivo + '.tmp', arquivo);
    estado = novo;
    return status();
  }
  // Uma mudança manual cancela também respostas já em geração/fila.
  function permitido(revisao) { return status().ativo && revisao === estado.revisao; }
  return { status, alterar, permitido };
}

module.exports = { horarioAutomatico, criarControle };
