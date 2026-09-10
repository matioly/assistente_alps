# Alps Atendimento

Assistente da Alps Oral Clinic com Node.js, Express, WhatsApp Cloud API e OpenAI Responses API, hospedado no Railway.

## Estado em 10/09/2026

- RepositÃ³rio: https://github.com/matioly/assistente_alps â€” branch `main`.
- ServiÃ§o Railway: `assistente_alps`, Dockerfile com Node 22 Alpine, uma rÃ©plica.
- URL: https://assistentealps-production.up.railway.app
- Callback: https://assistentealps-production.up.railway.app/webhook
- A URL pÃºblica jÃ¡ retornou **Servidor Alps Atendimento funcionando!**, apÃ³s corrigir a escuta para `0.0.0.0`.
- Conversa completa pelo WhatsApp validada localmente apÃ³s assinar o aplicativo na WABA.
- Ãšltima aÃ§Ã£o informada: trocar o callback Meta para Railway. **Falta registrar a confirmaÃ§Ã£o da resposta completa pelo Railway.**
- NÃºmero oficial da clÃ­nica ainda nÃ£o conectado. O bot permanece restrito ao celular pessoal autorizado para teste.

Hospedagem concluÃ­da nÃ£o significa atendimento a pacientes liberado. A prÃ³xima sessÃ£o deve comeÃ§ar pelo teste completo no Railway.

## Arquitetura e arquivos

A Meta entrega mensagens por POST HTTPS. O servidor valida assinatura, telefone e remetente, processa uma fila em memÃ³ria, consulta a OpenAI e envia a resposta pela Cloud API.

| Arquivo | FunÃ§Ã£o |
| --- | --- |
| `server.js` | HTTP, webhook, assinatura HMAC, filtros, histÃ³rico, fila e resposta |
| `instrucoes.js` | Prompt efetivamente importado pelo servidor |
| `assinar-whatsapp.js` | Assina aplicativo na WABA via POST em `/{WABA_ID}/subscribed_apps` |
| `simulador.js` | Simulador inicial no terminal |
| `simulador-ia.js`, `instrucoes-ia.js` | Scripts de simulaÃ§Ã£o com instruÃ§Ãµes prÃ³prias; nÃ£o sÃ£o importados pelo servidor |
| `Dockerfile` | Node 22 Alpine, `npm ci --omit=dev`, `npm start` |
| `package.json`, `package-lock.json` | DependÃªncias e comandos; projeto CommonJS |

## VariÃ¡veis

Localmente usar `.env`; na hospedagem usar **Railway â†’ Variables**. NÃ£o versionar valores secretos. O `.env` local nÃ£o Ã© enviado automaticamente ao Railway.

| VariÃ¡vel | ConteÃºdo / finalidade |
| --- | --- |
| `PORT` | `3000`, igual Ã  porta de destino do domÃ­nio |
| `WEBHOOK_VERIFY_TOKEN` | Valor escolhido por nÃ³s, idÃªntico ao campo de verificaÃ§Ã£o na Meta |
| `META_APP_SECRET` | Segredo do aplicativo Meta, usado para validar o HMAC dos POSTs |
| `OPENAI_MODEL` | ConfiguraÃ§Ã£o atual: `gpt-4.1-mini` |
| `OPENAI_API_KEY` | Chave OpenAI |
| `WHATSAPP_PHONE_NUMBER_ID` | ID do telefone remetente da API; nÃ£o Ã© o telefone nem o WABA ID |
| `WHATSAPP_TEST_RECIPIENT` | Celular pessoal autorizado, somente dÃ­gitos com paÃ­s e DDD; nÃ£o Ã© o nÃºmero da clÃ­nica |
| `WHATSAPP_ACCESS_TOKEN` | Token completo Meta para chamadas de saÃ­da e assinatura da conta |
| `WHATSAPP_API_VERSION` | ConfiguraÃ§Ã£o atual: `v26.0` |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | WABA ID, necessÃ¡rio apenas para o script de assinatura |

O servidor exige as credenciais da tabela exceto WABA ID; `PORT` e `OPENAI_MODEL` possuem padrÃµes. O verify token confirma o callback e nÃ£o tem expiraÃ§Ã£o implementada no cÃ³digo. O access token autoriza chamadas Ã  API; acompanhar sua validade e planejar credencial operacional antes de uso contÃ­nuo.

### Identificadores de teste (nÃ£o sÃ£o segredos)

| Item | Valor |
| --- | --- |
| Aplicativo | Alps Atendimento |
| App ID | `1051411227659862` |
| NÃºmero Meta de teste | `+1 (555) 201-0524` |
| Phone Number ID | `1248663335005516` |
| WABA ID | `2155430935315740` |

O celular pessoal foi omitido deste README pÃºblico. Consultar as variÃ¡veis privadas. NÃ£o reutilizar automaticamente os IDs de teste na conexÃ£o do nÃºmero oficial.

## Desenvolvimento local

Usar preferencialmente Node 22, alinhado ao Dockerfile; o desenvolvimento inicial tambÃ©m funcionou em Node 24.

