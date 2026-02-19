# WireMock Mappings

This feature provides a web interface for managing WireMock-style API mocks with advanced delay and fault simulation capabilities.

## Features

- **Request Matching**: Define HTTP method, URL patterns, headers, and request body matching
- **Response Configuration**: Set status codes, response bodies, and headers
- **Delay Simulation**: 
  - Fixed delays (e.g., always 500ms)
  - Log-normal distribution (realistic latency with long tails)
  - Uniform distribution (random delay within a range)
- **Fault Simulation**: Simulate network failures and error conditions
- **Priority Management**: Control mapping precedence when multiple patterns match

## Delay Types

### Fixed Delay
A consistent delay applied to every request:
```json
{
  "fixedDelayMilliseconds": 1000
}
```

### Log-Normal Distribution
Simulates realistic latency with a long tail distribution:
```json
{
  "delayDistribution": {
    "type": "lognormal",
    "median": 100,
    "sigma": 0.2,
    "maxValue": 1000
  }
}
```
- **median**: The 50th percentile of latencies (ms)
- **sigma**: Standard deviation (larger = longer tail)
- **maxValue** (optional): Cap to prevent excessive delays

### Uniform Distribution
Random delay within a fixed range:
```json
{
  "delayDistribution": {
    "type": "uniform",
    "lower": 50,
    "upper": 150
  }
}
```
- **lower**: Minimum delay (ms)
- **upper**: Maximum delay (ms)

## Fault Types

Simulate various network failures:

- **EMPTY_RESPONSE**: Return completely empty response
- **MALFORMED_RESPONSE_CHUNK**: Send OK status, then garbage, then close
- **RANDOM_DATA_THEN_CLOSE**: Send garbage then close connection
- **CONNECTION_RESET_BY_PEER**: Close connection with SO_LINGER=0

## Usage

### Creating a Mapping

1. Navigate to `/wiremock`
2. Click "New Mapping"
3. Configure request matching (method, URL)
4. Set response (status, body)
5. Configure delay/fault simulation
6. Save

### API Example

```typescript
import { createMapping } from '@/lib/wiremock'

await createMapping({
  name: 'Slow API',
  request: {
    method: 'GET',
    url: '/api/users'
  },
  response: {
    status: 200,
    body: JSON.stringify({ users: [] }),
    delayDistribution: {
      type: 'lognormal',
      median: 100,
      sigma: 0.3
    }
  }
})
```

## Testing

Run the test suite:
```bash
pnpm test -- wiremock
```

Test coverage includes:
- API client functions (15 tests)
- API route handlers (9 tests)
- UI components (13 tests)

## Architecture

- **Types**: `/types/wiremock.ts` - TypeScript definitions
- **API Client**: `/lib/wiremock.ts` - HTTP client functions
- **API Routes**: `/app/api/wiremock/mappings/` - Next.js API routes
- **Components**: `/app/wiremock/_components/` - React components
- **Page**: `/app/wiremock/page.tsx` - Main UI

## References

- [WireMock Documentation](https://wiremock.org/docs/)
- [Request Matching](https://wiremock.org/docs/request-matching/)
- [Simulating Faults](https://wiremock.org/docs/simulating-faults/)
