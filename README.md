# Interface Generator

Aplicação Next.js que gera interfaces e dashboards a partir de descrições em linguagem natural, utilizando LLMs locais ou na Cloud, com RAG (Retrieval-Augmented Generation) para reforçar a qualidade do código gerado.

## Funcionalidades

- **Modo HTML** — Gera dashboards completos com AdminLTE 3, Bootstrap 4, Chart.js e Font Awesome
- **Modo Python** — Gera aplicações Streamlit com Pandas e Plotly
- **RAG integrado** — Pesquisa BM25 sobre bases de conhecimento curadas e documentação oficial
- **Planeamento opcional** — Cria, revê e altera um plano de implementação antes da geração
- **Pré-visualização em tempo real** — Visualização do HTML gerado num iframe; instruções de execução para Python
- **Editor visual** — Edição WYSIWYG com GrapesJS (modo HTML) e assistente de IA
- **Exportação** — Descarregar HTML, ZIP ou ficheiros Python (`app.py` + `requirements.txt`)
- **Múltiplos fornecedores LLM** — Ollama local, Ollama Cloud e LM Studio

## Requisitos

- **Node.js** 18+ (recomendado 20+)
- **pnpm**, npm ou yarn
- Para geração local: [Ollama](https://ollama.com) ou [LM Studio](https://lmstudio.ai) em execução
- Para modo Python: Python 3.x e Streamlit instalados localmente para executar o código gerado

## Instalação

```bash
# Clonar o repositório
git clone <url-do-repositório>
cd interface_generator

# Instalar dependências
pnpm install
# ou: npm install

# Iniciar em modo de desenvolvimento
pnpm dev
```

Abrir [http://localhost:3000](http://localhost:3000) no browser.

## Configuração do LLM

### Ollama (local)

1. Instalar e iniciar o Ollama: `ollama serve`
2. Transferir um modelo adequado, por exemplo: `ollama pull qwen2.5-coder:7b` ou utilizar o LLMFit (https://www.llmfit.org/ ou https://github.com/AlexsJones/llmfit/releases/tag/v0.9.33) para encontrar um modelo que se enquadre ao hardware.
3. Nas definições da aplicação, selecionar **Ollama** e testar a ligação

### Ollama Cloud

1. Criar uma chave API em [ollama.com/settings/keys](https://ollama.com/settings/keys)
2. Selecionar **Ollama Cloud** nas definições e colar a chave
3. A chave é guardada em `localStorage` do browser

### LM Studio

1. Iniciar o servidor local no LM Studio (porta predefinida: 1234)
2. Selecionar **LM Studio** nas definições e testar a ligação

## Utilização

1. Aguardar que o indicador RAG fique **Pronto** (canto superior direito)
2. Escolher o modo de saída: **HTML + CSS + JS** ou **Python (Streamlit)**
3. Descrever a interface desejada ou escolher um exemplo
4. *(Opcional)* Clicar em **Planear** para gerar um plano de implementação
5. Clicar em **Gerar** e aguardar a conclusão
6. Pré-visualizar, editar ou exportar o resultado

### Modo HTML

- A pré-visualização mostra o dashboard num iframe
- O botão **Editar** abre o editor visual GrapesJS com assistente de IA
- Exportar como ficheiro HTML único ou ZIP com documentação

### Modo Python

- O painel de pré-visualização mostra estatísticas e comandos de instalação/execução
- O editor de chat permite alterar o código com instruções em linguagem natural
- Exportar como ZIP com `app.py` e `requirements.txt`

```bash
pip install streamlit pandas plotly
streamlit run app.py
```

## Simulador de API

A pasta `API Simulator/` contém um servidor mock para testar dashboards gerados com dados simulados:

```bash
node "API Simulator/mock-api-server.js"
# Porta predefinida: 3001

# Servir o dashboard gerado
python -m http.server 8080
```

Consultar [`API Simulator/README.md`](API%20Simulator/README.md) para mais detalhes.

## Scripts disponíveis

| Comando | Descrição |
|---------|-----------|
| `pnpm dev` | Servidor de desenvolvimento Next.js |
| `pnpm build` | Compilação para produção |
| `pnpm start` | Servidor de produção |
| `pnpm lint` | Análise estática com ESLint |

## Estrutura do projeto

```
interface_generator/
├── app/                    # Rotas Next.js (App Router)
│   ├── page.tsx            # Página principal da aplicação
│   └── api/                # Rotas API (proxy Ollama Cloud, docs Streamlit)
├── components/             # Componentes React e shadcn/ui
├── lib/                    # Lógica de negócio (LLM, RAG, geradores)
├── hooks/                  # React hooks
├── docs/                   # Documentação técnica
│   └── ARCHITECTURE.md     # Arquitectura detalhada
└── API Simulator/          # Servidor mock REST/SSE
```

## Documentação técnica

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — visão de arquitectura, stack e componentes
- [`docs/INTERNAL_WORKFLOWS.md`](docs/INTERNAL_WORKFLOWS.md) — fluxos internos, ciclo de vida dos pedidos, RAG, prompts e tratamento de erros (guia para novos programadores)

## Stack tecnológica

- **Next.js 16** · **React 19** · **TypeScript**
- **Tailwind CSS 4** · **shadcn/ui** (Radix UI)
- **GrapesJS** · **JSZip**
- **BM25** (pesquisa por palavras-chave, sem embeddings)

## Limitações conhecidas

- A aplicação é orientada para uso local; não inclui autenticação
- A chave API do Ollama Cloud é guardada em `localStorage` (não adequado para ambientes partilhados)
- O modo Python não executa Streamlit no browser — é necessário correr localmente
- O Ollama local deve permitir pedidos CORS do browser, ou utilizar Ollama Cloud via proxy


## Licença

Projeto desenvolvido no âmbito da UC de "Projeto Informático" no ano letivo 25/26, sendo este criado pelos autores:
 - omleet (https://github.com/omleet)
 - MarriaCordeiro (https://github.com/MarriaCordeiro)