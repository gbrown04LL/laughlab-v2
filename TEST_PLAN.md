# LaughLab V2 Security Testing Plan

**Version**: 1.0  
**Date**: December 28, 2025  
**Purpose**: Verify rate limiting and input validation security features

---

## Test Environment

- **Production URL**: `https://laughlab-v2.vercel.app`
- **API Endpoint**: `https://laughlab-v2.vercel.app/api/analyze`
- **Method**: POST
- **Content-Type**: application/json

---

## Test Categories

### 1. Rate Limiting Tests

#### Test 1.1: Per-Minute Rate Limit (5 requests/minute)

**Objective**: Verify that the API blocks requests after 5 requests within 1 minute

**Test Steps**:
1. Send 5 valid requests in quick succession (< 10 seconds apart)
2. Send a 6th request immediately after
3. Verify the 6th request returns HTTP 429 (Too Many Requests)
4. Check response includes `Retry-After` header
5. Wait for the retry period and verify next request succeeds

**Expected Results**:
- Requests 1-5: HTTP 200 (success)
- Request 6: HTTP 429 with error message "Too many requests. Please wait X seconds."
- Response includes `Retry-After` header with seconds to wait
- Request after waiting: HTTP 200 (success)

**Pass Criteria**: 
- ✅ 6th request blocked with 429
- ✅ Retry-After header present
- ✅ Request succeeds after waiting

---

#### Test 1.2: Daily Rate Limit (20 requests/day for free tier)

**Objective**: Verify daily limit enforcement

**Test Steps**:
1. Send 20 valid requests throughout the day (spaced to avoid per-minute limit)
2. Send a 21st request
3. Verify the 21st request returns HTTP 403 (Forbidden)
4. Check error message mentions daily limit

**Expected Results**:
- Requests 1-20: HTTP 200 (success)
- Request 21: HTTP 403 with error "Daily limit reached. Please try again tomorrow or upgrade your plan."

**Pass Criteria**:
- ✅ 21st request blocked with 403
- ✅ Error message mentions daily limit

---

#### Test 1.3: Rate Limit Reset After 1 Minute

**Objective**: Verify rate limit window resets correctly

**Test Steps**:
1. Send 5 requests to hit the per-minute limit
2. Wait exactly 60 seconds
3. Send another request
4. Verify request succeeds

**Expected Results**:
- Request after 60 seconds: HTTP 200 (success)

**Pass Criteria**:
- ✅ Rate limit resets after 60 seconds
- ✅ New request succeeds

---

#### Test 1.4: Different IPs Have Independent Limits

**Objective**: Verify rate limits are per-IP, not global

**Test Steps**:
1. From IP A: Send 5 requests to hit limit
2. From IP B: Send 1 request immediately
3. Verify IP B's request succeeds

**Expected Results**:
- IP A request 6: HTTP 429 (blocked)
- IP B request 1: HTTP 200 (success)

**Pass Criteria**:
- ✅ IP B not affected by IP A's rate limit

---

### 2. Script Length Validation Tests

#### Test 2.1: Minimum Length Validation (100 characters)

**Objective**: Verify scripts shorter than 100 characters are rejected

**Test Cases**:

| Test | Script Length | Expected Result | Error Message |
|------|---------------|-----------------|---------------|
| 2.1a | 50 chars | HTTP 400 | "Script is too short. Please provide at least a few scenes of dialogue." |
| 2.1b | 99 chars | HTTP 400 | Same as above |
| 2.1c | 100 chars | HTTP 200 | Success |
| 2.1d | 101 chars | HTTP 200 | Success |

**Pass Criteria**:
- ✅ Scripts < 100 chars rejected with 400
- ✅ Scripts ≥ 100 chars accepted
- ✅ Correct error message returned

---

#### Test 2.2: Maximum Length Validation (150,000 characters)

**Objective**: Verify scripts longer than 150,000 characters are rejected

**Test Cases**:

| Test | Script Length | Expected Result | Error Message |
|------|---------------|-----------------|---------------|
| 2.2a | 150,000 chars | HTTP 200 | Success |
| 2.2b | 150,001 chars | HTTP 400 | "Script is too long. Please limit to about 120 pages." |
| 2.2c | 200,000 chars | HTTP 400 | Same as above |

**Pass Criteria**:
- ✅ Scripts ≤ 150,000 chars accepted
- ✅ Scripts > 150,000 chars rejected with 400
- ✅ Correct error message returned

