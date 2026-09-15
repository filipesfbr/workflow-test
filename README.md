# workflow-test

Bancada do **pipeline padrão** de projetos pessoais. O código em `src/dinheiro.ts`
existe só para dar lint, build, test e checks de verdade para a pipeline rodar — o
que este repositório valida é o **fluxo**: branches, bump de versão, release por
tag e sync `main → develop`.

Este README é o mapa exato do que está ligado hoje: cada evento, cada workflow,
o que escreve onde e com qual guarda.

## O fluxo em uma imagem

```
mudança:
  feat/slug ──PR (squash)──▶ develop ──PR "release: vX.Y.Z" (merge commit)──▶ main
                               ▲                                              │
                               │                                     tag vX.Y.Z + Release
                               │                                              │
versão (automático):           └──────── sync main → develop ◀────────────────┘
  push em develop ──▶ bump.yml   → commit "chore: bump version to X.Y.Z" na develop
  push em main    ──▶ release.yml → tag + Release → sync (merge do bot) na develop
```

- `develop` = integração. `main` = o que foi released (default branch do repo).
- A versão **entra no commit que vai para a `main`**, e ela é colocada lá antes de
  existir o PR de release: o bump acontece na `develop`.
- Nada é mergeado por automação. Todo merge é seu.

## Mapa de gatilhos

| Evento | Workflow | Job | Escreve? |
| --- | --- | --- | --- |
| PR aberto/atualizado (qualquer base) | `ci.yml` | `ci` | não (`contents: read`) |
| push em `develop` | `ci.yml` | `ci` | não |
| push em `develop` | `bump.yml` | `bump` | **sim**, commit direto na `develop` |
| push em `main` | `ci.yml` | `ci` | não |
| push em `main` | `release.yml` | `release` → `sync-develop` | **sim**, cria tag+Release e commita na `develop` |
| `workflow_dispatch` manual | os três | idem | idem |

Detalhe que engana: o push do bump na `develop` **não** dispara CI (ver regra 8).
O CI que aparece em `push`/`develop` é o do merge do PR, rodado no commit *antes*
do bump.

## O ciclo de release, passo a passo

Exemplo real — foi assim que saiu a `v0.1.4`:

