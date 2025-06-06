# Scripts Directory

This directory contains build and deployment scripts for the RAG Contracts Library.

## 📁 Scripts

### `build.sh`
Production build script for GitHub Actions and CI/CD pipelines.

**Purpose:**
- Builds and packages the contracts library
- Publishes to GitHub Packages registry
- Creates git tags for versioning
- Generates metadata for OndemandEnv platform

**Usage:**
```bash
# Run via npm script (recommended)
npm run ci:build

# Run directly (requires bash and environment variables)
bash scripts/build.sh
```

**Required Environment Variables:**
- `github_token` - GitHub token for package publishing
- `GITHUB_RUN_ID` - GitHub Actions run ID
- `GITHUB_SHA` - Git commit SHA
- `RUNNER_TEMP` - Temporary directory for build artifacts
- `ODMD_contractsLibPkgName` - Expected package name

### `setup.sh`
Development environment setup script.

**Purpose:**
- Validates Node.js installation and version
- Installs npm dependencies
- Compiles TypeScript
- Runs tests
- Provides setup verification

**Usage:**
```bash
bash scripts/setup.sh
```

## 🔄 CI/CD Pipeline

The `build.sh` script is designed to run in GitHub Actions with the following flow:

1. **Authentication** - Sets up npm registry authentication
2. **Build** - Installs dependencies and compiles TypeScript
3. **Test** - Runs the test suite
4. **Package** - Creates npm package (.tgz file)
5. **Publish** - Publishes to GitHub Packages (handles version conflicts)
6. **Tag** - Creates git tags for version tracking
7. **Metadata** - Generates OndemandEnv platform metadata

## 🛠️ Local Development

For local development, use the standard npm scripts:

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run tests
npm test

# Package for distribution
npm run package

# Clean build artifacts
npm run clean
```

## 📦 Package Publishing

The build script publishes packages to the GitHub Packages registry at:
- Registry: `https://npm.pkg.github.com/`
- Package: `@contractslib/rag-contracts`

The script handles version conflicts gracefully and continues execution if the version already exists.

## 🏷️ Versioning

The build script automatically:
- Creates a `v{version}` tag from package.json
- Creates/updates a `latest` tag
- Pushes tags to the remote repository
- Adds npm dist-tags for commit tracking 