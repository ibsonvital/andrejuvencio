# Controle Avanfisio online

Este prototipo transforma as duas planilhas em um app web simples com login, duas telas de preenchimento e tabelas prontas para consulta no Power BI.

## Login provisório

Enquanto o Supabase nao estiver configurado, use:

```text
Usuario: andre
Senha: 123456
```

Com o Supabase configurado, crie em `Authentication > Users` este usuario:

```text
Email: andre@avanfisio.local
Senha: 123456
```

O site continua aceitando `andre / 123456`, mas entra no Supabase usando esse e-mail e salva direto no banco.

## Funcoes do sistema

- Cadastro e edicao de O.S.
- Cadastro e edicao do plano estrategico.
- Campo de status, percentual de avanco e andamento/atualizacao para cada registro.
- Relatorios com busca.
- Exportacao para Excel.
- Exclusao de registros com confirmacao por usuario e senha.
- Modo claro e modo escuro.

## Arquivos

- `index.html`: tela de login, abas e formularios.
- `styles.css`: layout responsivo para celular e PC.
- `app.js`: login, cadastro, edicao e listagem.
- `supabase-schema.sql`: tabelas, politicas de acesso e views para Power BI.
- `supabase-seed.sql`: carga inicial gerada a partir das planilhas.
- `seed-data.js`: carga inicial para o modo demonstracao do site.
- `imagens/`: pasta das imagens do portal.

## Imagens do portal

O site ja esta apontando para estas imagens:

- Logo Avanfisio: `imagens/avanfisio.png`
- Logo A3V Engenharia: `imagens/n engenharia.png`
- Foto do usuario Andre: `imagens/andre.jfif`

## Como configurar o Supabase

1. Crie um projeto no Supabase.
2. No Supabase, abra `SQL Editor` e execute o conteudo de `supabase-schema.sql`.
3. Depois execute o conteudo de `supabase-seed.sql` para carregar os dados das planilhas no banco.
4. Em `Authentication > Users`, crie os usuarios que poderao acessar.
5. Em `Project Settings > API`, copie:
   - `Project URL`
   - `anon public key`
6. Cole esses valores no inicio do arquivo `app.js`:

```js
const SUPABASE_URL = 'SUA_PROJECT_URL';
const SUPABASE_ANON_KEY = 'SUA_ANON_PUBLIC_KEY';
```

Depois disso, o login passa a ser o usuario e senha criados no Supabase.

Atencao: a chave publishable ja foi colocada no `app.js`, mas ainda falta trocar `COLE_AQUI_A_URL_DO_SUPABASE` pela `Project URL` do Supabase.

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
