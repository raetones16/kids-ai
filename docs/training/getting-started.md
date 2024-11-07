# Developer Getting Started Guide

## Prerequisites
- Node.js v20.18.0
- Docker Desktop
- Git
- GitHub account with repository access

## Initial Setup

### 1. Clone Repository
```bash
git clone https://github.com/raetones16/kids-ai.git
cd kids-ai
```

### 2. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Install dependencies
npm install

# Start development environment
docker-compose up -d
```

### 3. Development Tools
- VSCode (Recommended)
- ESLint extension
- Prettier extension
- Docker extension

## Development Process

### Starting Development
1. Always start from development branch:
```bash
git checkout development
git pull origin development
```

2. Create feature branch:
```bash
git checkout -b feature/phase-{number}-{feature-name}
```

### Code Quality
- Run type checking: `npm run type-check`
- Run linting: `npm run lint`
- Run tests: `npm run test`
- Ensure all checks pass before committing

### Making Changes
1. Follow the Git workflow procedures in `docs/workflows/git-procedures.md`
2. Use conventional commit messages
3. Keep changes focused and atomic
4. Document new features or changes

### Testing Locally
1. Start development environment:
```bash
docker-compose up -d
npm run dev
```

2. Access development server:
- API: http://localhost:3000
- Documentation: http://localhost:3000/docs (when implemented)

### Submitting Changes
1. Push your changes:
```bash
git push origin feature/phase-{number}-{feature-name}
```

2. Create Pull Request on GitHub:
- Use PR template
- Link related issues
- Provide clear description
- Wait for CI checks
- Address review comments

## Project Structure
```
.
├── .github/           # GitHub configurations
├── docs/             # Documentation
├── src/              # Source code
│   ├── config/       # Configuration
│   ├── controllers/  # Route controllers
│   ├── models/       # Data models
│   └── routes/       # API routes
└── tests/            # Test files
```

## Common Tasks

### Adding Dependencies
```bash
# Production dependency
npm install package-name

# Development dependency
npm install -D package-name
```

### Database Operations
- Access MongoDB: mongodb://localhost:27017
- Database name: kids-ai
- Use MongoDB Compass for GUI (optional)

### Running Tests
```bash
# Run all tests
npm test

# Run specific test file
npm test -- path/to/test-file.test.ts
```

### Troubleshooting
1. Docker Issues:
```bash
# Restart containers
docker-compose down
docker-compose up -d

# View logs
docker-compose logs -f
```

2. Node Issues:
```bash
# Clear dependencies
rm -rf node_modules
npm install
```

3. Build Issues:
```bash
# Clear build
rm -rf dist
npm run build
```

## Getting Help
1. Check existing documentation
2. Review similar PRs/issues
3. Ask in team chat
4. Create an issue for bugs

## Best Practices
1. Follow TypeScript best practices
2. Write clear commit messages
3. Document new features
4. Add tests for new functionality
5. Keep PR sizes manageable
6. Review your own code first

## Security
1. Never commit secrets
2. Keep dependencies updated
3. Follow security guidelines
4. Report security issues immediately