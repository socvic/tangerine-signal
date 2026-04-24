# Smart Contract Best Practices

## Security

- Always validate inputs in public functions
- Use `asserts!` for precondition checks
- Limit list sizes to prevent denial of service
- Follow the principle of least privilege

## Performance

- Minimize use of `map-insert` and `map-set` in loops
- Use appropriate data types (uint vs int)
- Avoid deep nesting of functions

## Readability

- Use descriptive variable names
- Add comments for complex logic
- Follow Clarity naming conventions
