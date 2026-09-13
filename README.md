# workflow-test

Repositório de teste do **pipeline padrão** para os projetos do Filipe.
O objetivo não é o código — é validar de ponta a ponta o fluxo de branches,
bump de versão, release por tag e merge para `main`, para depois aplicar o mesmo
desenho em todos os repos (cofre-ai, romulo-seguros, erpstratos, pessoais).

## Fluxo

```
feat/slug ──PR──▶ develop ──PR "release: vX.Y.Z"──▶ main ──▶ tag + Release
                    ▲                                          │
                    └──────────── sync main → develop ─────────┘
```

## Workflows

| Workflow | Dispara em | Faz |
| --- | --- | --- |
| `ci.yml` | push em `main`/`develop`, qualquer PR e `workflow_dispatch` | `npm ci` → lint → build → test → checks |
| `bump.yml` | push em `develop` (+ `workflow_dispatch` com `kind`) | bumpa a versão quando a develop está igual à última tag (1 por ciclo) |
| `release.yml` | push em `main` (e `workflow_dispatch`) | cria tag `vX.Y.Z` + Release, depois sincroniza `develop` |
| `merge-when-green.yml` | conclusão do CI | mergeia o PR marcado com a label `merge` |
| `pr-title.yml` | PR aberto/editado | exige título em Conventional Commits |

## Regras (o porquê)

1. **A versão entra no commit que vai pra `main`, antes de existir o PR de
   release.** O deploy builda o commit e lê o `package.json` (a imagem não tem
   `.git`), então a versão precisa estar no commit — mas **não** pode ser
   empurrada na branch de um PR: quando um workflow empurra um commit na branch
   de um PR com o `GITHUB_TOKEN`, o GitHub passa a exigir aprovação manual
   ("Approve and run") para os workflows daquele PR. Isso travava o PR de release
   e quebrava o auto-merge. Por isso o bump vive na `develop`.
2. **1 bump por ciclo de release.** O workflow só mexe quando a versão da develop
   é igual à última tag. Depois do release (`main` → tag → sync `develop`), o
   primeiro merge na develop bumpa; os demais merges não fazem nada.
3. **Minor/major é decisão humana:** edite o `package.json` num PR (o workflow
   respeita e nunca rebaixa) ou rode o `bump.yml` na mão com `kind=minor|major`.
4. **O workflow de release nunca escreve em `main`.** Ele só lê a versão mergeada
   e tagueia. Com a guarda de "tag já existe", re-run e hotfix direto em `main`
   não recriam release.
5. **Deploy ≠ release.** Deploy é o Easypanel buildando o push em `main`.
   Release é a tag + notas: rastro, auditoria e rollback.
6. **CI roda o mesmo comando que você roda local**, e falha em vez de consertar
   (sem `lint --fix` no CI).
7. **Checks de regra de negócio não precisam de banco.** `checks/*.check.mjs` roda
   em segundos e é o que trava regressão de regra com valor legal.
8. **Push feito com `GITHUB_TOKEN` não dispara workflow.** Vale para o commit do
   bump e para o sync. `workflow_dispatch` é a exceção — o `bump.yml` usa isso
   para rodar o CI no commit da versão, e o bot de auto-merge para disparar o
   release depois de um merge feito por ele.
9. **Squash em PR pra `develop`** (develop linear, 1 commit por PR, título vira a
   mensagem) e **merge commit em PR pra `main`** (commit-âncora do release, que a
   tag aponta).

## Versionamento

- Patch automático: 1 por ciclo de release, feito na `develop` pelo `bump.yml`.
- `release:minor` / `release:major`: manual — editar `package.json` no PR ou rodar
  o `bump.yml` com o input `kind`.
- O bump nunca rebaixa versão: se a develop já está à frente da última tag, ele
  não toca em nada.

## Auto-merge sem GitHub Pro

`branch protection` e `rulesets` exigem Pro (ou repo público) em repositório
privado. No free, o `merge-when-green.yml` faz o papel de "required check":
o CI passa + label `merge` no PR = merge automático.

## Uso local

```bash
npm ci
npm run lint
npm run build
npm test
npm run checks
```