---

#### Test 2.3: Edge Cases

**Objective**: Test boundary conditions and special characters

**Test Cases**:

| Test | Input | Expected Result |
|------|-------|-----------------|
| 2.3a | Exactly 100 chars | HTTP 200 |
| 2.3b | Exactly 150,000 chars | HTTP 200 |
| 2.3c | Empty string | HTTP 400 |
| 2.3d | Null/undefined | HTTP 400 |
| 2.3e | Special chars (emoji, unicode) | HTTP 200 (if within length) |
| 2.3f | Very long single line | HTTP 200 (if within length) |

**Pass Criteria**:
- ✅ All boundary conditions handled correctly
- ✅ Invalid inputs rejected with appropriate errors

---

### 3. Input Validation Tests

#### Test 3.1: Format Validation

**Objective**: Verify format parameter validation

**Test Cases**:

| Test | Format Value | Expected Result |
|------|--------------|-----------------|
| 3.1a | "sitcom" | HTTP 200 (valid) |
| 3.1b | "feature" | HTTP 200 (valid) |
| 3.1c | "sketch" | HTTP 200 (valid) |
| 3.1d | "standup" | HTTP 200 (valid) |
| 3.1e | "auto" | HTTP 200 (valid) |
| 3.1f | "invalid" | HTTP 200 (defaults to "auto") |
| 3.1g | null | HTTP 200 (defaults to "auto") |
| 3.1h | 123 (number) | HTTP 200 (defaults to "auto") |

**Pass Criteria**:
- ✅ Valid formats accepted
- ✅ Invalid formats default to "auto"
- ✅ No server errors for invalid formats

---

#### Test 3.2: Title Validation

**Objective**: Verify title sanitization (max 200 chars)

**Test Cases**:

| Test | Title Length | Expected Result |
|------|--------------|-----------------|
| 3.2a | 50 chars | HTTP 200, title preserved |
| 3.2b | 200 chars | HTTP 200, title preserved |
| 3.2c | 201 chars | HTTP 200, title truncated to 200 |
| 3.2d | 500 chars | HTTP 200, title truncated to 200 |
| 3.2e | Empty string | HTTP 200, defaults to "Untitled Script" |
| 3.2f | null | HTTP 200, defaults to "Untitled Script" |

**Pass Criteria**:
- ✅ Titles ≤ 200 chars preserved
- ✅ Titles > 200 chars truncated
- ✅ Missing titles default to "Untitled Script"

---

#### Test 3.3: Tier Validation

**Objective**: Verify tier parameter validation

**Test Cases**:

| Test | Tier Value | Expected Result |
|------|------------|-----------------|
| 3.3a | "free" | HTTP 200 (valid) |
| 3.3b | "starter" | HTTP 200 (valid) |
| 3.3c | "professional" | HTTP 200 (valid) |
| 3.3d | "enterprise" | HTTP 200 (valid) |
| 3.3e | "invalid" | HTTP 200 (defaults to "free") |
| 3.3f | null | HTTP 200 (defaults to "free") |

**Pass Criteria**:
- ✅ Valid tiers accepted
- ✅ Invalid tiers default to "free"
- ✅ No server errors for invalid tiers

---

### 4. Malformed Request Tests

#### Test 4.1: Invalid JSON

**Objective**: Verify malformed JSON is rejected

**Test Cases**:

| Test | Request Body | Expected Result |
|------|--------------|-----------------|
| 4.1a | `{invalid json}` | HTTP 400 "Invalid JSON in request body" |
| 4.1b | Empty body | HTTP 400 |
| 4.1c | Plain text | HTTP 400 |

**Pass Criteria**:
- ✅ Malformed JSON rejected with 400
- ✅ Appropriate error message returned

---

#### Test 4.2: Missing Required Fields

**Objective**: Verify missing script field is rejected

**Test Cases**:

| Test | Request Body | Expected Result |
|------|--------------|-----------------|
| 4.2a | `{}` | HTTP 400 "Script text is required" |
| 4.2b | `{"format": "sitcom"}` | HTTP 400 "Script text is required" |
| 4.2c | `{"script": null}` | HTTP 400 "Script text is required" |
| 4.2d | `{"script": 123}` | HTTP 400 "Script text is required" |

**Pass Criteria**:
- ✅ Missing script field rejected with 400
- ✅ Non-string script values rejected

