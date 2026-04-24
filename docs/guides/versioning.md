# Versioning Strategy

## Semantic Versioning

Follow SemVer for all releases:
- MAJOR: Breaking changes
- MINOR: New features (backward compatible)
- PATCH: Bug fixes

## Contract Versioning

Since Clarity contracts are immutable, each deployment is a new version. Use the contract name with version suffix:
- `micro-polls-v1`
- `micro-polls-v2`

## Frontend Versioning

Use the version field in `frontend/package.json`.
