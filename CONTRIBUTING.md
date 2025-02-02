# Development Guidelines and Security Practices

## Project Setup

1. Initial Setup Checklist
   - Create `.gitignore` as the first file in any new project
     * Must include `.env`, `.env.local`, `.env.*.local`
     * Must be committed before any other files
   - Create `.env.example` template file
     * Include all required environment variables with placeholder values
     * Document each variable's purpose
   - Never create `.env.local` until `.gitignore` is in place

2. Environment Variables
   - Use `.env.local` for local development
   - Never commit actual credentials
   - Rotate credentials if accidentally exposed

3. Git Safety
   - Always check `git status` before committing
   - Review `git diff` to catch sensitive data
   - Use pre-commit hooks to prevent accidental exposure

## Development Workflow

1. Code Standards
   - Follow TypeScript best practices
   - Document all functions and complex logic
   - Keep code modular and maintainable

2. Testing
   - Write unit tests for new functionality
   - Test edge cases and error conditions
   - Verify API integrations work as expected

3. Documentation
   - Keep README.md up to date
   - Document all environment variables
   - Include setup instructions for new developers

## Security Best Practices

1. Credential Management
   - Store sensitive data in `.env.local`
   - Use environment variables for all secrets
   - Never hardcode credentials

2. Code Review
   - Review for security implications
   - Check for exposed secrets
   - Validate input handling

3. Package Publishing
   - Review all files included in the package
   - Use `.npmignore` to exclude sensitive files
   - Never publish packages with real credentials

## Reporting Issues

If you discover a security issue:
1. DO NOT create a public GitHub issue
2. Email security@glassbead.dev with details
3. Allow time for the issue to be addressed before disclosure

## Pull Request Guidelines

1. Create feature branches
2. Keep changes focused and atomic
3. Include tests and documentation
4. Ensure all checks pass
5. Follow commit message conventions
