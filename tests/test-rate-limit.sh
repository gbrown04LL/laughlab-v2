#!/bin/bash

# ===========================================
# LAUGH LAB V2 - RATE LIMITING TESTS
# ===========================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-https://laughlab-v2.vercel.app/api/analyze}"
RESULTS_FILE="test-results-rate-limit.txt"

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Valid test script (100+ chars)
VALID_SCRIPT='INT. COFFEE SHOP - DAY\n\nJERRY\nSo what'\''s the deal with airline food?\n\nGEORGE\nI know, right? It'\''s terrible!'

# Helper function to make API request
make_request() {
    local script="$1"
    local format="${2:-auto}"
    local title="${3:-Test Script}"
    
    curl -s -w "\n%{http_code}" -X POST "$API_URL" \
        -H "Content-Type: application/json" \
        -d "{\"script\":\"$script\",\"format\":\"$format\",\"title\":\"$title\"}"
}

# Helper function to check HTTP status
check_status() {
    local expected=$1
    local actual=$2
    local test_name=$3
    
    TESTS_RUN=$((TESTS_RUN + 1))
    
    if [ "$actual" == "$expected" ]; then
        echo -e "${GREEN}✓ PASS${NC}: $test_name (HTTP $actual)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC}: $test_name (Expected HTTP $expected, got $actual)"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# Start testing
echo "================================================"
echo "LAUGH LAB V2 - RATE LIMITING TESTS"
echo "================================================"
echo "API URL: $API_URL"
echo "Started: $(date)"
echo ""

# ===========================================
# TEST 1.1: Per-Minute Rate Limit (5 req/min)
# ===========================================
echo "Test 1.1: Per-Minute Rate Limit (5 requests/minute)"
echo "---------------------------------------------------"

# Send 5 requests quickly
for i in {1..5}; do
    echo "Sending request $i/5..."
    response=$(make_request "$VALID_SCRIPT")
    status=$(echo "$response" | tail -1)
    check_status "200" "$status" "Request $i should succeed"
    sleep 1
done

# 6th request should be rate limited
echo "Sending request 6 (should be rate limited)..."
response=$(make_request "$VALID_SCRIPT")
status=$(echo "$response" | tail -1)
body=$(echo "$response" | head -n -1)

check_status "429" "$status" "Request 6 should be rate limited (HTTP 429)"

# Check for retry-after in response
if echo "$body" | grep -q "wait"; then
    echo -e "${GREEN}✓ PASS${NC}: Error message includes wait time"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC}: Error message should include wait time"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
TESTS_RUN=$((TESTS_RUN + 1))

echo ""

# ===========================================
# TEST 1.3: Rate Limit Reset After 1 Minute
# ===========================================
echo "Test 1.3: Rate Limit Reset After 60 Seconds"
echo "---------------------------------------------------"
echo "Waiting 60 seconds for rate limit to reset..."

for i in {60..1}; do
    printf "\rTime remaining: %02d seconds" $i
    sleep 1
done
echo ""

echo "Sending request after reset..."
response=$(make_request "$VALID_SCRIPT")
status=$(echo "$response" | tail -1)
check_status "200" "$status" "Request after 60s should succeed"

echo ""

# ===========================================
# TEST 1.4: Burst Protection
# ===========================================
echo "Test 1.4: Burst Protection (rapid requests)"
echo "---------------------------------------------------"

echo "Sending 6 requests with no delay..."
for i in {1..6}; do
    response=$(make_request "$VALID_SCRIPT")
    status=$(echo "$response" | tail -1)
    
    if [ $i -le 5 ]; then
        check_status "200" "$status" "Burst request $i should succeed"
    else
        check_status "429" "$status" "Burst request $i should be rate limited"
    fi
done

echo ""

# ===========================================
# SUMMARY
# ===========================================
echo "================================================"
echo "TEST SUMMARY"
echo "================================================"
echo "Total Tests Run: $TESTS_RUN"
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo "Completed: $(date)"
echo ""

# Save results
{
    echo "RATE LIMITING TEST RESULTS"
    echo "=========================="
    echo "Date: $(date)"
    echo "API URL: $API_URL"
    echo ""
    echo "Tests Run: $TESTS_RUN"
    echo "Tests Passed: $TESTS_PASSED"
    echo "Tests Failed: $TESTS_FAILED"
    echo ""
    if [ $TESTS_FAILED -eq 0 ]; then
        echo "Status: ALL TESTS PASSED ✓"
    else
        echo "Status: SOME TESTS FAILED ✗"
    fi
} > "$RESULTS_FILE"

echo "Results saved to: $RESULTS_FILE"

# Exit with appropriate code
if [ $TESTS_FAILED -eq 0 ]; then
    exit 0
else
    exit 1
fi