```powershell
git clone https://github.com/matioly/assistente_alps.git
cd assistente_alps
npm ci
```

Criar `.env` com as variÃ¡veis acima e executar:

```powershell
npm start
# Alternativa com reinÃ­cio ao salvar:
npm run dev
```

Abrir `http://localhost:3000`. O projeto usa `require` e CommonJS. NÃ£o mudar para mÃ³dulos ES apenas para corrigir um `await`: usar funÃ§Ã£o `async`, como no script de assinatura.

Para webhooks locais foi usado `cloudflared tunnel --url http://127.0.0.1:3000`. Cada URL temporÃ¡ria nova exige atualizar o callback. O Railway substitui esse tÃºnel e o Node local no atendimento hospedado. ApÃ³s validar o callback hospedado, o computador pode ser desligado.

## Railway e publicaÃ§Ã£o

1. ServiÃ§o conectado ao GitHub, branch `main`, build pelo Dockerfile.
2. Configurar credenciais em **Variables**, incluindo `PORT=3000`.
3. Manter a porta do domÃ­nio em `3000` e `app.listen(porta, "0.0.0.0", ...)`.
4. ApÃ³s o push, conferir o novo deploy e seu commit em **Deployments**.
5. **Build Logs** mostram construÃ§Ã£o da imagem; **Deploy Logs** mostram o Node e os webhooks. Status Active sozinho nÃ£o comprova que HTTP responde.

Plano escolhido: Hobby. Conferir consumo e cobranÃ§a no painel; OpenAI tem cobranÃ§a separada.

```powershell
git add README.md
git commit -m "docs: documenta Railway e continuidade"
git push origin main
```

Para cÃ³digo, adicionar explicitamente os arquivos modificados. Conferir `git status` e `git diff --cached` antes do commit. Nunca adicionar `.env` ou segredos. Em builds Docker locais, garantir que `.dockerignore` exclua `.env`, variantes com segredos, `.git` e `node_modules`: o Dockerfile usa `COPY . .`.

## Meta: callback e WABA

1. Na configuraÃ§Ã£o de webhooks, usar a URL Railway com `/webhook`.
2. Informar o mesmo `WEBHOOK_VERIFY_TOKEN` do Railway e verificar/salvar.
3. Conferir assinatura do campo `messages`. Certificado de cliente ficou desativado nesta implantaÃ§Ã£o.
4. O aplicativo tambÃ©m precisa estar assinado na WABA correta.

**Problema jÃ¡ resolvido:** mensagens reais apareciam no painel Meta, mas somente eventos sintÃ©ticos chegavam ao Node. A correÃ§Ã£o foi assinar o aplicativo na WABA com o script abaixo. A assinatura da conta de teste jÃ¡ foi concluÃ­da; nÃ£o repetir a cada deploy.

Para uma nova WABA, configurar ID e token com acesso Ã  conta e executar conscientemente:

```powershell
node assinar-whatsapp.js
```

Esperado: `Aplicativo assinado na conta WhatsApp: true`. Este comando altera a assinatura na Meta; nÃ£o Ã© uma consulta.

## Teste completo e operaÃ§Ã£o

1. Abrir a URL pÃºblica e confirmar a mensagem de funcionamento (valida apenas HTTP).
2. Confirmar callback salvo e abrir **Deploy Logs** no Railway.
3. Do celular permitido, enviar texto ao nÃºmero de teste.
4. Esperar `[WEBHOOK] POST recebido`, `telefoneCorreto: true` e `destinatarioPermitido: true`.
5. Confirmar a resposta no celular. `Resposta aceita pela Meta` comprova aceitaÃ§Ã£o, nÃ£o necessariamente entrega.
6. Enviar `/novo` para reiniciar a conversa.
7. Registrar resultado/data aqui; depois encerrar Node local e Cloudflare Tunnel.

O botÃ£o de teste sintÃ©tico da Meta usa IDs fictÃ­cios; filtros `false` sÃ£o esperados nesse teste e nÃ£o justificam retirar a restriÃ§Ã£o de remetente.

## DiagnÃ³stico

| Sintoma | O que conferir |
| --- | --- |
| Application failed to respond | Deploy Logs, escuta `0.0.0.0`, `PORT` e porta do domÃ­nio. `127.0.0.1` foi a causa nesta implantaÃ§Ã£o |
| Falta configurar variÃ¡vel | Railway Variables e novo deploy; o erro menciona `.env` mesmo na nuvem |
| GET `/webhook` retorna 403 | Esperado sem os parÃ¢metros de verificaÃ§Ã£o; testar `/` para disponibilidade |
| Falha ao verificar callback | URL pÃºblica e verify token idÃªntico ao servidor |
| Teste sintÃ©tico chega; real sÃ³ aparece no painel | Assinatura da WABA correta, campo `messages` e callback |
| telefoneCorreto false | Comparar metadata.phone_number_id com a variÃ¡vel; dados sintÃ©ticos usam IDs fictÃ­cios |
| destinatarioPermitido false | Comparar remetente real com variÃ¡vel pessoal de teste |
| Assinatura invÃ¡lida | App secret correto e corpo bruto preservado para HMAC |
| POST chega mas atendimento falha | HTTP/CÃ³digo Meta nos logs, validade e acesso das credenciais, disponibilidade da OpenAI |
| Nenhum POST | Investigar entrega e callback antes da IA; log inicial precede filtros e OpenAI |
| Cannot find module ./instrucoes | Arquivo `instrucoes.js`, incluindo capitalizaÃ§Ã£o correta em Linux |
| Erro de sintaxe no prompt | Texto deve estar dentro de string JavaScript exportada |

