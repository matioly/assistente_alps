require("dotenv").config();

async function executar() {
  const conta = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const versao = process.env.WHATSAPP_API_VERSION || "v26.0";

  if (!conta || !token) {
    throw new Error(
      "Faltam WHATSAPP_BUSINESS_ACCOUNT_ID ou WHATSAPP_ACCESS_TOKEN no .env"
    );
  }

  const resposta = await fetch(
    `https://graph.facebook.com/${versao}/${conta}/subscribed_apps`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  const dados = await resposta.json();

  if (!resposta.ok) {
    console.error("Falha ao assinar:", {
      status: resposta.status,
      codigo: dados.error?.code,
      mensagem: dados.error?.message
    });
    process.exit(1);
  }

  console.log(
    "Aplicativo assinado na conta WhatsApp:",
    dados.success === true
  );
}

executar().catch((erro) => {
  console.error("Erro:", erro.message);
  process.exit(1);
});