# Alps Atendimento

Assistente da Alps Oral Clinic com Node.js, Express, WhatsApp Cloud API e OpenAI Responses API, hospedado no Railway.

## Estado em 10/09/2026

- Repositório: https://github.com/matioly/assistente_alps — branch `main`.
- Serviço Railway: `assistente_alps`, Dockerfile com Node 22 Alpine, uma réplica.
- URL: https://assistentealps-production.up.railway.app
- Callback: https://assistentealps-production.up.railway.app/webhook
- A URL pública já retornou **Servidor Alps Atendimento funcionando!**, após corrigir a escuta para `0.0.0.0`.
- Conversa completa pelo WhatsApp validada localmente após assinar o aplicativo na WABA.
- Resposta completa pelo Railway confirmada pelo proprietário em 10/09/2026. O erro HTTP 401 / Meta 190 foi resolvido substituindo `WHATSAPP_ACCESS_TOKEN` pelo token do usuário de sistema `bot_alps`. A expiração escolhida não foi confirmada.
- Número oficial da clínica ainda não conectado. O bot permanece restrito ao celular pessoal autorizado para teste.

O bot continua em teste, restrito ao celular autorizado. Esta branch adiciona horários e painel; sua publicação e configuração no Railway ainda precisam ser concluídas.

## Arquitetura e arquivos

A Meta entrega mensagens por POST HTTPS. O servidor valida assinatura, telefone e remetente, processa uma fila em memória, consulta a OpenAI e envia a resposta pela Cloud API.

| Arquivo | Função |
| --- | --- |
| `server.js` | HTTP, webhook, assinatura HMAC, filtros, histórico, fila e resposta |
| `controle-bot.js` | Horários em São Paulo e controle temporário persistido em arquivo |
| `painel.js`, `painel/` | Login, API protegida e interface da recepção em `/painel` |
| `instrucoes.js` | Prompt efetivamente importado pelo servidor |
| `assinar-whatsapp.js` | Assina aplicativo na WABA via POST em `/{WABA_ID}/subscribed_apps` |
| `simulador.js` | Simulador inicial no terminal |
| `simulador-ia.js`, `instrucoes-ia.js` | Scripts de simulação com instruções próprias; não são importados pelo servidor |
| `Dockerfile` | Node 22 Alpine, `npm ci --omit=dev`, `npm start` |
| `package.json`, `package-lock.json` | Dependências e comandos; projeto CommonJS |

## Variáveis

Localmente usar `.env`; na hospedagem usar **Railway → Variables**. Não versionar valores secretos. O `.env` local não é enviado automaticamente ao Railway.

| Variável | Conteúdo / finalidade |
| --- | --- |
| `PORT` | `3000`, igual à porta de destino do domínio |
| `WEBHOOK_VERIFY_TOKEN` | Valor escolhido por nós, idêntico ao campo de verificação na Meta |
| `META_APP_SECRET` | Segredo do aplicativo Meta, usado para validar o HMAC dos POSTs |
| `OPENAI_MODEL` | Configuração atual: `gpt-4.1-mini` |
| `OPENAI_API_KEY` | Chave OpenAI |
| `WHATSAPP_PHONE_NUMBER_ID` | ID do telefone remetente da API; não é o telefone nem o WABA ID |
| `WHATSAPP_TEST_RECIPIENT` | Celular pessoal autorizado, somente dígitos com país e DDD; não é o número da clínica |
| `WHATSAPP_ACCESS_TOKEN` | Token completo Meta para chamadas de saída e assinatura da conta |
| `WHATSAPP_API_VERSION` | Configuração atual: `v26.0` |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | WABA ID, necessário apenas para o script de assinatura |

| `BOT_ADMIN_PASSWORD` | Senha exclusiva do painel, mínimo 16 caracteres. Sem ela, o painel fica indisponível |
| `BOT_STATE_FILE` | Caminho do estado; no Railway usar `/data/bot-state.json` com volume em `/data` |

O servidor exige as credenciais originais da integração exceto WABA ID; as duas variáveis `BOT_*` são explicadas na seção do painel; `PORT` e `OPENAI_MODEL` possuem padrões. O verify token confirma o callback e não tem expiração implementada no código. O access token autoriza chamadas à API; acompanhar sua validade e planejar credencial operacional antes de uso contínuo.

### Identificadores de teste (não são segredos)

