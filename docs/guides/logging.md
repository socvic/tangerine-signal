# Logging Guidelines

## Frontend Logging

- Use console.error for errors only
- Avoid logging sensitive data
- Remove debug logs before merging
- Consider using a logging service in production

## Contract Logging

- Use print events for important state changes
- Keep event data minimal
- Include relevant identifiers in events
