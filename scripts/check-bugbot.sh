#!/bin/bash

# Cursor Bugbot Installation Checker
# This script verifies that Cursor Bugbot is properly set up in your GitHub repository

set -e

echo "🔍 Checking Cursor Bugbot Setup..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if gh CLI is installed
echo "1️⃣  Checking GitHub CLI..."
if command -v gh &> /dev/null; then
    echo -e "${GREEN}✅ GitHub CLI is installed${NC}"
    gh --version
else
    echo -e "${RED}❌ GitHub CLI not found${NC}"
    echo ""
    echo "Install with: brew install gh"
    echo "Then run: gh auth login"
    exit 1
fi

echo ""

# Check if authenticated with GitHub
echo "2️⃣  Checking GitHub authentication..."
if gh auth status &> /dev/null; then
    echo -e "${GREEN}✅ Authenticated with GitHub${NC}"
    gh auth status 2>&1 | head -2
else
    echo -e "${RED}❌ Not authenticated with GitHub${NC}"
    echo ""
    echo "Run: gh auth login"
    exit 1
fi

echo ""

# Get repository info
echo "3️⃣  Detecting repository..."
if git remote get-url origin &> /dev/null; then
    REPO_URL=$(git remote get-url origin)
    # Extract owner/repo from URL
    REPO=$(echo $REPO_URL | sed -E 's|.*github\.com[:/]||' | sed 's|\.git$||')
    echo -e "${GREEN}✅ Repository detected: ${REPO}${NC}"
else
    echo -e "${RED}❌ Not a git repository or no origin remote${NC}"
    exit 1
fi

echo ""

# Check for GitHub App installations
echo "4️⃣  Checking for Cursor Bugbot GitHub App..."
INSTALLATION=$(gh api "/repos/${REPO}/installation" 2>&1 || echo "not_found")

if [[ $INSTALLATION == *"not_found"* ]] || [[ $INSTALLATION == *"404"* ]]; then
    echo -e "${RED}❌ Cursor Bugbot not installed on this repository${NC}"
    echo ""
    echo "To install:"
    echo "1. Visit: https://github.com/apps/cursor-bugbot"
    echo "2. Click 'Install'"
    echo "3. Select this repository: ${REPO}"
    echo ""
else
    echo -e "${GREEN}✅ GitHub App installed on repository${NC}"
fi

echo ""

# Check for Bugbot configuration file
echo "5️⃣  Checking for Bugbot configuration..."
if [ -f ".cursor/bugbot.json" ]; then
    echo -e "${GREEN}✅ Bugbot configuration found: .cursor/bugbot.json${NC}"
else
    echo -e "${YELLOW}⚠️  No Bugbot configuration file${NC}"
    echo "Optional: Create .cursor/bugbot.json to customize Bugbot behavior"
fi

echo ""

# Check for Cursor rules
echo "6️⃣  Checking for Cursor rules..."
if [ -d ".cursor/rules" ]; then
    RULE_COUNT=$(find .cursor/rules -name "*.mdc" | wc -l)
    echo -e "${GREEN}✅ Found ${RULE_COUNT} Cursor rule files${NC}"
else
    echo -e "${YELLOW}⚠️  No .cursor/rules directory${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Summary
echo "📊 Setup Summary:"
echo ""

if [[ $INSTALLATION != *"not_found"* ]] && [[ $INSTALLATION != *"404"* ]]; then
    echo -e "${GREEN}✅ Cursor Bugbot is installed and ready!${NC}"
    echo ""
    echo "🎯 Next Steps:"
    echo "1. Visit: https://cursor.com/dashboard"
    echo "2. Go to the 'Bugbot' tab"
    echo "3. Enable Bugbot for repository: ${REPO}"
    echo ""
    echo "🧪 Test Bugbot:"
    echo "1. Create a pull request"
    echo "2. Bugbot will automatically review it"
    echo "3. Or manually trigger with: 'cursor review'"
else
    echo -e "${RED}❌ Cursor Bugbot is NOT installed${NC}"
    echo ""
    echo "📝 Installation Steps:"
    echo "1. Visit: https://github.com/apps/cursor-bugbot"
    echo "2. Click 'Install' button"
    echo "3. Select repository: ${REPO}"
    echo "4. Click 'Install & Authorize'"
    echo "5. Visit: https://cursor.com/dashboard"
    echo "6. Enable Bugbot for the repository"
fi

echo ""
echo "📚 Documentation: docs/CURSOR_BUGBOT_SETUP.md"
echo ""

