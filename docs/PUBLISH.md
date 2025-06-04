# Publishing to NPM

## Preparation
Before publishing to NPM, please ensure the following:

1. Update version in package.json
2. Run tests: `npm test`
3. Update CHANGELOG.md with latest changes

## Dry Run
Perform a dry run to verify what will be published:

```bash
npm publish --dry-run
```

This will list all files that would be published without actually publishing.

## Publish to NPM
If everything looks good, publish to NPM:

```bash
# Login to NPM if not already logged in
npm login

# Publish the package
npm publish
```

## After Publication
After successful publication:

1. Create a Git tag: `git tag -a v2.0.0 -m "Version 2.0.0 - STDIO only"`
2. Push the tag: `git push origin v2.0.0`
3. Create a release on GitHub with notes from CHANGELOG.md

## Troubleshooting
If you encounter any issues during publishing:

- Verify you have the correct npm permissions
- Check that all required files are included in the `files` array in package.json
- Ensure all dependencies are correctly listed