| Item | Valor |
| --- | --- |
| Aplicativo | Alps Atendimento |
| App ID | `1051411227659862` |
| Número Meta de teste | `+1 (555) 201-0524` |
| Phone Number ID | `1248663335005516` |
| WABA ID | `2155430935315740` |

O celular pessoal foi omitido deste README público. Consultar as variáveis privadas. Não reutilizar automaticamente os IDs de teste na conexão do número oficial.

## Desenvolvimento local

Usar preferencialmente Node 22, alinhado ao Dockerfile; o desenvolvimento inicial também funcionou em Node 24.

```powershell
git clone https://github.com/matioly/assistente_alps.git
cd assistente_alps
npm ci
```

Criar `.env` com as variáveis acima e executar:

```powershell
npm start
# Alternativa com reinício ao salvar:
npm run dev
```

Abrir `http://localhost:3000`. O projeto usa `require` e CommonJS. Não mudar para módulos ES apenas para corrigir um `await`: usar função `async`, como no script de assinatura.

Para webhooks locais foi usado `cloudflared tunnel --url http://127.0.0.1:3000`. Cada URL temporária nova exige atualizar o callback. O Railway substitui esse túnel e o Node local no atendimento hospedado. Após validar o callback hospedado, o computador pode ser desligado.

## Railway e publicação

1. Serviço conectado ao GitHub, branch `main`, build pelo Dockerfile.
2. Configurar credenciais em **Variables**, incluindo `PORT=3000`.
3. Manter a porta do domínio em `3000` e `app.listen(porta, "0.0.0.0", ...)`.
4. Após o push, conferir o novo deploy e seu commit em **Deployments**.
5. **Build Logs** mostram construção da imagem; **Deploy Logs** mostram o Node e os webhooks. Status Active sozinho não comprova que HTTP responde.

Plano escolhido: Hobby. Conferir consumo e cobrança no painel; OpenAI tem cobrança separada.

```powershell
git add README.md
git commit -m "docs: documenta Railway e continuidade"
git push origin main
```

Para código, adicionar explicitamente os arquivos modificados. Conferir `git status` e `git diff --cached` antes do commit. Nunca adicionar `.env` ou segredos. Em builds Docker locais, garantir que `.dockerignore` exclua `.env`, variantes com segredos, `.git` e `node_modules`: o Dockerfile usa `COPY . .`.

## Meta: callback e WABA

1. Na configuração de webhooks, usar a URL Railway com `/webhook`.
2. Informar o mesmo `WEBHOOK_VERIFY_TOKEN` do Railway e verificar/salvar.
3. Conferir assinatura do campo `messages`. Certificado de cliente ficou desativado nesta implantação.
4. O aplicativo também precisa estar assinado na WABA correta.

**Problema já resolvido:** mensagens reais apareciam no painel Meta, mas somente eventos sintéticos chegavam ao Node. A correção foi assinar o aplicativo na WABA com o script abaixo. A assinatura da conta de teste já foi concluída; não repetir a cada deploy.

Para uma nova WABA, configurar ID e token com acesso à conta e executar conscientemente:

```powershell
node assinar-whatsapp.js
```

Esperado: `Aplicativo assinado na conta WhatsApp: true`. Este comando altera a assinatura na Meta; não é uma consulta.

## Teste completo e operação

1. Abrir a URL pública e confirmar a mensagem de funcionamento (valida apenas HTTP).
2. Confirmar callback salvo e abrir **Deploy Logs** no Railway.
3. Do celular permitido, enviar texto ao número de teste.
4. Esperar `[WEBHOOK] POST recebido`, `telefoneCorreto: true` e `destinatarioPermitido: true`.
5. Confirmar a resposta no celular. `Resposta aceita pela Meta` comprova aceitação, não necessariamente entrega.
6. Enviar `/novo` para reiniciar a conversa.
7. Registrar resultado/data aqui; depois encerrar Node local e Cloudflare Tunnel.

O botão de teste sintético da Meta usa IDs fictícios; filtros `false` são esperados nesse teste e não justificam retirar a restrição de remetente.

## Diagnóstico

