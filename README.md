# IRIS · Implantação de fornecedores

Sistema estático (HTML + CSS + JS puro, sem build e sem banco) para acompanhar treinamento e
adoção do app IRIS pelos fornecedores de remoção.

```
login.html    Entrada   — pede a senha antes de liberar as outras telas
index.html    Consulta  — só leitura, sem caminho para o admin
admin.html    Admin     — cadastro, edição, exclusão e publicação
dados.json    A base    — fornecedores e contratantes, única fonte de verdade
```

Duas abas nas duas telas: **Fornecedores** (178, empresas de remoção que usam o app) e
**Contratantes** (144, identificados só pelo código, com produtos P1–P4 e controle de treinamento).

### Contratantes e LGPD

As razões sociais foram removidas do `dados.json`. Cada contratante aparece pelo código —
`Contratante 7035`. O campo continua existindo no cadastro, opcional, caso um dia precise ser
preenchido em ambiente controlado.

Cada contratante tem agora **Treinado** (Sim/Não) e **Data do treinamento**. A base saiu com todos
em `Não` e sem data, para você atualizar. A bolinha pulsa quando o contratante está treinado, do
mesmo jeito que nos fornecedores.

A Consulta não tem link para o Admin. Quem precisa editar acessa `admin.html` direto pela URL —
é uma separação de conveniência, não de segurança: em site estático o arquivo continua público
para quem souber o endereço.

## Login

A senha **não está em nenhum arquivo**. O que o `login.html` guarda é o resultado de 250 mil
rodadas de PBKDF2-SHA256 sobre a senha somada a um sal aleatório. É operação de mão única: dá para
conferir se o que foi digitado bate, não dá para voltar do hash até a senha. Abrir o DevTools e ler
o código não revela nada utilizável.

Ao acertar, grava-se um marcador no `sessionStorage`. As duas telas conferem esse marcador antes de
desenhar qualquer coisa e mandam para o login se ele não existir. A sessão morre quando a aba fecha,
e o botão **Sair** encerra na hora.

### O que esse login não é

Ele impede alguém de *ver* as telas pelo navegador. Ele não impede alguém de baixar o
`dados.json` direto pela URL — em site estático o arquivo é servido publicamente, e nenhum
JavaScript muda isso. Se os dados precisarem de sigilo real, os caminhos são: repositório privado
com Pages restrito (exige plano pago), hospedagem com autenticação de verdade (Cloudflare Access,
Netlify Identity, Vercel) ou cifrar o `dados.json` com a própria senha. Posso montar a versão
cifrada quando fizer sentido.

### Trocar a senha

O hash foi gerado assim — rode com a senha nova e substitua `SAL` e `VERIFICADOR` no `login.html`,
mais `SESSAO_OK` nas três telas:

```python
import hashlib, os
senha = 'sua-senha-nova'
sal = os.urandom(16).hex()
verificador = hashlib.pbkdf2_hmac('sha256', senha.encode(), bytes.fromhex(sal), 250000, 32).hex()
sessao = hashlib.sha256((verificador + '|sessao-iris').encode()).hexdigest()
print(sal, verificador, sessao, sep='\n')
```

## Como os dados circulam

```
admin.html ──edita──> rascunho no navegador (localStorage)
                              │
                              ├── Publicar no GitHub ──> dados.json no repo ──> index.html lê
                              └── Baixar dados.json ──> você sobe o arquivo ──> index.html lê
```

A Consulta faz `fetch('dados.json')` a cada carregamento. Então:

- **Dentro do Admin** a edição é instantânea.
- **Para os outros**, vale o que estiver publicado no `dados.json`. Publicou, deu F5, apareceu.
  Não existe push automático porque não há servidor — é o preço de rodar sem banco.

Se o `dados.json` não puder ser lido (arquivo aberto direto do disco, via `file://`, ou fora do ar),
as duas páginas caem numa cópia embutida da planilha e avisam `dados embutidos` no topo.

## Subir no GitHub Pages

1. Novo repositório, joga os quatro arquivos na raiz.
2. Settings → Pages → Source: `Deploy from a branch`, branch `main`, pasta `/ (root)`.
3. Acesse `https://SEU-USUARIO.github.io/SEU-REPO/`.

## Publicar direto do Admin

No Admin, abra **Publicar direto no GitHub Pages** e preencha:

- **Repositório**: `usuario/nome-do-repo`
- **Caminho**: `dados.json`
- **Branch**: `main`
- **Token**: crie em GitHub → Settings → Developer settings → Personal access tokens →
  **Fine-grained tokens**. Selecione só este repositório e dê a permissão
  **Contents: Read and write**. Nada além disso.

O token fica no `localStorage` do seu navegador — nunca vai para o `dados.json` nem para o repositório.
Use isso na sua máquina, não em computador compartilhado. Se quiser trocar depois, apagar o campo e
salvar a configuração já resolve.

Depois de publicar, o Pages leva até ~1 minuto para servir o arquivo novo.

## Sem token, o caminho manual

**Baixar dados.json** no Admin → substitui o arquivo no repositório (pela interface do GitHub ou
`git commit`). Mesmo efeito, um passo a mais.

## Campos

Vieram da planilha, com dois derivados calculados na hora (mês de referência e dias desde o
treinamento — não precisam ser digitados) e um novo campo livre de observações.

A **situação** também é calculada: `Em uso`, `Em uso · web`, `Treinado · sem uso`,
o motivo do impedimento quando existe (`Recusa/Objeção`, `iOS Incompatível`, `Não Quis`, `Inativo`),
`Agendado` ou `Pendente`.

## Como ler as bolinhas

A bolinha grande, ao lado da situação, **pulsa quando o fornecedor já foi treinado** — verde se está
usando, laranja se treinou e ainda não usa. Nos contratantes a bolinha não pulsa: verde é ativo,
cinza é inativo. O pulso ficou reservado para o que está em movimento.

As quatro bolinhas pequenas no rodapé do card são a trilha: Agendamento → Treinamento →
App instalado → Em uso. As duas primeiras acendem em **laranja** (implantação), as duas últimas em
**verde** (adoção de verdade). Quando o fornecedor usa pela web sem app, a última aparece só com o
contorno verde: pulou uma etapa, e isso é informação, não erro.

## Voltar para o Excel

**Baixar CSV** gera arquivo com `;` e BOM, abre direto no Excel em português com os mesmos
cabeçalhos da planilha original.

## Se um dia precisar de multiusuário

Duas pessoas editando ao mesmo tempo se sobrescrevem — a última publicação vence. Enquanto a edição
for sua, tudo bem. Quando não for, o caminho mais curto é trocar o `dados.json` por Supabase ou
Firebase mantendo as mesmas duas telas: só muda de onde vem a lista.
## Supabase

O projeto agora tenta ler primeiro do Supabase e usa `dados.json` como reserva. Para ativar:

1. No Supabase, abra SQL Editor e rode o arquivo `supabase-schema.sql`.
2. Depois rode aqui no projeto:

```bash
npm run seed:supabase
```

Isso envia o `dados.json` atual para a tabela `iris_dados`. A partir dai, a Consulta le o banco e o
Admin salva fornecedores/contratantes no Supabase automaticamente. A aba **Chamados Sys4web** salva
os chamados nas tabelas `sys4web_chamados` e `sys4web_chamado_atualizacoes`.

A `SUPABASE_SECRET_KEY` nao deve ficar em HTML, JS publico, GitHub Pages ou navegador. Ela nao foi
gravada neste projeto; use apenas em backend seguro. Como ela foi compartilhada aqui, o ideal e
rotacionar essa chave no painel do Supabase.
