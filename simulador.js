const readline = require("node:readline");

const terminal = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let etapa = "inicio";
let atendimento = {};

function normalizar(texto) {
  return texto.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function reiniciar() {
  etapa = "inicio";
  atendimento = {};
}

function resumo() {
  return [
    "RESUMO PARA A RECEPÇÃO — SIMULAÇÃO",
    `Nome: ${atendimento.nome || "Não informado"}`,
    `Interesse: ${atendimento.interesse || "Não informado"}`,
    `Período: ${atendimento.periodo || "Não informado"}`,
    `Motivo do contato: ${atendimento.motivo || "Agendamento"}`,
    "Status: aguardando atendimento humano; sem horário confirmado."
  ].join("\n");
}

function responder(texto) {
  const mensagem = normalizar(texto);

  if (mensagem === "/novo") {
    reiniciar();
    return "Conversa reiniciada. Digite uma mensagem como paciente.";
  }

  if (etapa === "finalizado") {
    return "Solicitação concluída nesta simulação. Digite /novo para testar outra conversa.";
  }

  if (/\b(atendente|recepcao|humano|pessoa)\b/.test(mensagem)) {
    atendimento.motivo = texto;
    etapa = "humano_nome";

    if (atendimento.nome) {
      etapa = "finalizado";
      return resumo();
    }

    return "Claro! Como você se chama?";
  }

  if (etapa === "humano_nome") {
    atendimento.nome = texto;
    etapa = "finalizado";
    return resumo();
  }

  if (etapa === "nome") {
    atendimento.nome = texto;
    etapa = "interesse";
    return `Obrigada, ${texto}! Qual tratamento ou atendimento você procura?`;
  }

  if (etapa === "interesse") {
    atendimento.interesse = texto;
    etapa = "periodo";
    return "Você prefere atendimento de manhã ou à tarde?";
  }

  if (etapa === "periodo") {
    if (!/\b(manha|tarde|qualquer|tanto faz|indiferente)\b/.test(mensagem)) {
      return "Pode informar manhã, tarde ou sem preferência? Se precisar de outro horário, digite recepção.";
    }

    atendimento.periodo = texto;
    etapa = "confirmacao";

    return (
      `Confira: nome ${atendimento.nome}; ` +
      `interesse em ${atendimento.interesse}; preferência: ${texto}.\n` +
      "Está correto? Responda sim ou não. O horário dependerá da confirmação da recepção."
    );
  }

  if (etapa === "confirmacao") {
    if (/^(sim|s|correto|certo|ok)$/.test(mensagem)) {
      etapa = "finalizado";
      return resumo();
    }

    if (/^(nao|n)$/.test(mensagem)) {
      reiniciar();
      etapa = "nome";
      return "Vamos corrigir. Como você se chama?";
    }

    return "Responda sim para confirmar ou não para preencher novamente.";
  }

  if (etapa === "preco") {
    atendimento.interesse = texto;
    atendimento.motivo = "Consulta sobre valores";
    etapa = "humano_nome";
    return "A recepção poderá informar os valores desse procedimento. Como você se chama?";
  }

  if (/\b(preco|valor|valores|quanto|custa)\b/.test(mensagem)) {
    atendimento.motivo = texto;
    etapa = "preco";
    return "De qual procedimento você gostaria de saber o valor?";
  }

  if (/\b(agendar|marcar|consulta|avaliacao)\b/.test(mensagem)) {
    etapa = "nome";
    return "Posso ajudar com sua solicitação de avaliação. Como você se chama?";
  }

  return (
    "Olá! Sou a assistente virtual da Alps Oral Clinic 😊\n" +
    "Você deseja solicitar um agendamento, consultar valores ou falar com a recepção?"
  );
}

console.log("SIMULADOR ALPS — sem conexão com WhatsApp.");
console.log("Dados apenas em memória: nada é enviado ou salvo.");
console.log("Comandos: /novo reinicia; /sair encerra.\n");

function conversar() {
  terminal.question("Paciente: ", (entrada) => {
    const texto = entrada.trim();

    if (texto === "/sair") {
      terminal.close();
      return;
    }

    if (texto) {
      console.log(`\nAlps: ${responder(texto)}\n`);
    }

    conversar();
  });
}

conversar();