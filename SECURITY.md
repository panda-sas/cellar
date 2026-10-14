# Security Policy

## Supported versions

Only the latest `backend-v*` and `frontend-v*` release tags receive fixes (see
`RELEASING.md`). Older tags are not patched; upgrade to the current release.

## Reporting a vulnerability

Please do not open a public issue for a security problem.

Report it privately through GitHub:
https://github.com/sidxz/cellar/security/advisories/new

Include the affected component (backend, frontend, deployment), steps to
reproduce, and the impact you observed. You will receive an acknowledgement
within five working days, updates while a fix is prepared, and credit in the
release notes unless you ask otherwise.

## Scope

ChemCellar runs inside lab networks behind an institutional identity provider.
Authentication is delegated to Duar, an external identity service; issues in
Duar itself belong to that project.

## Automated checks

- Trivy scans lockfiles, secrets and both container images on every pull
  request and weekly (`.github/workflows/security.yml`); `make security-scan`
  gates every release tag. Accepted findings are listed in `.trivyignore` with
  a reason.
- Dependabot keeps Python, JavaScript, Docker and GitHub Actions dependencies
  current.
- Ruff runs the flake8-bandit (`S`) rule set on every backend change.
