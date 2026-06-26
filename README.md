# Controle Avanfisio online

Este prototipo transforma as duas planilhas em um app web simples com login, duas telas de preenchimento e tabelas prontas para consulta no Power BI.

## Login provisório

Enquanto o Supabase nao estiver configurado, use:

```text
Usuario: andre
Senha: 123456
```

Nesse modo demonstracao, os registros ficam salvos somente no navegador. Para virar sistema real com banco de dados e Power BI, configure o Supabase no `app.js`.

## Arquivos

- `index.html`: tela de login, abas e formularios.
- `styles.css`: layout responsivo para celular e PC.
- `app.js`: login, cadastro, edicao e listagem.
- `supabase-schema.sql`: tabelas, politicas de acesso e views para Power BI.
- `imagens/`: pasta das imagens do portal.

## Imagens do portal

O site ja esta apontando para estas imagens:

- Logo Avanfisio: `imagens/avanfisio.png`
- Logo A3V Engenharia: `imagens/n engenharia.png`
- Foto do usuario Andre: `imagens/andre.jfif`

## Como configurar o Supabase

1. Crie um projeto no Supabase.
2. No Supabase, abra `SQL Editor` e execute o conteudo de `supabase-schema.sql`.
3. Em `Authentication > Users`, crie os usuarios que poderao acessar.
4. Em `Project Settings > API`, copie:
   - `Project URL`
   - `anon public key`
5. Cole esses valores no inicio do arquivo `app.js`:

```js
const SUPABASE_URL = 'SUA_PROJECT_URL';
const SUPABASE_ANON_KEY = 'SUA_ANON_PUBLIC_KEY';
```

Depois disso, o login passa a ser o usuario e senha criados no Supabase.

## Power BI

No Power BI, conecte no banco Postgres do Supabase e use as views:

- `public.vw_controle_os_powerbi`
- `public.vw_plano_estrategico_powerbi`

As views deixam os dados em formato mais limpo para relatorios, sem expor colunas internas como `id` e `created_by`.

## Importacao inicial das planilhas

Depois de criar as tabelas, exporte cada aba principal do Excel como CSV e importe no Supabase:

- `PLANILHA DE CONTROLE DE O.S..xlsx` entra na tabela `controle_os`.
- `PLANO ESTRATEGICO AVANFISIO 2026 V7.xlsx`, aba `Planilha1`, entra na tabela `plano_estrategico`.

Ao importar, revise as colunas de data. O Excel armazena datas como numeros internos, entao pode ser necessario converter para o formato `AAAA-MM-DD`.
