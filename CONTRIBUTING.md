# Contributing

## Branch and pull request workflow

Create changes on a short-lived branch and open a pull request into `develop` or `main`.
Direct pushes to protected branches are not permitted. A pull request requires at least
one approving review from someone other than its author, all conversations resolved,
and every required CI check passing. New commits dismiss stale approvals.

Use squash merging so the validated pull request title becomes the commit on the target
branch. Force pushes and branch deletion are disabled for protected branches.

## Commit convention

Commit subjects and pull request titles use Conventional Commits:

```text
<type>(optional-scope): <description>
```

Allowed types are `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`,
`ci`, `chore`, and `revert`. Breaking changes may add `!` before the colon.

Examples:

```text
feat(resume): add PDF preview
fix(auth): preserve session after browser refresh
ci!: require MySQL migration verification
```

The `Conventional commits` GitHub Actions check validates every non-merge commit and the
pull request title.

## Required GitHub repository settings

An administrator must configure a ruleset for both `main` and `develop` in
**Settings > Rules > Rulesets**:

- Require a pull request before merging.
- Require one approval and dismiss stale approvals when new commits are pushed.
- Require conversation resolution before merging.
- Require status checks to pass and require branches to be up to date.
- Require `backend`, `frontend`, `database-integration`, `Conventional commits`,
  `Secret scan`, `Frontend dependency audit`, `Backend dependency audit`,
  `CodeQL (java-kotlin)`, and `CodeQL (javascript-typescript)`.
- Block force pushes and branch deletion, including for administrators.
- Require linear history and allow squash merge.

Do not mark the repository-governance audit item complete until the live GitHub API
confirms these rules are active.
