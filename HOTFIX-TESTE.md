# Marcador de teste

Arquivo criado por um push DIRETO na `main` (sem PR, sem bump de versão), para
validar tres coisas de uma vez:

1. o ruleset `protege-main` (que exige PR) bloqueia ou deixa passar o push direto;
2. o `release.yml` nao recria release quando a tag `v1.0.0` ja existe;
3. o job `sync-develop` faz merge de verdade quando a `main` fica a frente.

Removido no proximo commit (hotfix com bump).
