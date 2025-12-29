#!/bin/bash

# ===========================================
# LAUGH LAB V2 - INPUT VALIDATION TESTS
# ===========================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-https://laughlab-v2.vercel.app/api/analyze}"
RESULTS_FILE="test-results-input-validation.txt"

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to make API request
make_request() {
    local script="$1"
    local format="${2:-auto}"
    local title="${3:-Test Script}"
    
    curl -s -w "\n%{http_code}" -X POST "$API_URL" \
        -H "Content-Type: application/json" \
        -d "{\"script\":\"$script\",\"format\":\"$format\",\"title\":\"$title\"}"
}

# Helper function to make raw request (for malformed JSON tests)
make_raw_request() {
    local body="$1"
    
    curl -s -w "\n%{http_code}" -X POST "$API_URL" \
        -H "Content-Type: application/json" \
        -d "$body"
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

# Helper function to check error message
check_error_message() {
    local response="$1"
    local expected_keyword="$2"
    local test_name="$3"
    
    TESTS_RUN=$((TESTS_RUN + 1))
    
    if echo "$response" | grep -qi "$expected_keyword"; then
        echo -e "${GREEN}✓ PASS${NC}: $test_name (contains '$expected_keyword')"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC}: $test_name (should contain '$expected_keyword')"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# Generate script of specific length
generate_script() {
    local length=$1
    local base="INT. COFFEE SHOP - DAY\n\nJERRY\nSo what's the deal with airline food?\n\nGEORGE\nI know, right?\n"
    local current_length=${#base}
    
    while [ $current_length -lt $length ]; do
        base="${base}X"
        current_length=${#base}
    done
    
    echo "${base:0:$length}"
}

# Start testing
echo "================================================"
echo "LAUGH LAB V2 - INPUT VALIDATION TESTS"
echo "================================================"
echo "API URL: $API_URL"
echo "Started: $(date)"
echo ""

# ===========================================
# TEST 2.1: Minimum Length Validation
# ===========================================
echo "Test 2.1: Minimum Length Validation (100 characters)"
echo "---------------------------------------------------"

# Test 2.1a: 50 characters (should fail)
echo "Test 2.1a: 50 characters (should be rejected)"
script_50=$(generate_script 50)
response=$(make_request "$script_50")
status=$(echo "$response" | tail -1)
body=$(echo "$response" | head -n -1)
check_status "400" "$status" "50 char script should be rejected"
check_error_message "$body" "too short" "Error message should mention 'too short'"

# Test 2.1b: 99 characters (should fail)
echo "Test 2.1b: 99 characters (should be rejected)"
script_99=$(generate_script 99)
response=$(make_request "$script_99")
status=$(echo "$response" | tail -1)
body=$(echo "$response" | head -n -1)
check_status "400" "$status" "99 char script should be rejected"
check_error_message "$body" "too short" "Error message should mention 'too short'"

# Test 2.1c: 100 characters (should pass)
echo "Test 2.1c: 100 characters (should be accepted)"
script_100=$(generate_script 100)
response=$(make_request "$script_100")
status=$(echo "$response" | tail -1)
check_status "200" "$status" "100 char script should be accepted"

# Test 2.1d: 101 characters (should pass)
echo "Test 2.1d: 101 characters (should be accepted)"
script_101=$(generate_script 101)
response=$(make_request "$script_101")
status=$(echo "$response" | tail -1)
check_status "200" "$status" "101 char script should be accepted"

echo ""

# ===========================================
# TEST 2.2: Maximum Length Validation
# ===========================================
echo "Test 2.2: Maximum Length Validation (150,000 characters)"
echo "---------------------------------------------------"

# Note: These tests are commented out to avoid long execution times
# Uncomment to run full validation tests

# Test 2.2a: 150,000 characters (should pass)
# echo "Test 2.2a: 150,000 characters (should be accepted)"
# script_150k=$(generate_script 150000)
# response=$(make_request "$script_150k")
# status=$(echo "$response" | tail -1)
# check_status "200" "$status" "150,000 char script should be accepted"

# Test 2.2b: 150,001 characters (should fail)
echo "Test 2.2b: 150,001 characters (should be rejected)"
script_150k_plus=$(generate_script 150001)
response=$(make_request "$script_150k_plus")
status=$(echo "$response" | tail -1)
body=$(echo "$response" | head -n -1)
check_status "400" "$status" "150,001 char script should be rejected"
check_error_message "$body" "too long" "Error message should mention 'too long'"

echo ""

# ===========================================
# TEST 3.1: Format Validation
# ===========================================
echo "Test 3.1: Format Validation"
echo "---------------------------------------------------"

valid_script=$(generate_script 100)

# Valid formats
for format in "sitcom" "feature" "sketch" "standup" "auto"; do
    echo "Testing format: $format"
    response=$(make_request "$valid_script" "$format")
    status=$(echo "$response" | tail -1)
    check_status "200" "$status" "Format '$format' should be accepted"
done

# Invalid format (should default to auto)
echo "Testing invalid format"
response=$(make_request "$valid_script" "invalid_format")
status=$(echo "$response" | tail -1)
check_status "200" "$status" "Invalid format should default to 'auto'"

echo ""

# ===========================================
# TEST 3.2: Title Validation
# ===========================================
echo "Test 3.2: Title Validation (max 200 characters)"
echo "---------------------------------------------------"

valid_script=$(generate_script 100)

# Short title (should be preserved)
echo "Testing short title (50 chars)"
short_title=$(printf 'A%.0s' {1..50})
response=$(make_request "$valid_script" "auto" "$short_title")
status=$(echo "$response" | tail -1)
check_status "200" "$status" "Short title should be accepted"

# 200 char title (should be preserved)
echo "Testing 200 char title"
title_200=$(printf 'A%.0s' {1..200})
response=$(make_request "$valid_script" "auto" "$title_200")
status=$(echo "$response" | tail -1)
check_status "200" "$status" "200 char title should be accepted"

# 201 char title (should be truncated)
echo "Testing 201 char title (should be truncated)"
title_201=$(printf 'A%.0s' {1..201})
response=$(make_request "$valid_script" "auto" "$title_201")
status=$(echo "$response" | tail -1)
check_status "200" "$status" "201 char title should be accepted (truncated)"

echo ""

# ===========================================
# TEST 4.1: Malformed JSON
# ===========================================
echo "Test 4.1: Malformed JSON"
echo "---------------------------------------------------"

# Invalid JSON
echo "Testing invalid JSON"
response=$(make_raw_request "{invalid json}")
status=$(echo "$response" | tail -1)
body=$(echo "$response" | head -n -1)
check_status "400" "$status" "Invalid JSON should be rejected"
check_error_message "$body" "invalid" "Error message should mention 'invalid'"

# Empty body
echo "Testing empty body"
response=$(make_raw_request "")
status=$(echo "$response" | tail -1)
check_status "400" "$status" "Empty body should be rejected"

echo ""

# ===========================================
# TEST 4.2: Missing Required Fields
# ===========================================
echo "Test 4.2: Missing Required Fields"
echo "---------------------------------------------------"

# Missing script field
echo "Testing missing script field"
response=$(make_raw_request '{"format":"sitcom"}')
status=$(echo "$response" | tail -1)
body=$(echo "$response" | head -n -1)
check_status "400" "$status" "Missing script field should be rejected"
check_error_message "$body" "required" "Error message should mention 'required'"

# Null script
echo "Testing null script"
response=$(make_raw_request '{"script":null}')
status=$(echo "$response" | tail -1)
body=$(echo "$response" | head -n -1)
check_status "400" "$status" "Null script should be rejected"

# Non-string script
echo "Testing non-string script (number)"
response=$(make_raw_request '{"script":123}')
status=$(echo "$response" | tail -1)
body=$(echo "$response" | head -n -1)
check_status "400" "$status" "Non-string script should be rejected"

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
    echo "INPUT VALIDATION TEST RESULTS"
    echo "=============================="
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
