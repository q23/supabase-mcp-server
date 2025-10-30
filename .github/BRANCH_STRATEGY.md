# Branch Strategy (Git Flow - October 2025)

## Branch Structure

```
main (protected)
├── develop (protected)
│   ├── feature/new-tool
│   ├── feature/improve-monitoring
│   └── bugfix/health-check-timeout
└── hotfix/critical-security-fix
```

## Protected Branches

### `main` - Production Branch
- **Purpose**: Production-ready code only
- **Protection Rules**:
  - ✅ Require pull request reviews (1 approval)
  - ✅ Dismiss stale reviews
  - ✅ Require conversation resolution
  - ✅ No force pushes
  - ✅ No deletions
  - ✅ Enforce for administrators
- **Merge From**: `develop` or `hotfix/*` only
- **Deploy**: Automatically to production

### `develop` - Integration Branch
- **Purpose**: Integration of features
- **Protection Rules**: Same as `main`
- **Merge From**: `feature/*`, `bugfix/*`
- **Deploy**: Automatically to staging (optional)

## Branch Naming Conventions

### Feature Branches
```bash
feature/short-description
feature/add-backup-rotation
feature/improve-jwt-validation
```

### Bugfix Branches
```bash
bugfix/short-description
bugfix/fix-health-check-timeout
bugfix/correct-session-cleanup
```

### Hotfix Branches
```bash
hotfix/short-description
hotfix/security-patch-cve-2025-1234
hotfix/critical-memory-leak
```

### Release Branches (Optional)
```bash
release/v1.2.0
release/v2.0.0-beta
```

## Workflow

### 1. New Feature Development

```bash
# 1. Start from develop
git checkout develop
git pull origin develop

# 2. Create feature branch
git checkout -b feature/add-new-tool

# 3. Develop and commit
git add .
git commit -m "feat(tools): add new backup tool"

# 4. Push to GitHub
git push -u origin feature/add-new-tool

# 5. Create Pull Request
gh pr create \
  --base develop \
  --title "feat: Add backup rotation tool" \
  --body "Implements automatic backup rotation with configurable retention"

# 6. After approval: Merge via GitHub UI
# 7. Delete feature branch
git branch -d feature/add-new-tool
git push origin --delete feature/add-new-tool
```

### 2. Bugfix

```bash
# 1. Start from develop
git checkout develop
git pull origin develop

# 2. Create bugfix branch
git checkout -b bugfix/fix-health-check

# 3. Fix and commit
git commit -m "fix(health): correct timeout handling"

# 4. Create PR to develop
gh pr create --base develop --title "fix: Correct health check timeout"

# 5. After merge: Delete branch
```

### 3. Hotfix (Critical Production Issue)

```bash
# 1. Start from main (!)
git checkout main
git pull origin main

# 2. Create hotfix branch
git checkout -b hotfix/security-patch

# 3. Fix and commit
git commit -m "fix(security): patch CVE-2025-1234"

# 4. Create PR to main
gh pr create \
  --base main \
  --title "hotfix: Security patch CVE-2025-1234" \
  --label "security,hotfix"

# 5. After merge to main: Also merge to develop
git checkout develop
git merge main
git push origin develop
```

### 4. Release (Version Bump)

```bash
# 1. Create release branch from develop
git checkout develop
git pull origin develop
git checkout -b release/v1.2.0

# 2. Bump version
npm version minor  # 1.1.0 -> 1.2.0

# 3. Update CHANGELOG.md
nano CHANGELOG.md

# 4. Commit
git commit -am "chore(release): v1.2.0"

# 5. Create PR to main
gh pr create \
  --base main \
  --title "release: v1.2.0" \
  --label "release"

# 6. After merge to main: Tag release
git checkout main
git pull origin main
git tag v1.2.0
git push origin v1.2.0

# 7. Merge back to develop
git checkout develop
git merge main
git push origin develop
```

## Pull Request Requirements

All PRs to `main` or `develop` must have:

- ✅ **1 Approval** from code owner or maintainer
- ✅ **All Conversations Resolved**
- ✅ **CI Checks Passing** (when configured)
- ✅ **Tests Added** for new features
- ✅ **Documentation Updated** if needed
- ✅ **CHANGELOG.md Updated** for user-facing changes

## Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style
- `refactor`: Code refactoring
- `test`: Tests
- `chore`: Maintenance
- `perf`: Performance

**Examples:**
```bash
feat(dokploy): add project auto-selection
fix(health): correct status code handling
docs(readme): update deployment instructions
chore(deps): update dependencies
```

## Branch Lifecycle

```
feature/new-tool
├── Created from: develop
├── Commits: Multiple
├── PR to: develop
├── After merge: Delete
└── Lifetime: Days to weeks

develop
├── Created from: main
├── Long-lived: Yes
├── Deploys to: Staging
└── Merges to: main (releases)

main
├── Protected: Yes
├── Long-lived: Yes
├── Deploys to: Production
└── Only accepts: develop, hotfix
```

## Best Practices

### DO ✅
- Keep feature branches short-lived (< 2 weeks)
- Rebase feature branches before creating PR
- Write descriptive commit messages
- Update documentation with code changes
- Run tests locally before pushing
- Resolve merge conflicts promptly
- Delete branches after merge

### DON'T ❌
- Don't commit directly to `main` or `develop`
- Don't force push to protected branches
- Don't merge without review
- Don't leave PRs open for weeks
- Don't skip CI checks
- Don't commit secrets or credentials
- Don't use `git push --force`

## Emergency Procedures

### Production is Broken

```bash
# 1. Create hotfix immediately from main
git checkout main
git checkout -b hotfix/emergency-fix

# 2. Fix the issue
# ... make changes ...

# 3. Fast-track PR (require 1 approval)
gh pr create --base main --title "hotfix: Emergency fix" --label "hotfix,urgent"

# 4. After merge: Deploy immediately
# 5. Backport to develop
```

### Revert a Bad Merge

```bash
# 1. Find the merge commit
git log --oneline -10

# 2. Revert the merge
git revert -m 1 <merge-commit-hash>

# 3. Create PR with revert
gh pr create --base main --title "revert: Bad merge of PR #123"
```

## Automation

### Auto-Deploy on Merge

```yaml
# .github/workflows/deploy.yml
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: ./deployment/deploy.sh
```

### Auto-Delete Merged Branches

Enable in GitHub Settings:
- Settings → General → Pull Requests
- ✅ Automatically delete head branches

## Review Checklist

Before approving a PR:

- [ ] Code follows project standards
- [ ] Tests pass
- [ ] No TypeScript errors
- [ ] Documentation updated
- [ ] CHANGELOG updated (if user-facing)
- [ ] No security issues
- [ ] Performance acceptable
- [ ] Backward compatible (or migration plan)

## Resources

- [GitHub Flow](https://guides.github.com/introduction/flow/)
- [Git Flow](https://nvie.com/posts/a-successful-git-branching-model/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