| Sintoma | O que conferir |
| --- | --- |
| Application failed to respond | Deploy Logs, escuta `0.0.0.0`, `PORT` e porta do domínio. `127.0.0.1` foi a causa nesta implantação |
| Falta configurar variável | Railway Variables e novo deploy; o erro menciona `.env` mesmo na nuvem |
| GET `/webhook` retorna 403 | Esperado sem os parâmetros de verificação; testar `/` para disponibilidade |
| Falha ao verificar callback | URL pública e verify token idêntico ao servidor |
| Teste sintético chega; real só aparece no painel | Assinatura da WABA correta, campo `messages` e callback |
| telefoneCorreto false | Comparar metadata.phone_number_id com a variável; dados sintéticos usam IDs fictícios |
| destinatarioPermitido false | Comparar remetente real com variável pessoal de teste |
| Assinatura inválida | App secret correto e corpo bruto preservado para HMAC |
| POST chega mas atendimento falha | HTTP/Código Meta nos logs, validade e acesso das credenciais, disponibilidade da OpenAI |
| Nenhum POST | Investigar entrega e callback antes da IA; log inicial precede filtros e OpenAI |
| Cannot find module ./instrucoes | Arquivo `instrucoes.js`, incluindo capitalização correta em Linux |
| Erro de sintaxe no prompt | Texto deve estar dentro de string JavaScript exportada |

Compartilhar somente logs sem segredos. O tratamento atual de exceções é resumido; melhorar diagnóstico sanitizado é uma pendência.

## Limites atuais

- Apenas um remetente e um Phone Number ID permitidos.
- Texto apenas; mídia recebe pedido para escrever.
- `/novo` limpa histórico global; entrada máxima de 3.000 caracteres.
- Limite de 40 itens de histórico (normalmente 20 trocas completas).
- OpenAI: até 600 tokens de saída, timeout de 30 segundos, sem retries do SDK; envio Meta com timeout de 20 segundos.
- `store: false` na OpenAI não representa garantia geral de ausência de retenção por todos os provedores.
- Histórico, fila e deduplicação em memória; perdidos em reinício/deploy. Limpeza dos IDs com mais de 24 horas ocorre na chegada de eventos.
- HTTP 200 é enviado antes da conclusão do atendimento; não há fila durável. Falhas após marcar uma mensagem como recebida podem impedir seu reprocessamento.
- Uma conversa global: **não liberar outros pacientes apenas removendo o filtro**.
- Não há agenda nem encaminhamento real para recepção. Horário e pausa agora são aplicados no servidor.
- `npm test` valida horários, controle temporário, persistência e proteção do painel com dados locais fictícios, sem consumir APIs externas.

## Próximos passos antes de atender pacientes

- [x] Confirmar resposta completa pelo Railway após trocar callback e corrigir token.
- [ ] Verificar fluxo oficial de coexistência para preservar WhatsApp Business usado pela recepção antes de registrar/migrar o número oficial. A tela comum de adicionar número não comprova essa preservação.
- [ ] Verificar telefone com acesso a SMS/ligação na clínica; avaliar impacto antes de excluir conta ou concluir migração.
- [ ] Configurar novos IDs, acesso do token e assinatura na WABA correspondente.
- [x] Substituir token de teste pelo token do usuário de sistema.
- [ ] Confirmar expiração selecionada e acompanhar validade/custos.
- [ ] Isolar histórico por paciente, persistir estado e implementar fila durável, retentativas e idempotência.
- [x] Implementar horário: segunda a sexta antes de 09h, 12h–13h e a partir das 18h; sábados/domingos completos, `America/Sao_Paulo`.
- [ ] Publicar esta branch, configurar senha e volume e validar pelo WhatsApp.
- [ ] Definir tratamento específico de feriados (atualmente seguem o dia da semana).
- [x] Implementar ativação/pausa global temporária de 30, 60 ou 120 minutos e retorno ao automático.
- [ ] Atendimento humano por conversa, acompanhamento de solicitações e eventual integração de agenda.
- [ ] Revisar prompt com equipe: nome, origem do contato, interesse, uma pergunta por vez, sem repetir informações. Priorizar urgências; não inventar preço, diagnóstico, disponibilidade ou agendamento.
- [ ] Definir acesso, retenção/exclusão de dados, política de privacidade e operação de logs.
- [ ] Criar testes relevantes antes de liberar múltiplos pacientes, incluindo isolamento de conversas e horário.

## Horários e painel da recepção

Fuso fixo `America/Sao_Paulo`; independe do fuso do servidor.

