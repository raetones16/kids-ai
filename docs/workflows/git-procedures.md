# Git Workflow Procedures

## Branch Structure
```
main
  └── development
      └── feature/phase-{number}-{feature-name}
      └── bugfix/phase-{number}-{issue-description}
```

## Daily Development Workflow

### 1. Starting New Work
```bash
# Update development branch
git checkout development
git pull origin development

# Create feature branch
git checkout -b feature/phase-{number}-{feature-name}
```

### 2. Making Changes
- Make your changes in small, logical commits
- Test your changes locally
- Ensure all CI checks pass

### 3. Committing Code
```bash
# Stage changes
git add <files>

# Commit with conventional commit message
git commit -m "type: description"

# Push to GitHub
git push origin feature/phase-{number}-{feature-name}
```

### 4. Pull Requests
1. Create PR on GitHub from your feature branch to development
2. Fill out PR template completely
3. Wait for CI checks to complete
4. Address any review comments
5. Merge only when approved and all checks pass

### 5. After Merge
```bash
# Switch back to development
git checkout development

# Get latest changes
git pull origin development

# Delete old feature branch (optional)
git branch -d feature/phase-{number}-{feature-name}
```

## Commit Message Format
```
type(scope): Subject line

Body (optional)

Footer (optional)

Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation
- style: Formatting
- refactor: Code restructuring
- test: Adding tests
- ci: CI/CD changes
```

## Backup Procedures
- Daily automated backups run at midnight UTC
- Backups are stored as GitHub Actions artifacts
- Retention period: 30 days
- Manual backup can be triggered from Actions tab

## Emergency Procedures

### Production Hotfix
```bash
# Create hotfix branch from main
git checkout main
git checkout -b hotfix/critical-issue

# Make changes, test thoroughly
# Create PR to main with "URGENT" label
```

### Code Freeze
1. Notify all developers
2. Stop merging to main/development
3. Document incident
4. Investigate issue
5. Update procedures if needed