# Liga Finder — Frontend Angular

Interface em português para consultar a API de preços da Liga Pokémon. Angular 21, TypeScript, componentes standalone, HttpClient e signals.

## Executar localmente

Pré-requisito: Node.js 24.12+ (linha 24) ou outra versão compatível com Angular 21, e npm.

Inicie o backend em um terminal:

```powershell
cd C:\Users\sinval.neto\testeBuscaLiga
npm ci
npx playwright install chromium
npm run dev
```

Em outro terminal, execute o frontend:

```powershell
cd C:\Users\sinval.neto\FrontLiga
npm ci
npm start
```

Acesse **http://localhost:4200**. O backend deve responder em **http://localhost:3000**. O arquivo `proxy.conf.json` encaminha `/api/**` para o backend, evitando CORS durante o desenvolvimento. Tanto `npm start` quanto `npx ng serve` usam o proxy. Reinicie o servidor Angular após modificar a configuração do proxy.

Se a porta estiver ocupada, use `npm start -- --port 4201`.

## Funcionalidades

- Leilões aparecem em uma seção própria abaixo das lojas, somente quando a API retorna anúncios disponíveis. Exibe título, lance inicial/atual, preço fixo, incremento, encerramento em Brasília, vendedor, referências e link do leilão. Leilões não participam dos resumos de preço médio, menor preço ou estoque de lojas. Os quatro seletores também filtram leilões; preço e estoque filtram apenas as lojas.

- Condição, acabamento, idioma e estado são seletores de múltipla escolha, preenchidos exclusivamente com valores conhecidos das ofertas da busca inicial. Opções repetidas ou ausentes são descartadas. A lista original permanece disponível após aplicar filtros, inclusive quando a seleção não retorna ofertas. Uma nova busca pelo formulário superior limpa os filtros e atualiza as opções para a nova carta. Todos os seletores fecham ao clicar fora ou pressionar Esc.

- Logotipos das lojas junto ao nome na tabela, com carregamento sob demanda e iniciais como alternativa quando não há imagem ou o arquivo falha.

- A API testa numerações com 1, 2 e 3 dígitos, ignorando zeros à esquerda nas comparações. Quando isso encontra edições diferentes, a tela apresenta botões para escolher a carta correta e preserva os demais filtros.

- Card de filtros recolhido por padrão, abaixo dos resumos da carta e imediatamente acima de “Ofertas disponíveis”. “Mostrar filtros” expande e “Ocultar filtros” recolhe, preservando os valores. O botão “Aplicar filtros” atualiza a consulta. Seletor de condição com múltiplas escolhas: M, NM, SP, MP, HP e D. Nenhuma marcada inclui todas.
- Dois links por oferta quando disponíveis: “Ver oferta” na vitrine da Liga e “Ir à loja”, que usa o redirecionamento oficial para o produto no site da loja. Ambos abrem em outra aba.

- Imagem da carta identificada pela API, com prévia maior e ampliação ao clicar, além do botão “Ver carta na Liga Pokémon” ao lado do nome. A visualização ampliada fecha pelo botão, Esc ou clique fora da janela. A imagem tem descrição acessível e fallback quando ausente ou com erro. O backend deve estar atualizado para retornar `card.imageUrl` e `card.url`.

- Busca por nome, edição e número de carta (`GET /api/cards/prices`).
- Filtros de preço mínimo/máximo, estoque mínimo, estado, condição, acabamento e idioma.
- Tabela com loja, cidade/UF, preço, preço anterior quando houver desconto, estoque e atributos da carta.
- Ordenação local por menor/maior preço ou maior estoque, sem novas consultas ao portal.
- Paginação de 20 ofertas, com todas as ofertas mantidas em memória.
- Resumo de menor preço, preço médio, lojas com ID conhecido e estoque conhecido. Valores desconhecidos não entram na média e aparecem como `—` na tabela.
- Estados inicial, carregando, vazio e erros de conexão, validação, ambiguidade, rate limit e indisponibilidade.
- Links HTTPS das ofertas abertos em outra aba, restritos ao domínio da Liga Pokémon.
- Layout responsivo com rolagem horizontal restrita à tabela em telas pequenas.

Use os exemplos Articuno (132/128), Chandelure (137/128) e Pikachu (025/165) para preencher a consulta. Os resultados dependem da disponibilidade do portal e dos dados retornados pelo backend; a interface não usa dados simulados em execução normal.

## Validação

```powershell
npm test -- --watch=false
npm run build
```

Os testes usam o backend HTTP de testes do Angular e verificam filtros, validação, requisições duplicadas, erros, valores desconhecidos, resumo, ordenação, paginação e links.

Validação inicial em 23/10/2026: 10 testes e build aprovados; consulta real pelo navegador retornou 81 ofertas de Articuno (132/128), edição 30C. Esses totais são históricos.

## Estrutura

- `src/app/prices.service.ts`: contrato da API, parâmetros HTTP e timeout de 150 segundos.
- `src/app/app.ts`: estado da busca, validação, paginação e resumos.
- `src/app/app.html` e `app.css`: interface e layout responsivo.
- `proxy.conf.json`: endereço do backend local; altere `target` caso use outra porta/servidor.

## Produção

`npm run build` gera `dist/front-liga/browser`. O proxy do Angular funciona somente no servidor de desenvolvimento. Ao hospedar o frontend, configure o servidor web/reverse proxy para encaminhar `/api/` ao backend, preservando o caminho e com timeout compatível com consultas longas (180 segundos no proxy local). As rotas da aplicação devem servir `index.html`. Não coloque credenciais no código do frontend.

A fonte tipográfica é carregada pelo Google Fonts, com fallback para sans-serif. Não há autenticação implementada. O backend continua sendo um projeto separado: [BackEndLiga](https://github.com/sinborneto/BackEndLiga).

Projeto independente, sem afiliação à Liga Pokémon. Preços, estoque e frete devem ser confirmados na loja.
