# Kids AI Learning Platform

## Overview
A safe, educational platform where children can interact with AI while providing parents with comprehensive oversight and control over their children's AI interactions.

## Prerequisites
- Node.js v20.18.0
- Docker & Docker Compose
- MongoDB (handled via Docker)

## Setup
1. Clone the repository
```bash
git clone [repository-url]
cd kids-ai
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start development environment
```bash
docker-compose up -d
```

## Development
- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run test`: Run tests
- `npm run lint`: Run ESLint
- `npm run type-check`: Run TypeScript checks

## Branch Structure
```
main
  └── development
      └── feature/phase-{number}-{feature-name}
      └── bugfix/phase-{number}-{issue-description}
```

## Contributing
1. Create a new branch from development:
```bash
git checkout development
git pull origin development
git checkout -b feature/phase-{number}-{feature-name}
```

2. Make changes and commit using conventional commits:
```bash
git commit -m "feat(scope): description"
```

3. Push changes and create a pull request:
```bash
git push -u origin feature/phase-{number}-{feature-name}
```

4. Ensure all checks pass and request review

## License
[MIT License](LICENSE)