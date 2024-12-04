#!/bin/bash

# NOTE: This script use jq to parse JSON response. You can install jq with the following command:
# sudo apt-get install jq  # For Debian/Ubuntu
# brew install jq          # For macOS

echo "### Test sign-in with phone number 1234567890"
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "1234567890"}'
echo "\n"

echo "### Complete sign-in phone number 1234567890 (use wildcard passcode)"
RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/complete-signin \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "1234567890", "passcode": "654321"}')
echo $RESPONSE
export TEST_JWT_TOKEN_1234567890=$(echo $RESPONSE | jq -r '.token')
echo "TEST_JWT_TOKEN_1234567890: $TEST_JWT_TOKEN_1234567890"
echo "\n"

echo "### Test sign-in with phone number 9876543210"
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "9876543210"}'
echo "\n"

echo "### Complete sign-in phone number 9876543210 (use wildcard passcode)"
RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/complete-signin \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "9876543210", "passcode": "654321"}')
echo $RESPONSE
export TEST_JWT_TOKEN_9876543210=$(echo $RESPONSE | jq -r '.token')
echo "TEST_JWT_TOKEN_9876543210: $TEST_JWT_TOKEN_9876543210"
echo "\n"
