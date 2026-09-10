require("dotenv").config();

const express = require("express");
const crypto = require("node:crypto");
const OpenAI = require("openai");
const instrucoes = require("./instrucoes");

const obrigatorias = [
  "WEBHOOK_VERIFY_TOKEN",
  "META_APP_SECRET",
  "OPENAI_API_KEY",
  "WHATSAPP_PHONE_NUMBER_ID",
  "WHATSAPP_TEST_RECIPIENT",
  "WHATSAPP_ACCESS_TOKEN",
  "WHATSAPP_API_VERSION"
];

for (const nome of obrigatorias) {
  if (!process.env[nome]?.trim()) {
    throw new Error(`Falta configurar ${nome} no .env`);
  }
}

const app = express();
const porta = Number(process.env.PORT || 3000);
const destinatario = process.env.WHATSAPP_TEST_RECIPIENT.replace(/\D/g, "");
const telefoneId = process.env.WHATSAPP_PHONE_NUMBER_ID.trim();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 30000,
  maxRetries: 0
});

let historico = [];
let fila = Promise.resolve();
const recebidas = new Map();

function assinaturaValida(req) {
  const assinatura = req.get("x-hub-signature-256") || "";

  if (!/^sha256=[a-f0-9]{64}$/i.test(assinatura)) return false;

  const esperado = crypto
    .createHmac("sha256", process.env.META_APP_SECRET)
    .update(req.body)
    .digest();

  const recebido = Buffer.from(assinatura.slice(7), "hex");

  return recebido.length === esperado.length &&
    crypto.timingSafeEqual(recebido, esperado);
}

async function enviar(texto) {
  const versao = process.env.WHATSAPP_API_VERSION;

  const resposta = await fetch(
    `https://graph.facebook.com/${versao}/${telefoneId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: destinatario,
        type: "text",
        text: { body: texto }
      }),
      signal: AbortSignal.timeout(20000)
    }
  );

  const dados = await resposta.json();

  if (!resposta.ok || !dados.messages?.[0]?.id) {
    const erro = new Error("Falha no envio ao WhatsApp");
    erro.status = resposta.status;
    erro.codigoMeta = dados.error?.code;
    throw erro;
  }
}

async function atender(mensagem) {
  if (mensagem.type !== "text") {
    await enviar("Neste teste consigo ler apenas texto. Pode digitar sua mensagem?");
    return;
  }

  const texto = mensagem.text?.body?.trim();
  if (!texto) return;

  if (texto === "/novo") {
    historico = [];
    await enviar("Conversa de teste reiniciada. Pode começar novamente!");
    return;
  }

  if (texto.length > 3000) {
    await enviar("Para este teste, envie uma mensagem um pouco mais curta.");
    return;
  }

  if (historico.length >= 40) {
    await enviar("Limite desta conversa de teste atingido. Digite /novo.");
    return;
  }

  const entrada = [...historico, { role: "user", content: texto }];

  const agora = new Date().toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo"
  });

  const resposta = await openai.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    instructions: instrucoes + `
CONTEXTO DESTE TESTE:
- Data e hora em São Paulo: ${agora}.
- Você responde pelo WhatsApp de teste ao proprietário da clínica.
- A recepção e a agenda ainda não estão conectadas.
- Não afirme ter registrado ou encaminhado solicitações.
- Mantenha todas as regras de nome, origem, contexto e orientação.
`,
    input: entrada,
    max_output_tokens: 600,
    store: false
  });

  const respostaTexto = resposta.output_text?.trim();

  if (resposta.status !== "completed" || !respostaTexto) {
    throw new Error("Resposta incompleta da IA");
  }

  await enviar(respostaTexto);

  historico = [
    ...entrada,
    { role: "assistant", content: respostaTexto }
  ];

  console.log(
    "Resposta aceita pela Meta.",
    "Tokens:",
    resposta.usage?.total_tokens ?? "não informado"
  );
}

app.get("/", (req, res) => {
  res.send("Servidor Alps Atendimento funcionando!");
});

app.get("/webhook", (req, res) => {
  if (
    req.query["hub.mode"] === "subscribe" &&
    req.query["hub.verify_token"] === process.env.WEBHOOK_VERIFY_TOKEN &&
    typeof req.query["hub.challenge"] === "string"
  ) {
    return res.status(200).send(req.query["hub.challenge"]);
  }

  res.sendStatus(403);
});

app.post(
  "/webhook",
  express.raw({ type: "application/json", limit: "256kb" }),
  (req, res) => {
    console.log("[WEBHOOK] POST recebido:", new Date().toISOString());

    if (!Buffer.isBuffer(req.body) || !assinaturaValida(req)) {
      console.warn("Webhook recusado: assinatura inválida.");
      return res.sendStatus(401);
    }

    let evento;

    try {
      evento = JSON.parse(req.body.toString("utf8"));
    } catch {
      return res.sendStatus(400);
    }

    if (evento.object !== "whatsapp_business_account") {
      return res.sendStatus(200);
    }

    // Remove identificadores antigos para limitar o uso de memória.
    const agora = Date.now();
    for (const [id, instante] of recebidas) {
      if (agora - instante > 24 * 60 * 60 * 1000) recebidas.delete(id);
    }

    for (const registro of evento.entry || []) {
      for (const alteracao of registro.changes || []) {
        const valor = alteracao.value;
        console.log("[EVENTO]", {
  campo: alteracao.field,
  telefoneCorreto: valor?.metadata?.phone_number_id === telefoneId,
  mensagens: valor?.messages?.length || 0,
  status: valor?.statuses?.length || 0
});

for (const mensagem of valor?.messages || []) {
  console.log("[MENSAGEM]", {
    destinatarioPermitido: mensagem.from === destinatario,
    tipo: mensagem.type,
    duplicada: recebidas.has(mensagem.id)
  });
}
        if (!valor || valor.metadata?.phone_number_id !== telefoneId) continue;

        for (const status of valor.statuses || []) {
          console.log("Status WhatsApp:", status.status);
        }

        for (const mensagem of valor.messages || []) {
          if (mensagem.from !== destinatario) continue;
          if (!mensagem.id || recebidas.has(mensagem.id)) continue;

          recebidas.set(mensagem.id, agora);

          // Processa em sequência para preservar a ordem da conversa.
          fila = fila
            .then(() => atender(mensagem))
            .catch((erro) => {
              console.error(
                "Falha no atendimento.",
                "HTTP:", erro.status || "não informado",
                "Código Meta:", erro.codigoMeta || "não informado"
              );
            });
        }
      }
    }

    res.sendStatus(200);
  }
);

app.listen(porta, "0.0.0.0", () => {
  console.log(`Servidor Alps: http://localhost:${porta}`);
  console.log("TESTE: responde apenas ao destinatário definido no .env.");
});