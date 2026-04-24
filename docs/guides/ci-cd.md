# CI/CD Pipeline

## GitHub Actions

The project uses GitHub Actions for continuous integration.

### Workflows

- **Test**: Runs on every push and PR
- **Lint**: Checks code style and formatting
- **Build**: Verifies the project builds successfully

### Deployment

- Automatic deployment to preview on PR
- Production deployment on merge to main
