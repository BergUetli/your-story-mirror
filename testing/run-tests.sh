#!/bin/bash

###############################################################################
# Automated Test Execution Script
# 
# Usage:
#   ./testing/run-tests.sh                    # Run full test suite
#   ./testing/run-tests.sh --group=memory     # Run specific group
#   ./testing/run-tests.sh --test=auth-001    # Run single test
#   ./testing/run-tests.sh --pipeline         # Run full release pipeline
#   ./testing/run-tests.sh --pipeline --auto  # Autonomous mode with commits
###############################################################################

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Change to project root
cd "$(dirname "$0")/.."

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       You, Remembered - Automated Test Runner            ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    echo "Please install Node.js 18+ to run tests"
    exit 1
fi

echo -e "${GREEN}✅ Node.js version:${NC} $(node --version)"
echo ""

# Parse arguments
MODE="test"
GROUP=""
TEST=""
AUTO_MODE=false

for arg in "$@"; do
    case $arg in
        --pipeline)
            MODE="pipeline"
            ;;
        --auto)
            AUTO_MODE=true
            ;;
        --group=*)
            GROUP="${arg#*=}"
            ;;
        --test=*)
            TEST="${arg#*=}"
            ;;
        --help|-h)
            echo "Usage:"
            echo "  ./testing/run-tests.sh                    Run full test suite"
            echo "  ./testing/run-tests.sh --group=memory     Run specific group"
            echo "  ./testing/run-tests.sh --test=auth-001    Run single test"
            echo "  ./testing/run-tests.sh --pipeline         Run release pipeline"
            echo "  ./testing/run-tests.sh --pipeline --auto  Autonomous mode"
            echo ""
            exit 0
            ;;
    esac
done

# Check environment variables
if [ -z "$VITE_SUPABASE_URL" ]; then
    echo -e "${YELLOW}⚠️  VITE_SUPABASE_URL not set${NC}"
    echo "Some API tests may be skipped"
    echo ""
fi

if [ -z "$VITE_SUPABASE_PUBLISHABLE_KEY" ]; then
    echo -e "${YELLOW}⚠️  VITE_SUPABASE_PUBLISHABLE_KEY not set${NC}"
    echo "Some API tests may be skipped"
    echo ""
fi

# Create logs directory if it doesn't exist
mkdir -p testing/logs

# Generate log filename with timestamp
LOG_FILE="testing/logs/test-run-$(date +%Y%m%d-%H%M%S).log"

# Run appropriate command based on mode
if [ "$MODE" = "pipeline" ]; then
    echo -e "${BLUE}🚀 Running Automated Release Pipeline${NC}"
    echo ""
    
    if [ "$AUTO_MODE" = true ]; then
        echo -e "${YELLOW}⚠️  AUTONOMOUS MODE ENABLED${NC}"
        echo "Pipeline will automatically:"
        echo "  - Run tests"
        echo "  - Generate fixes"
        echo "  - Apply fixes"
        echo "  - Commit changes"
        echo "  - Push to remote"
        echo ""
        read -p "Continue? (y/N) " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Cancelled"
            exit 0
        fi
        
        node testing/release-pipeline.js --auto-commit --auto-push 2>&1 | tee "$LOG_FILE"
    else
        echo "Pipeline will run in DRY RUN mode (no commits)"
        echo ""
        node testing/release-pipeline.js 2>&1 | tee "$LOG_FILE"
    fi
    
    EXIT_CODE=$?
else
    echo -e "${BLUE}🧪 Running Test Suite${NC}"
    echo ""
    
    # Build command
    CMD="node testing/test-engine.js"
    
    if [ -n "$GROUP" ]; then
        echo -e "Test Group: ${GREEN}$GROUP${NC}"
        CMD="$CMD --group=$GROUP"
    elif [ -n "$TEST" ]; then
        echo -e "Test ID: ${GREEN}$TEST${NC}"
        CMD="$CMD --test=$TEST"
    else
        echo -e "Mode: ${GREEN}Full Test Suite${NC}"
    fi
    
    echo ""
    
    # Run tests
    $CMD 2>&1 | tee "$LOG_FILE"
    EXIT_CODE=$?
fi

# Print summary
echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"

if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ SUCCESS: All tests passed!${NC}"
else
    echo -e "${RED}❌ FAILURE: Some tests failed${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Review test results: cat testing/test-results.json"
    echo "2. Check bug tracker: cat testing/bug-tracker.json"
    echo "3. Review fixes: cat testing/fix-queue.json"
    echo "4. Run pipeline to auto-fix: ./testing/run-tests.sh --pipeline"
fi

echo ""
echo -e "📄 Full log saved to: ${BLUE}$LOG_FILE${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"

exit $EXIT_CODE
