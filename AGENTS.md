# AGENTS.md

Este repositório é a **referência do pipeline padrão** dos projetos do Filipe:

```
CI → bump na develop → release por tag → sync main → develop
```

Use-o como fonte da verdade ao padronizar/adequar outro repositório.

- **Leia o `README.md` antes de propor qualquer mudança de fluxo** — ele mapeia
  evento por evento, com as guardas e o porquê de cada decisão.
- Os arquivos a copiar são `.github/workflows/{ci,bump,release}.yml` (+
  `.github/pull_request_template.md`).
- Checklist de adaptação por repo de destino: README § *Portar para outro
  repositório*.
- **Não simplifique as guardas sem entender o que elas seguram:**
  - bump na `develop`, e não na branch do PR (evita o "Approve and run");
  - `release.yml` nunca escreve na `main` (evita segundo deploy);
  - guarda de "tag já existe" (re-run/hotfix não recriam release);
  - sync `main → develop` **falha** em conflito, em vez de resolver sozinho;
  - `delete_branch_on_merge` fica `false` (senão o PR de release apaga a `develop`).
- Antes de portar, confira no destino: default branch `main`, existência da
  `develop`, `delete_branch_on_merge = false` e os scripts que o `ci.yml` chama
  (`lint`, `build`, `test`, `checks`).