---

### 5. Usage Tracking Tests

#### Test 5.1: Free Tier Monthly Limit (2 analyses/month)

**Objective**: Verify free tier users are limited to 2 analyses per month

**Test Steps**:
1. As a free tier user, send 2 valid requests
2. Send a 3rd request
3. Verify 3rd request returns HTTP 403
4. Check error message mentions monthly limit

**Expected Results**:
- Requests 1-2: HTTP 200 with usage headers
- Request 3: HTTP 403 "You've used all 2 free analyses this month. Upgrade to continue."

**Pass Criteria**:
- ✅ 3rd request blocked with 403
- ✅ Usage headers show remaining count
- ✅ Error message mentions upgrade

---

#### Test 5.2: Usage Headers

**Objective**: Verify usage tracking headers are returned

**Test Steps**:
1. Send a valid request
2. Check response headers for usage information

**Expected Headers**:
- `X-Usage-Remaining`: Number of analyses remaining
- `X-Usage-Limit`: Total monthly limit for tier

**Pass Criteria**:
- ✅ Usage headers present in response
- ✅ Values are accurate

---

### 6. Security Tests

#### Test 6.1: XSS Prevention

**Objective**: Verify script content is sanitized

**Test Cases**:

| Test | Script Content | Expected Result |
|------|----------------|-----------------|
| 6.1a | `<script>alert('xss')</script>` | HTTP 200, content sanitized |
| 6.1b | `<img src=x onerror=alert(1)>` | HTTP 200, content sanitized |

**Pass Criteria**:
- ✅ Malicious scripts don't execute
- ✅ Content is properly escaped

---

#### Test 6.2: Injection Prevention

**Objective**: Verify SQL/NoSQL injection attempts are blocked

**Test Cases**:

| Test | Script Content | Expected Result |
|------|----------------|-----------------|
| 6.2a | `'; DROP TABLE users; --` | HTTP 200, treated as text |
| 6.2b | `{"$ne": null}` | HTTP 200, treated as text |

**Pass Criteria**:
- ✅ Injection attempts don't affect database
- ✅ Content treated as plain text

---

## Test Execution Plan

### Phase 1: Automated Tests (30 minutes)
1. Run rate limiting tests (Tests 1.1-1.4)
2. Run input validation tests (Tests 2.1-3.3)
3. Run malformed request tests (Tests 4.1-4.2)

### Phase 2: Manual Tests (15 minutes)
1. Test usage tracking (Tests 5.1-5.2)
2. Test security features (Tests 6.1-6.2)

### Phase 3: Results Documentation (15 minutes)
1. Compile test results
2. Document any failures
3. Create bug reports if needed

---

## Test Data

### Valid Script Samples

**Minimum Valid Script (100 chars)**:
```
INT. COFFEE SHOP - DAY

JERRY
So what's the deal with airline food?

GEORGE
I know, right?
```

**Maximum Valid Script (150,000 chars)**:
- Generate using script generator tool

**Over-Limit Script (150,001 chars)**:
- Append one character to maximum valid script

---

## Success Criteria

### Must Pass (Critical)
- ✅ Rate limiting enforces 5 req/min limit
- ✅ Rate limiting enforces 20 req/day limit
- ✅ Scripts < 100 chars rejected
- ✅ Scripts > 150,000 chars rejected
- ✅ Malformed JSON rejected
- ✅ Missing script field rejected

### Should Pass (Important)
- ✅ Rate limit resets after 60 seconds
- ✅ Different IPs have independent limits
- ✅ Usage headers returned correctly
- ✅ Invalid formats default gracefully

### Nice to Have (Optional)
- ✅ XSS prevention working
- ✅ Injection prevention working
- ✅ Edge cases handled gracefully

---

## Test Automation Scripts

See `tests/` directory for:
- `test-rate-limit.sh` - Rate limiting tests
- `test-input-validation.sh` - Input validation tests
- `test-security.sh` - Security tests
- `run-all-tests.sh` - Execute all tests

---

## Reporting

Test results will be documented in:
- `TEST_RESULTS.md` - Detailed test results
- `BUG_REPORTS.md` - Any issues found
- GitHub Issues - Critical bugs

---

## Notes

- Tests should be run against production after deployment
- Some tests (daily limit) may require waiting 24 hours
- Rate limit tests may temporarily block your IP
- Use VPN or multiple IPs for comprehensive testing
