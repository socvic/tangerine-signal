# Testing Guide

## Running Tests

```bash
npm test
```

## Writing Tests

Tests are written using Vitest and @hirosystems/clarinet-sdk.

### Example Test

```typescript
import { describe, it, expect } from "vitest";

describe("micro-polls", () => {
  it("should create a poll", async () => {
    // Test implementation
  });
});
```

## Test Organization

- Unit tests in `tests/` directory
- Test files follow `*.test.ts` naming convention