Compartilhar somente logs sem segredos. O tratamento atual de exceÃ§Ãµes Ã© resumido; melhorar diagnÃ³stico sanitizado Ã© uma pendÃªncia.

## Limites atuais

- Apenas um remetente e um Phone Number ID permitidos.
- Texto apenas; mÃ­dia recebe pedido para escrever.
- `/novo` limpa histÃ³rico global; entrada mÃ¡xima de 3.000 caracteres.
- Limite de 40 itens de histÃ³rico (normalmente 20 trocas completas).
- OpenAI: atÃ© 600 tokens de saÃ­da, timeout de 30 segundos, sem retries do SDK; envio Meta com timeout de 20 segundos.
- `store: false` na OpenAI nÃ£o representa garantia geral de ausÃªncia de retenÃ§Ã£o por todos os provedores.
- HistÃ³rico, fila e deduplicaÃ§Ã£o em memÃ³ria; perdidos em reinÃ­cio/deploy. Limpeza dos IDs com mais de 24 horas ocorre na chegada de eventos.
- HTTP 200 Ã© enviado antes da conclusÃ£o do atendimento; nÃ£o hÃ¡ fila durÃ¡vel. Falhas apÃ³s marcar uma mensagem como recebida podem impedir seu reprocessamento.
- Uma conversa global: **nÃ£o liberar outros pacientes apenas removendo o filtro**.
- NÃ£o hÃ¡ agenda, encaminhamento real para recepÃ§Ã£o nem controle de horÃ¡rio em cÃ³digo.
- `npm test` Ã© um placeholder que falha; nÃ£o hÃ¡ suÃ­te automatizada funcional configurada.

## PrÃ³ximos passos antes de atender pacientes

- [ ] Confirmar resposta completa pelo Railway apÃ³s trocar callback.
- [ ] Verificar fluxo oficial de coexistÃªncia para preservar WhatsApp Business usado pela recepÃ§Ã£o antes de registrar/migrar o nÃºmero oficial. A tela comum de adicionar nÃºmero nÃ£o comprova essa preservaÃ§Ã£o.
- [ ] Verificar telefone com acesso a SMS/ligaÃ§Ã£o na clÃ­nica; avaliar impacto antes de excluir conta ou concluir migraÃ§Ã£o.
- [ ] Configurar novos IDs, acesso do token e assinatura na WABA correspondente.
- [ ] Definir credencial operacional, acompanhamento de validade e custos.
- [ ] Isolar histÃ³rico por paciente, persistir estado e implementar fila durÃ¡vel, retentativas e idempotÃªncia.
- [ ] Implementar horÃ¡rio em cÃ³digo: segunda a sexta antes de 09:00 e a partir de 18:15; sÃ¡bados/domingos completos, `America/Sao_Paulo`. Definir feriados. Hoje citar horÃ¡rio no prompt nÃ£o impÃµe essa regra.
- [ ] Implementar pausa e atendimento humano, acompanhamento de solicitaÃ§Ãµes e eventual integraÃ§Ã£o de agenda.
- [ ] Revisar prompt com equipe: nome, origem do contato, interesse, uma pergunta por vez, sem repetir informaÃ§Ãµes. Priorizar urgÃªncias; nÃ£o inventar preÃ§o, diagnÃ³stico, disponibilidade ou agendamento.
- [ ] Definir acesso, retenÃ§Ã£o/exclusÃ£o de dados, polÃ­tica de privacidade e operaÃ§Ã£o de logs.
- [ ] Criar testes relevantes antes de liberar mÃºltiplos pacientes, incluindo isolamento de conversas e horÃ¡rio.

## Contexto para retomar

> Leia este README e o cÃ³digo atual. HTTP jÃ¡ funciona no Railway; atendimento WhatsApp local foi validado apÃ³s assinatura da WABA. Confirme o teste completo no Railway. O bot continua restrito a um destinatÃ¡rio, com histÃ³rico global em memÃ³ria e sem controle de horÃ¡rio em cÃ³digo. A prÃ³xima etapa Ã© conectar o nÃºmero oficial preservando o WhatsApp Business da recepÃ§Ã£o e preparar isolamento por paciente, persistÃªncia, horÃ¡rio e atendimento humano. NÃ£o reutilize IDs de teste no nÃºmero oficial nem exponha credenciais.