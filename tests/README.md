# LaughLab V2 Test Suite

Automated tests for security features including rate limiting and input validation.

## Quick Start

Run all tests:
```bash
cd tests
./run-all-tests.sh
```

Run individual test suites:
```bash
# Input validation tests
./test-input-validation.sh

# Rate limiting tests
./test-rate-limit.sh
```

## Configuration

Set custom API URL:
```bash
export API_URL="https://your-custom-url.vercel.app/api/analyze"
./run-all-tests.sh
```

## Test Suites

### 1. Input Validation Tests (`test-input-validation.sh`)

Tests script length validation, format validation, title sanitization, and malformed request handling.

**Duration**: ~30 seconds  
**Tests**: 20+ individual tests

**What it tests**:
- Minimum script length (100 chars)
- Maximum script length (150,000 chars)
- Format parameter validation
- Title length limits (200 chars)
- Malformed JSON rejection
- Missing required fields

### 2. Rate Limiting Tests (`test-rate-limit.sh`)

Tests per-minute rate limiting (5 req/min) and rate limit reset behavior.

**Duration**: ~2 minutes (includes 60s wait for reset)  
**Tests**: 10+ individual tests

**What it tests**:
- Per-minute rate limit (5 requests/minute)
- Rate limit enforcement (6th request blocked)
- Error messages and retry-after headers
- Rate limit reset after 60 seconds
- Burst protection

**Note**: This test will temporarily rate limit your IP. Wait 60 seconds before running again.

## Test Results

Results are saved to individual files:
- `test-results-input-validation.txt` - Input validation results
- `test-results-rate-limit.txt` - Rate limiting results
- `test-results-combined.txt` - Combined summary (when using run-all-tests.sh)

## Exit Codes

- `0` - All tests passed
- `1` - Some tests failed

## Requirements

- `bash` 4.0+
- `curl` command
- Internet connection
- Access to the LaughLab V2 API

## Troubleshooting

### "Too many requests" error when starting tests

Wait 60 seconds for your IP's rate limit to reset.

### Tests timing out

Check your internet connection and verify the API URL is correct.

### All tests failing with 500 errors

The API may be down or misconfigured. Check:
1. Vercel deployment status
2. ANTHROPIC_API_KEY environment variable
3. API logs in Vercel dashboard

## CI/CD Integration

### GitHub Actions

```yaml
name: Security Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run security tests
        run: |
          cd tests
          ./run-all-tests.sh
```

### Manual Verification

For production deployments, run tests manually:

```bash
# Test production
export API_URL="https://laughlab-v2.vercel.app/api/analyze"
./run-all-tests.sh

# Test staging
export API_URL="https://laughlab-v2-staging.vercel.app/api/analyze"
./run-all-tests.sh
```

## Adding New Tests

1. Create a new test script: `test-your-feature.sh`
2. Make it executable: `chmod +x test-your-feature.sh`
3. Add it to `run-all-tests.sh`
4. Update this README

## Test Coverage

Current coverage:
- ✅ Rate limiting (per-minute)
- ✅ Input validation (length)
- ✅ Format validation
- ✅ Title sanitization
- ✅ Malformed JSON handling
- ✅ Missing field validation
- ⏳ Daily rate limiting (requires 24h test)
- ⏳ Usage tracking (requires authentication)
- ⏳ Tier-based limits (requires authentication)

## Support

For issues or questions:
- Check the main [TEST_PLAN.md](../TEST_PLAN.md) for detailed test specifications
- Review test output files for specific failure details
- Check API logs in Vercel dashboard
