# Audius MCP Development Guide

## Build & Test Commands
- Build: `npm run build`
- Start: `npm run start`
- Dev mode: `npm run dev`
- Lint: `npm run lint`
- Test all: `npm run test`
- Test single: `npm test -- -t "test name"`

## Code Style
- TypeScript with strict typing
- Use ES6+ features and async/await
- Follow camelCase for variables/functions, PascalCase for classes/interfaces
- Group imports: external libraries first, then internal modules
- Prefer functional programming patterns where appropriate
- Use descriptive error messages with proper error handling
- Cache expensive operations where possible

## Project Structure
- `/src`: Source code
- `/src/server`: Server configuration
- `/src/schemas`: Data validation schemas
- `/src/managers`: Business logic managers
- `/src/handlers`: API route handlers
- `/src/utils`: Utility functions