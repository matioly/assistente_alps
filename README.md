# Alps Atendimento

Assistente da Alps Oral Clinic com Node.js, Express, WhatsApp Cloud API e OpenAI Responses API, hospedado no Railway.

## Estado em 10/09/2026

- Repositório: https://github.com/matioly/assistente_alps — branch `main`.
- Serviço Railway: `assistente_alps`, Dockerfile com Node 22 Alpine, uma réplica.
- URL: https://assistentealps-production.up.railway.app
- Callback: https://assistentealps-production.up.railway.app/webhook
- A URL pública já retornou **Servidor Alps Atendimento funcionando!**, após corrigir a escuta para `0.0.0.0`.
- Conversa completa pelo WhatsApp validada localmente após assinar o aplicativo na WABA.
- Última ação informada: trocar o callback Meta para Railway. **Falta registrar a confirmação da resposta completa pelo Railway.**
- Número oficial da clínica ainda não conectado. O bot permanece restrito ao celular pessoal autorizado para teste.

Hospedagem concluída não significa atendimento a pacientes liberado. A próxima sessão deve começar pelo teste completo no Railway.

## Arquitetura e arquivos

A Meta entrega mensagens por POST HTTPS. O servidor valida assinatura, telefone e remetente, processa uma fila em memória, consulta a OpenAI e envia a resposta pela Cloud API.

| Arquivo | Função |
| --- | --- |
| `server.js` | HTTP, webhook, assinatura HMAC, filtros, histórico, fila e resposta |
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

O servidor exige as credenciais da tabela exceto WABA ID; `PORT` e `OPENAI_MODEL` possuem padrões. O verify token confirma o callback e não tem expiração implementada no código. O access token autoriza chamadas à API; acompanhar sua validade e planejar credencial operacional antes de uso contínuo.

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
- Não há agenda, encaminhamento real para recepção nem controle de horário em código.
- `npm test` é um placeholder que falha; não há suíte automatizada funcional configurada.

## Próximos passos antes de atender pacientes

- [ ] Confirmar resposta completa pelo Railway após trocar callback.
- [ ] Verificar fluxo oficial de coexistência para preservar WhatsApp Business usado pela recepção antes de registrar/migrar o número oficial. A tela comum de adicionar número não comprova essa preservação.
- [ ] Verificar telefone com acesso a SMS/ligação na clínica; avaliar impacto antes de excluir conta ou concluir migração.
- [ ] Configurar novos IDs, acesso do token e assinatura na WABA correspondente.
- [ ] Definir credencial operacional, acompanhamento de validade e custos.
- [ ] Isolar histórico por paciente, persistir estado e implementar fila durável, retentativas e idempotência.
- [ ] Implementar horário em código: segunda a sexta antes de 09:00 e a partir de 18:15; sábados/domingos completos, `America/Sao_Paulo`. Definir feriados. Hoje citar horário no prompt não impõe essa regra.
- [ ] Implementar pausa e atendimento humano, acompanhamento de solicitações e eventual integração de agenda.
- [ ] Revisar prompt com equipe: nome, origem do contato, interesse, uma pergunta por vez, sem repetir informações. Priorizar urgências; não inventar preço, diagnóstico, disponibilidade ou agendamento.
- [ ] Definir acesso, retenção/exclusão de dados, política de privacidade e operação de logs.
- [ ] Criar testes relevantes antes de liberar múltiplos pacientes, incluindo isolamento de conversas e horário.

## Contexto para retomar

> Leia este README e o código atual. HTTP já funciona no Railway; atendimento WhatsApp local foi validado após assinatura da WABA. Confirme o teste completo no Railway. O bot continua restrito a um destinatário, com histórico global em memória e sem controle de horário em código. A próxima etapa é conectar o número oficial preservando o WhatsApp Business da recepção e preparar isolamento por paciente, persistência, horário e atendimento humano. Não reutilize IDs de teste no número oficial nem exponha credenciais.
