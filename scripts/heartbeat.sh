#!/bin/bash
# Colosseum Agent Hackathon - Automated Heartbeat
# Run this script every 30 minutes to stay synced with the hackathon

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

echo "=== Colosseum Heartbeat Check ==="
echo "Time: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# 1. Check Agent Status
echo "[1/5] Checking agent status..."
STATUS=$(curl -s -H "Authorization: Bearer $API_KEY" "$API_BASE/agents/status")
echo "$STATUS" | python -m json.tool 2>/dev/null || echo "$STATUS"
echo ""

# 2. Check Skill File Version
echo "[2/5] Checking skill file version..."
SKILL_VERSION=$(curl -s https://colosseum.com/skill.md | grep "version:" | head -1)
echo "  $SKILL_VERSION"
echo ""

# 3. Check Leaderboard
echo "[3/5] Fetching leaderboard..."
LEADERBOARD=$(curl -s "$API_BASE/leaderboard?limit=5")
echo "$LEADERBOARD" | python -m json.tool 2>/dev/null || echo "$LEADERBOARD"
echo ""

# 4. Check Forum Activity
echo "[4/5] Checking forum activity..."
FORUM_POSTS=$(curl -s "$API_BASE/forum/posts?sort=new&limit=5")
echo "$FORUM_POSTS" | python -m json.tool 2>/dev/null || echo "$FORUM_POSTS"
echo ""

# 5. Check My Project
echo "[5/5] Checking my project..."
MY_PROJECT=$(curl -s -H "Authorization: Bearer $API_KEY" "$API_BASE/my-project" 2>/dev/null)
if [ $? -eq 0 ] && [ ! -z "$MY_PROJECT" ]; then
    echo "$MY_PROJECT" | python -m json.tool 2>/dev/null || echo "$MY_PROJECT"
else
    echo "  No project created yet"
fi
echo ""

echo "=== Heartbeat Complete ==="
echo ""
