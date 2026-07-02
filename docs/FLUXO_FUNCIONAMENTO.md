Fluxo de funcionamento da aplicação
Fase A — Arranque e preparação do RAG
O utilizador abre a aplicação no browser. A página principal (app/page.tsx) monta-se e, em paralelo, inicializam-se três motores de recuperação (RAG), cada um com indexação BM25 em memória.

RAG AdminLTE (modo HTML): o sistema lê a base de conhecimento estática embebida no código (ADMINLTE_KNOWLEDGE, ~38 componentes AdminLTE), tokeniza os campos de cada entrada (nome, descrição, tags, classes HTML) e constrói um índice BM25. Este processo é síncrono e quase instantâneo — não há modelo de ML nem dados externos. O progresso é apresentado no badge RAG Status no cabeçalho; a geração HTML só fica disponível quando o estado passa a Pronto.

RAG documentação Streamlit (modo Python): em segundo plano, o browser pede GET /api/streamlit-docs. O servidor Next.js obtém o ficheiro llms.txt de docs.streamlit.io, analisa-o em entradas (título, conteúdo, exemplos de código) e devolve JSON ao cliente, com cache de 1 hora. O cliente indexa essas entradas com BM25. Se esta etapa falhar, a aplicação continua, mas a geração Python fica sem contexto da documentação oficial.

RAG exemplos Streamlit (modo Python): o browser pede GET /api/streamlit-examples, que devolve 6 exemplos de dashboards completos embebidos no código do servidor (sem fetch externo). O cliente indexa-os com BM25 para uso como referências estruturais (few-shot). Se falhar, a geração continua sem estes exemplos.

Fase B — Configuração do LLM
O utilizador configura o fornecedor de modelo de linguagem na secção LLM Settings. Pode escolher entre Ollama local, Ollama Cloud (com chave API, guardada em localStorage) ou LM Studio, seleccionar o modelo (listado em tempo real via /api/tags ou /v1/models) e definir o modo de qualidade (rápido, qualidade ou personalizado, com temperature ajustável).

O utilizador pode testar a ligação ao fornecedor. Em caso de Ollama Cloud, os pedidos de chat e listagem de modelos passam por rotas proxy do Next.js (/api/ollama-cloud/chat e /api/ollama-cloud/tags) para evitar restrições de CORS no browser.

Fase C — Interacção e modo de saída
O utilizador escolhe o modo de saída: HTML + CSS + JS (AdminLTE 3) ou Python (Streamlit). Ao mudar de modo, o estado de geração e o plano são repostos; pedidos em curso são cancelados.

O utilizador descreve a interface desejada na área de prompt (ou selecciona um exemplo pré-definido da biblioteca integrada). Opcionalmente, pode clicar em Planear para que o LLM produza primeiro um plano de implementação em texto (sem código), com contexto RAG reduzido (top 3 entradas). O plano pode ser revisto, replaneado ou alterado por instruções antes da geração.

Fase D — Geração de código
Ao clicar Gerar, a aplicação verifica se o RAG AdminLTE está pronto, cancela qualquer pedido anterior e entra no estado A pesquisar na base de conhecimento.

Recuperação (RAG): consoante o modo, o gerador consulta o(s) motor(es) RAG com o prompt do utilizador (e plano, se existir):

HTML: getContext(prompt, 7) sobre a KB AdminLTE — BM25 com expansão PT→EN e sinónimos; devolve componentes e padrões em Markdown.
Python: getContext sobre documentação Streamlit (top 8) + exemplos (top 2) +, se aplicável, componentes de terceiros da KB estática (streamlit-components-knowledge.ts). No modo Python, verifica-se primeiro a cache em localStorage (TTL 2 h); se o prompt+modelo já foram gerados, devolve-se o resultado imediatamente.
Construção do prompt: o sistema monta um array de mensagens para o LLM — prompt de sistema rígido (regras AdminLTE ou Streamlit), contexto RAG injectado em blocos XML/Markdown (<reference_components>, <domain_reference>, etc.), confirmação simulada do assistente e o pedido final do utilizador (com secções obrigatórias amplificadas para prompts curtos).

Invocação do LLM: generateCompletion envia o pedido em streaming ao fornecedor configurado. Os tokens chegam incrementalmente ao painel de código. Existe timeout de inactividade (180 s) e suporte a cancelamento via AbortController.

Pós-processamento: quando o stream termina:

HTML: normalização de frameworks (Tailwind/Bootstrap 5 → AdminLTE/Bootstrap 4), validação estrutural; se falhar, um segundo pedido LLM de refinamento; parsing para { html, css, js, fullHtml }.
Python: remoção de fences Markdown, correcções automáticas, validação da API Streamlit; até dois passes de refinamento LLM se persistirem erros; geração automática de requirements.txt por detecção de imports.
O estado passa a Concluído; regista-se o tempo de geração. O código final actualiza a pré-visualização e o visualizador de código.

Fase E — Pré-visualização, edição e exportação
Modo HTML: a pré-visualização renderiza o fullHtml num iframe. O utilizador pode abrir o editor visual GrapesJS para editar WYSIWYG ou usar o assistente de IA (operações JSON sobre o DOM). Pode copiar, descarregar .html ou exportar ZIP com documentação e guia de integração API.

Modo Python: a pré-visualização mostra metadados da app e comandos pip install / streamlit run. O utilizador pode editar o código via chat com o LLM (editPythonCode) e exportar ZIP com app.py e requirements.txt.