1. **Feature entra na `develop`.** PR `chore/ci-sem-corrida` (#10) com base
   `develop`, CI verde, merge por **squash**. A `develop` fica linear (1 commit
   por PR, o título vira a mensagem).
2. **O push na `develop` dispara duas coisas em paralelo:** o `ci.yml` (roda no
   commit do merge) e o `bump.yml`. O `bump.yml` vê que a versão da `develop`
   (0.1.3) é igual à última tag (`v0.1.3`), sobe para `0.1.4` e commita
   `chore: bump version to 0.1.4` direto na `develop`.
3. **PR de release.** `develop → main`, título `release: v0.1.4` (#11). O CI roda
   no PR como em qualquer outro. Merge por **merge commit** — é esse commit
   âncora que a tag vai apontar depois.
4. **O push na `main` dispara o `release.yml`:** lê `package.json` do commit
   mergeado, cria a tag `v0.1.4` e a GitHub Release com notas geradas
   automaticamente. Em paralelo o `ci.yml` roda na `main`.
5. **`sync-develop`** (job seguinte do `release.yml`, `needs: release`): faz
   `merge origin/main` na `develop` e pusha `chore: sync main into develop`. Em
   condições normais é no-op — o merge do PR de release já deixou a `main`
   contida na `develop` (o `merge-base --is-ancestor` detecta e sai sem fazer
   nada). Ele existe para reancorar a `develop` no ponto do release.

Depois disso `main` e `develop` apontam para o mesmo conteúdo, e o próximo merge
na `develop` bumpa de novo (agora 0.1.4 == `v0.1.4` → 0.1.5).

## Os três workflows

### `ci.yml` — o portão de qualidade

- **Dispara em:** `push` em `[main, develop]`, todo `pull_request` e
  `workflow_dispatch`.
- **Roda:** `npm ci` → `npm run lint` → `npm run build` → `npm test` →
  `npm run checks` (Node 22, cache do npm).
- **Não roda `--fix`:** o CI falha, quem conserta é o dev.
- **`permissions: contents: read`** — o CI não escreve nada.
- **Concurrency:** `ci-${{ github.ref }}-${{ github.event_name }}` com
  `cancel-in-progress: true`. O `event_name` está no grupo de propósito: `push` e
  execução manual no **mesmo ref** são eventos diferentes e, sem ele, travavam um
  ao outro em vez de um cancelar o outro.
- Os `checks/*.check.mjs` são regras de negócio puras (sem banco, sem rede, sem
  servidor) e rodam em segundos.
- **O gatilho `workflow_dispatch` é ferramenta manual** (re-rodar o CI sem
  precisar de um push). Até o PR #10 o `bump.yml` chamava
  `gh workflow run ci.yml --ref develop` depois de commitar a versão; a chamada
  foi removida — era ela que causava a corrida entre os dois CIs da mesma branch.

### `bump.yml` — a versão na `develop`

- **Dispara em:** `push` em `develop`, e `workflow_dispatch` com o input `kind`
  (`patch` | `minor` | `major`, padrão `patch`).
- **`permissions: contents: write`**, concurrency `bump-develop` com
  `cancel-in-progress: false` (bump não se cancela: dois bumps concorrentes
  gerariam versão errada).
- **Lógica exata:**
  1. `LATEST_TAG` = última tag que casa com `v*` (`git describe --tags --abbrev=0`).
  2. `BASE` = essa tag sem o `v` (ou `0.0.0` se não existir tag).
  3. `HEAD` = `version` do `package.json` da `develop`.
  4. `CANDIDATO` = `BASE` + 1 no nível escolhido (`patch`/`minor`/`major`).
  5. `NOVA` = o **maior** entre `CANDIDATO` e `HEAD`.
  6. Se `NOVA == HEAD`, sai sem fazer nada. Senão `npm version --no-git-tag-version`,
     commita `chore: bump version to X.Y.Z` (incluindo `package-lock.json`, se
     existir) e pusha na `develop`.
- **Consequências dessa regra:**
  - **1 bump por ciclo de release.** Depois do release, o primeiro merge na
    `develop` bumpa; os merges seguintes não fazem nada (a versão já está à
    frente da última tag).
  - **Nunca rebaixa.** Se você subiu a versão na mão no `package.json`, o
    workflow respeita — ou não faz nada, ou sobe a partir dela.
  - **Se a `develop` ficou atrás** da última tag (ex.: `0.1.0` com tag `v0.1.4`),
    o próximo push a traz direto para `0.1.5`.
- **A base é a maior tag no formato `vX.Y.Z`** (`git tag --sort=-v:refname` +
  filtro do formato), não a tag mais próxima do histórico. Tag com sufixo
  (`v1.2.0-beta.1`) era usada como base e fazia o parser gerar `1.2.NaN`, que o
  `npm version` rejeita — o job **falhava**. Com o filtro, ela é simplesmente
  ignorada.
- **Minor/major é decisão humana**, por dois caminhos: editar o `package.json` no
  PR (o workflow respeita) ou rodar o workflow na mão com `kind`.
- **Por que na `develop` e não no PR de release:** quando um workflow empurra um
  commit na branch de um PR usando o `GITHUB_TOKEN`, o GitHub passa a exigir
  aprovação manual ("Approve and run") para os workflows daquele PR — o PR de
  release ficaria com checks pendentes esperando aprovação. Empurrando na
  `develop`, antes de existir o PR de release, isso não acontece.

### `release.yml` — tag, Release e sync

- **Dispara em:** `push` em `main` e `workflow_dispatch` (re-run, ou release
  depois de um merge feito por automação, que não gera evento de `push`).
- **`permissions: contents: write`**, concurrency `release-main` serializado.
- **Job `release`:**
  1. Lê `version` do `package.json` do commit da `main`.
  2. **Guarda de idempotência:** se a tag `vX.Y.Z` já existe, não cria nada
     (`release ignorado`). É o que protege re-run e hotfix direto na `main` de
     recriar o release em cima de si mesmo.
  3. Cria a tag + Release (`softprops/action-gh-release@v2`, notas geradas,
     `make_latest: true`).
  - **Este workflow nunca escreve na `main`.** Um push extra ali geraria um
    segundo deploy.
- **Job `sync-develop`** (`needs: release`) — rede de segurança para a `develop`:
  - Faz checkout de `main` (não de `develop`: se a branch não existir, o checkout
    mataria o job antes de conseguir recriá-la).
  - Se a `develop` não existe → **recria a partir da `main`** e sai, com
    `::warning::` no log.
  - Se `main` já é ancestral de `develop` → nada a fazer (caso normal).
  - Senão, `git merge origin/main` e push. **Conflito aqui não é resolvido no
    automático:** o job falha, e a `develop` fica dessincronizada até alguém
    resolver.

## Regras do desenho (o porquê)

1. **A versão está no commit que vai pra `main`, antes do PR de release.** O
   deploy builda o commit e lê o `package.json` (a imagem não leva `.git`), então
   a versão precisa estar lá — mas não pode ser empurrada na branch de um PR
   (ver "Approve and run" acima). Por isso o bump vive na `develop`.
2. **1 bump por ciclo de release** (regra do `bump.yml`, detalhada acima).
3. **Minor/major é decisão humana**, não heurística de commit.
4. **O release nunca escreve na `main`** e é idempotente por checagem de tag.
5. **Deploy ≠ release.** Deploy é o PaaS buildando o push na `main`. Release
   é a tag + notas: rastro, auditoria e rollback.
6. **O CI roda o mesmo comando que você roda local**, e falha em vez de consertar.
7. **Checks de regra de negócio não precisam de banco** — é o que trava regressão
   de regra com valor legal em segundos.
8. **Push feito com `GITHUB_TOKEN` não dispara workflow.** Vale para o commit do
   bump e para o merge do sync: o commit da versão não gera run de CI (só
   `package.json`/`package-lock.json` mudam, e ele já passou pelo CI dentro do
   PR). Vale para qualquer automação futura: um merge bot na `main` não gera run
   de `push` — nesse caso, disparar via `workflow_dispatch`, que é a exceção
   prevista na doc.
9. **Squash em PR pra `develop`** (histórico linear) e **merge commit em PR pra
   `main`** (commit âncora do release, que a tag aponta).
10. **A `develop` nunca pode ser apagada — por ninguém** (detalhes na próxima
    seção).
11. **O merge é sempre seu.** A pipeline roda CI, bumpa a versão na `develop` e
    cria tag/Release — nunca mergeia.

## Casos especiais

- **Hotfix direto na `main`** (sem passar pela `develop`): o `release.yml` roda,
  mas se a versão não foi bumpada a tag já existe → release ignorado. Se você
  bumpou no commit, sai release novo; o `sync-develop` então traz a `main` para a
  `develop`.
- **Re-run do `release.yml`:** inofensivo pela guarda de tag.
- **Release manual:** `gh workflow run release.yml --ref main`.
- **Bump manual (minor/major):** `gh workflow run bump.yml --ref develop -f kind=minor`.
- **Conflito no sync:** o job `sync-develop` falha (`CONFLICT (add/add)` / `Automatic
  merge failed`) e a `develop` fica **intacta** — resolver na mão (`develop` ← `main`)
  e pushar. Testado.
- **`develop` apagada:** o `release.yml` recria a partir da `main` com `::warning::`.
  ⚠️ **O push da recriação não dispara o `bump.yml`** — é push de `GITHUB_TOKEN`, que
  não gera evento de workflow (regra 8). A `develop` volta na versão da `main` e só
  bumpa no próximo push humano. O `bump.yml`, porém, **não** trata branch ausente: se a
  `develop` sumir entre o push e o checkout, ele falha com
  `A branch or tag with the name 'develop' could not be found`.
- **Recriar a `develop` descarta o que só existia nela.** O sync recria a partir da
  `main`, então commits exclusivos se perdem **e todo arquivo que só existia na
  `develop` volta ao estado da `main`** — inclusive `.github/workflows/`. Como o
  workflow de `push` roda o arquivo do commit empurrado, um fix que só estava na
  `develop` é revertido silenciosamente (aconteceu na bateria: a recriação trouxe de
  volta o `bump.yml` antigo, sem o filtro de tag `vX.Y.Z`). É o preço da rede de
  segurança, não um bug.
- **Bump commitando com o PR de release já aberto → `action_required`.** O push do
  merge na `develop` dispara o `bump.yml`, que commita segundos depois. Se o PR
  `develop → main` **já existir** nessa hora, o push do bot gera um `synchronize` no
  PR, o head passa a ser o commit **do bot** e o GitHub põe os workflows de
  `pull_request` daquele PR em "Approve and run": o check `ci` nunca reporta e o PR
  fica `blocked` (com required check, para sempre).
  **Abrir o PR depois do bump terminar resolve** — testado: o CI roda normal e o
  estado fica `clean`. Se já caiu nisso, destravar com
  `POST /repos/{owner}/{repo}/actions/runs/<id>/approve`.
- **Push direto na `main`** funciona para admin (bypass) e é o caminho do hotfix:
  com bump no commit sai release novo; sem bump, o release vê a tag existente e
  ignora.

## Configuração do repo (precisa ficar assim)

- **`delete_branch_on_merge` = `false`.** Com ele ligado, mergear um PR cujo head
  é a `develop` — que é justamente o PR de release — **apaga a `develop`
  inteira**. Aconteceu no primeiro teste: o `release.yml` falhou com
  `A branch or tag with the name 'develop' could not be found`.
- **Nunca use `--delete-branch` num PR pra `main`**: a head é a `develop`.
- **Métodos de merge:** squash ✔ (pra `develop`), merge commit ✔ (pra `main`),
  rebase ✘ (`allow_rebase_merge: false`). Na `main`, o ruleset trava em **só
  `merge`** (`allowed_merge_methods: [merge]`) — com o ruleset ativo, o commit
  âncora do release é garantido pela plataforma, não por convenção. **Com o repo
  privado no plano Free o ruleset está desligado** (ver aviso abaixo) e isso volta
  a ser disciplina de quem opera.
- **Default branch:** `main`.
- **Workflow permissions do repo:** `read` por padrão — o que é seguro, porque
  cada workflow eleva só o que precisa declarando `permissions:` no próprio YAML
  (`contents: write` no bump e no release).
- **Rulesets** — ⚠️ **hoje estão desligados**: ruleset exige repo **público**
  (no plano Free) ou plano pago (Pro/Team) quando o repo é privado. Este repo
  **virou privado**, então o GitHub desabilitou os dois e a API responde
  `403 Upgrade to GitHub Pro or make this repository public to enable this
  feature`. O desenho abaixo é o que vale quando o repo estiver público (ou com
  plano pago) — foi assim que o fluxo foi validado:
  - `protege-main`: exige PR antes do merge (0 aprovações) **só por merge commit**
    (`allowed_merge_methods: [merge]`), exige o check `ci` verde, bloqueia force
    push e bloqueia deleção. Tem `bypass` de admin — é o que permite o **hotfix
    direto na `main`**.
  - `protege-develop`: bloqueia force push e deleção, **sem `bypass` nenhum** — nem
    admin apaga ou reescreve a `develop` (testado: force push retorna `GH013
    Cannot force-push to this branch` e o DELETE não passa). Ela **não pode exigir
    PR**: o `bump.yml` e o job `sync-develop` pusham direto nela.
- **O que continua valendo em repo privado:** as configurações do repo
  (`allow_rebase_merge: false`, `delete_branch_on_merge: false`, default branch
  `main`) — essas não dependem de plano. "Proteção" de ruleset não: em repo
  privado no Free, nada impede push direto na `main`, force push ou deleção da
  `develop`.
- ⚠️ **`bypass` de admin vale para TODAS as regras do ruleset em que está.** Com
  `bypass` na `main`, push direto, force push e deleção passam por cima das regras
  (deleção da default branch o GitHub barra de qualquer jeito). Por isso a
  `develop` ficou **sem** bypass — é a branch que não pode sumir. A `main` mantém
  o bypass só pelo hotfix direto; se um dia quiser ela também blindada, tire o
  bypass dela (o hotfix passa a ser um PR normal).

Push direto na `develop` (feito pelo `bump.yml`, pelo sync e por commits manuais
como este) continua passando com o `protege-develop`, porque nenhuma das duas
regras dele barra push normal — só force push e deleção.

## Portar para outro repositório

Checklist do que o padrão exige:

- [ ] Os arquivos de `.github/`: `workflows/{ci,bump,release}.yml` e
      `pull_request_template.md`.
- [ ] `AGENTS.md` no repo de destino, apontando para este padrão.
- [ ] `package.json` com `version` e scripts `lint`, `build`, `test`, `checks`.
- [ ] Branches `main` (default) e `develop`; `delete_branch_on_merge: false`.
      ⚠️ **Empurre a `main` primeiro**: a primeira branch que chega num repo vazio
      vira a *default branch*. Empurrando a `develop` antes, ela vira a default —
      e aí não pode ser deletada (nem pelo sync, para testar), o ruleset
      `protege-main` não governa a branch certa e qualquer ferramenta que leia a
      default (Dependabot, por exemplo) olha pra branch errada.
- [ ] Rulesets: `main` com PR (só merge commit) + check `ci` + bypass admin;
      `develop` com force push/deleção bloqueados, **sem** bypass (nunca exigir PR).
      ⚠️ **Só existem em repo público no plano Free** (ou plano pago): repo privado
      no Free fica sem nenhuma dessas travas.
- [ ] Squash habilitado para PRs em `develop`; merge commit para PRs em `main`.
- [ ] Nenhum secret: tudo roda com o `GITHUB_TOKEN`.
- [ ] Se o PaaS builda a cada push na `main`: manter o bump fora da `main`
      (é o desenho deste repo), senão cada release vira dois builds.

## Actions

- Referências usadas: `actions/checkout@v7`, `actions/setup-node@v7` e
  `softprops/action-gh-release@v3`.
- Pela **major** (`@v7`), não por SHA: é um template didático e o Dependabot cuida
  dos minors/patches. Em repo sensível, pinar por SHA é o recomendado.
- Não há bot de dependências no padrão: **atualizar as actions é ação manual**.
  Trocando de major (ex.: `v7` -> `v8`), conferir o runtime exigido do runner e
  validar com um PR (o CI cobre), porque o job de release só roda na `main`.

## Uso local

```bash
npm ci
npm run lint
npm run build
npm test
npm run checks
```

## Histórico que engana

Runs de workflows que **não existem mais** neste repo continuam aparecendo em
Actions: `Bump version on PR to main` (o modelo antigo, bump dentro do PR),
`Merge when green` (auto-merge por label, que no plano free não funcionava) e
`PR title`. Não são estado vigente — o diretório `.github/workflows/` tem só
`ci.yml`, `bump.yml` e `release.yml`.