| Período | Bot automático |
| --- | --- |
| Segunda a sexta, 09h–12h e 13h–18h | Pausado |
| Segunda a sexta, 12h–13h | Ativo |
| Segunda a sexta, antes de 09h e a partir de 18h | Ativo |
| Sábado e domingo | Ativo o dia todo |

O limite inicial é inclusivo: pausa exatamente às 09h/13h, ativa às 12h/18h. Feriados seguem o dia da semana até que uma regra adicional seja definida.

O painel fica em `/painel` no mesmo domínio do bot. Exibe estado atual e permite ativar ou pausar por 30, 60 ou 120 minutos, ou voltar ao automático. O prazo é conferido no servidor a cada consulta/mensagem, sem cron. Todas as recepcionistas veem o mesmo estado; a última alteração salva prevalece. O prazo é fixo, não se renova ao recarregar a página.

### Preparação no Railway antes da publicação

1. Manter uma única réplica do serviço.
2. Criar/anexar um volume persistente ao serviço com ponto de montagem `/data`.
3. Definir `BOT_STATE_FILE=/data/bot-state.json` em Variables.
4. Definir `BOT_ADMIN_PASSWORD` com senha exclusiva de pelo menos 16 caracteres. Compartilhar com a recepção por canal privado.
5. Publicar a branch revisada na `main` para o deploy automático; conferir o commit ativo.
6. Abrir `https://assistentealps-production.up.railway.app/painel` após o deploy e entrar com a senha.
7. Testar ativar por 30 minutos, enviar mensagem do celular autorizado; pausar e confirmar que uma nova mensagem é recebida sem resposta; voltar ao automático e conferir o horário exibido.
8. Para validar persistência, salvar uma pausa temporária, reiniciar o serviço e confirmar que o prazo foi preservado. Ao final, voltar ao automático.

Sem volume, o arquivo padrão `data/bot-state.json` é local e pode sumir em um deploy, fazendo o bot voltar ao automático. O painel só confirma a alteração depois de salvar em disco. Arquivo inválido ou inacessível impede a inicialização, em vez de ignorar uma pausa salva. Não editar o arquivo manualmente com o processo rodando.

### Comportamento e limites

- O webhook continua verificando assinatura e recebendo mensagens mesmo com o bot pausado. Responde HTTP 200, registra o motivo e não consulta a IA nem envia mensagem automática.
- Mensagens recebidas na pausa não ficam em espera para resposta futura. Histórico de teste é limpo quando uma mensagem é ignorada nesse período.
- A permissão é conferida no recebimento, na saída da fila e antes de cada envio. Alteração manual invalida respostas que estavam em processamento. Chamadas à IA já iniciadas podem consumir tokens; mensagens já entregues à Meta não podem ser recolhidas.
- A pausa é global, não por paciente. O limite de um destinatário de teste e o histórico global foram preservados.
- Sessões do painel duram até 8 horas e terminam em um reinício/deploy. Cookies são HttpOnly, SameSite=Strict e Secure em produção (`NODE_ENV=production`, já definido no Dockerfile).
- Senha não vai ao HTML nem aos logs. API exige sessão e cabeçalho específico para alterações; não habilitar CORS para origens externas.
- Login limita globalmente a 10 tentativas incorretas em 15 minutos por processo. Após excesso, aguardar 15 minutos; a programação do bot continua funcionando. Uma pessoa que conhece a senha pode mudar o modo global; não há contas individuais/auditoria nominal.
- Ausência de `BOT_ADMIN_PASSWORD` desabilita o painel, mas mantém a programação automática.
- O servidor permanece ligado no Railway. A economia é de chamadas de IA durante pausas; não é desligamento programado da hospedagem.

### Verificação local

```sh
npm ci
npm test
```

Os testes usam credenciais fictícias e não enviam mensagens nem chamam a OpenAI.

## Contexto para retomar

> O WhatsApp de teste respondeu pelo Railway em 10/09/2026 após trocar o access token pelo do usuário de sistema bot_alps. O bot continua restrito a um destinatário e com histórico global em memória. A branch feat/horarios-painel adiciona programação 09–12/13–18, almoço e fim de semana, além de painel com senha e pausa/ativação temporária persistida. Confirmar publicação, senha e volume antes de usar o painel. Depois preparar a conexão do número oficial preservando o WhatsApp Business, isolamento por paciente e atendimento humano. Nunca expor credenciais nem liberar múltiplos pacientes apenas removendo o filtro.
