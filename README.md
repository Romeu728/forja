# Forja

Forja é um laboratório local para explorar combinações de temas e transformá-las em conceitos originais de jogos. A ferramenta consulta resultados públicos da web, apresenta links e trechos para pesquisa e oferece um protótipo procedural simples de exploração, coleta e construção.

## Requisitos

- Python 3.9 ou superior; não há dependências externas obrigatórias.
- A busca de referências exige acesso à internet e depende do serviço público HTML do DuckDuckGo.

## Executar

```powershell
python server.py
```

Abra <http://127.0.0.1:8000>. O servidor escuta apenas em `127.0.0.1` por padrão. Para escolher outra porta, defina `FORJA_PORT`; para expor a outro host da rede, defina `FORJA_HOST` conscientemente.

## Publicar no Render

O arquivo `render.yaml` configura um serviço web Python no plano gratuito do Render. Conecte o repositório ao Render e crie um **Blueprint** a partir dele; após o deploy, o painel informa o endereço público. O serviço lê a porta fornecida pelo Render e escuta externamente apenas quando `FORJA_HOST=0.0.0.0` estiver configurado. O plano gratuito pode suspender o serviço quando ocioso e a busca continua dependendo do DuckDuckGo.

## Publicar a página estática no GitHub Pages

O workflow `.github/workflows/pages.yml` publica automaticamente a pasta `web` quando houver push para a branch `romeu728-forja-mvp` ou execução manual do workflow. Ele solicita a ativação do Pages durante a primeira publicação. A página estática funciona sem servidor: gera um conceito no navegador, abre a pesquisa externa do DuckDuckGo e inclui o protótipo jogável. O endpoint Python e a lista de trechos de resultados requerem a implantação no Render.

## IA opcional

Sem configuração, Forja gera um conceito local com base nos temas. Para usar um endpoint compatível com a API de chat completions, configure as variáveis de ambiente antes de iniciar:

```powershell
$env:AI_BASE_URL = "https://seu-endpoint/v1"
$env:AI_API_KEY = "sua-chave"
$env:AI_MODEL = "nome-do-modelo"
python server.py
```

As credenciais ficam no servidor e não são enviadas ao navegador. Quando a IA estiver configurada, os dois temas são encaminhados ao endpoint configurado; em caso de falha, a interface informa que usou o conceito local.

## Como jogar

Use `WASD` ou as setas para andar, `E` para coletar madeira/minério próximos e `B` para construir o farol. Também há botões para toque. O mapa é determinístico para cada par de temas.

## Privacidade e limites

- Os temas são enviados ao DuckDuckGo para pesquisar referências públicas.
- Se a IA opcional estiver configurada, os temas também são enviados ao provedor indicado por `AI_BASE_URL`. Não configure um provedor em que não confia.
- As fontes são resultados de pesquisa externos: confira o contexto e os direitos no site de origem. Forja não baixa nem incorpora seus assets.
- Os conceitos e o protótipo usam temas gerais e conteúdo original; não reproduzem personagens, textos, arte, áudio ou código de jogos existentes.
- O protótipo é uma demonstração de mecânica, não um jogo completo. Esta versão não persiste pesquisas nem inventário.

## Testes

```powershell
python -m unittest discover -s tests
```
