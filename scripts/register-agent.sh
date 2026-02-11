#!/bin/bash
# Register Agent on Colosseum Hackathon
# Run this FIRST before creating project

echo "=== Registering Agent on Colosseum Hackathon ==="
echo ""

# API Configuration
API_BASE="https://agents.colosseum.com/api"
AGENT_NAME="ars-agent"

echo "Agent Name: $AGENT_NAME"
echo "API Base: $API_BASE"
echo ""

# Register agent
echo "Registering agent..."
RESPONSE=$(curl -s -X POST "$API_BASE/agents" \
    -H "Content-Type: application/json" \
    -d "{\"name\": \"$AGENT_NAME\"}")

echo ""
echo "Response:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""

# Check if successful
if echo "$RESPONSE" | grep -q "apiKey"; then
    echo "✅ Agent Registered Successfully!"
    echo ""
    echo "⚠️  IMPORTANT: Save these values immediately!"
    echo ""
    
    # Extract values
    API_KEY=$(echo "$RESPONSE" | jq -r '.apiKey' 2>/dev/null)
    CLAIM_CODE=$(echo "$RESPONSE" | jq -r '.claimCode' 2>/dev/null)
    VERIFICATION_CODE=$(echo "$RESPONSE" | jq -r '.verificationCode' 2>/dev/null)
    CLAIM_URL=$(echo "$RESPONSE" | jq -r '.claimUrl' 2>/dev/null)
    
    echo "1. API Key (add to .env):"
    echo "   COLOSSEUM_API_KEY=$API_KEY"
    echo ""
    echo "2. Claim Code (give to human for prizes):"
    echo "   $CLAIM_CODE"
    echo ""
    echo "3. Verification Code (for tweet verification):"
    echo "   $VERIFICATION_CODE"
    echo ""
    echo "4. Claim URL (for human to claim prizes):"
    echo "   $CLAIM_URL"
    echo ""
    
    # Offer to add to .env
    echo "Would you like to add API key to .env? (y/n)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        if [ -f .env ]; then
            # Check if key already exists
            if grep -q "COLOSSEUM_API_KEY=" .env; then
                echo "Updating existing COLOSSEUM_API_KEY in .env..."
                sed -i "s/COLOSSEUM_API_KEY=.*/COLOSSEUM_API_KEY=$API_KEY/" .env
            else
                echo "Adding COLOSSEUM_API_KEY to .env..."
                echo "" >> .env
                echo "# Colosseum Hackathon" >> .env
                echo "COLOSSEUM_API_KEY=$API_KEY" >> .env
            fi
            echo "✅ API key added to .env"
        else
            echo "Creating .env file..."
            cp .env.example .env
            echo "" >> .env
            echo "# Colosseum Hackathon" >> .env
            echo "COLOSSEUM_API_KEY=$API_KEY" >> .env
            echo "✅ .env created with API key"
        fi
    fi
    
    echo ""
    echo "=== Next Steps ==="
    echo ""
    echo "1. ✅ Agent registered"
    echo "2. 📝 Save claim code and give to human"
    echo "3. 🔑 API key added to .env"
    echo "4. 🚀 Create project:"
    echo "   bash scripts/register-ars-colosseum.sh"
    echo ""
    echo "5. 💰 Human claims prizes at:"
    echo "   $CLAIM_URL"
    echo ""
    
else
    echo "❌ Registration failed. Error:"
    echo "$RESPONSE"
    echo ""
    echo "Common issues:"
    echo "- Agent name already taken (try a different name)"
    echo "- Rate limit exceeded (wait a few minutes)"
    echo "- Network error (check internet connection)"
fi

echo ""

