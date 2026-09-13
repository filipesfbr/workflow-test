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
| `ci.yml` | push em `main`/`develop` e qualquer PR | `npm ci` → lint → build → test → checks |
| `bump.yml` | PR aberto/reaberto/atualizado/labelado **para `main`** | calcula a próxima versão e commita no PR |
| `release.yml` | push em `main` (e `workflow_dispatch`) | cria tag `vX.Y.Z` + Release, depois sincroniza `develop` |
| `merge-when-green.yml` | conclusão do CI | mergeia o PR marcado com a label `merge` |
| `pr-title.yml` | PR aberto/editado | exige título em Conventional Commits |

## Regras (o porquê)

1. **A versão entra no commit que vai pra `main`.** O deploy builda o commit e lê
   o `package.json` (a imagem não tem `.git`). Bumpar depois do merge = push extra
   em `main` = segundo deploy. Por isso o bump acontece na abertura do PR.
2. **O workflow de release nunca escreve em `main`.** Ele só lê a versão mergeada
   e tagueia. Com a guarda de "tag já existe", re-run e hotfix direto em `main`
   não recriam release.
3. **Deploy ≠ release.** Deploy é o Easypanel buildando o push em `main`.
   Release é a tag + notas: rastro, auditoria e rollback.
4. **CI roda o mesmo comando que você roda local**, e falha em vez de consertar
   (sem `lint --fix` no CI).
5. **Checks de regra de negócio não precisam de banco.** `checks/*.check.mjs` roda
   em segundos e é o que trava regressão de regra com valor legal.
6. **Push feito com `GITHUB_TOKEN` não dispara workflow.** Vale para o commit do
   bump e para o sync. `workflow_dispatch` é a exceção — é assim que o bot de
   auto-merge consegue disparar o release depois de mergear.
7. **Squash em PR pra `develop`** (develop linear, 1 commit por PR, título vira a
   mensagem) e **merge commit em PR pra `main`** (commit-âncora do release, que a
   tag aponta).

## Versionamento

- Última tag `v*` + 1 patch por padrão.
- Label `release:minor` / `release:major` no PR pra `main` muda o salto.
- Se o `package.json` do PR já estiver à frente da última tag, ele ganha — o bump
  nunca rebaixa versão.

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
