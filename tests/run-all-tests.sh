#!/bin/bash

# ===========================================
# LAUGH LAB V2 - TEST RUNNER
# ===========================================
# Runs all security and validation tests

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-https://laughlab-v2.vercel.app/api/analyze}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Test results
TOTAL_SUITES=0
PASSED_SUITES=0
FAILED_SUITES=0

echo "================================================"
echo "LAUGH LAB V2 - COMPREHENSIVE TEST SUITE"
echo "================================================"
echo "API URL: $API_URL"
echo "Started: $(date)"
echo ""

# ===========================================
# RUN INPUT VALIDATION TESTS
# ===========================================
echo -e "${BLUE}Running Input Validation Tests...${NC}"
echo "================================================"
TOTAL_SUITES=$((TOTAL_SUITES + 1))

if bash "$SCRIPT_DIR/test-input-validation.sh"; then
    echo -e "${GREEN}✓ Input Validation Tests PASSED${NC}"
    PASSED_SUITES=$((PASSED_SUITES + 1))
else
    echo -e "${RED}✗ Input Validation Tests FAILED${NC}"
    FAILED_SUITES=$((FAILED_SUITES + 1))
fi

echo ""
echo "Waiting 5 seconds before next test suite..."
sleep 5
echo ""

# ===========================================
# RUN RATE LIMITING TESTS
# ===========================================
echo -e "${BLUE}Running Rate Limiting Tests...${NC}"
echo "================================================"
TOTAL_SUITES=$((TOTAL_SUITES + 1))

if bash "$SCRIPT_DIR/test-rate-limit.sh"; then
    echo -e "${GREEN}✓ Rate Limiting Tests PASSED${NC}"
    PASSED_SUITES=$((PASSED_SUITES + 1))
else
    echo -e "${RED}✗ Rate Limiting Tests FAILED${NC}"
    FAILED_SUITES=$((FAILED_SUITES + 1))
fi

echo ""

# ===========================================
# FINAL SUMMARY
# ===========================================
echo "================================================"
echo "FINAL TEST SUMMARY"
echo "================================================"
echo "Total Test Suites: $TOTAL_SUITES"
echo -e "Suites Passed: ${GREEN}$PASSED_SUITES${NC}"
echo -e "Suites Failed: ${RED}$FAILED_SUITES${NC}"
echo "Completed: $(date)"
echo ""

# Generate combined report
COMBINED_REPORT="test-results-combined.txt"
{
    echo "LAUGH LAB V2 - COMBINED TEST RESULTS"
    echo "====================================="
    echo "Date: $(date)"
    echo "API URL: $API_URL"
    echo ""
    echo "Test Suites Run: $TOTAL_SUITES"
    echo "Suites Passed: $PASSED_SUITES"
    echo "Suites Failed: $FAILED_SUITES"
    echo ""
    
    if [ $FAILED_SUITES -eq 0 ]; then
        echo "Overall Status: ALL TESTS PASSED ✓"
    else
        echo "Overall Status: SOME TESTS FAILED ✗"
    fi
    
    echo ""
    echo "Individual Test Results:"
    echo "------------------------"
    echo ""
    
    if [ -f "test-results-input-validation.txt" ]; then
        echo "INPUT VALIDATION TESTS:"
        cat "test-results-input-validation.txt"
        echo ""
    fi
    
    if [ -f "test-results-rate-limit.txt" ]; then
        echo "RATE LIMITING TESTS:"
        cat "test-results-rate-limit.txt"
        echo ""
    fi
} > "$COMBINED_REPORT"

echo "Combined report saved to: $COMBINED_REPORT"
echo ""

# Show quick access to results
echo "Individual test results:"
echo "  - Input Validation: test-results-input-validation.txt"
echo "  - Rate Limiting: test-results-rate-limit.txt"
echo "  - Combined: $COMBINED_REPORT"
echo ""

# Exit with appropriate code
if [ $FAILED_SUITES -eq 0 ]; then
    echo -e "${GREEN}✓ ALL TEST SUITES PASSED${NC}"
    exit 0
else
    echo -e "${RED}✗ SOME TEST SUITES FAILED${NC}"
    exit 1
fi
