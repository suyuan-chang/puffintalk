#!/bin/bash

# Ensure the JWT tokens are available
if [ -z "$TEST_JWT_TOKEN_1234567890" ] || [ -z "$TEST_JWT_TOKEN_9876543210" ]; then
  echo "JWT tokens are not set. Please run test_sign_in.sh first."
  exit 1
fi

# Define phone numbers
PHONE_NUMBER_1="1234567890"
PHONE_NUMBER_2="9876543210"
PHONE_NUMBER_3="8888888888"

# Test /api/contacts/request on not registered phone number
echo "### Test /api/contacts/request"
RESPONSE=$(curl -s -X POST http://localhost:3000/api/contacts/request \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEST_JWT_TOKEN_1234567890" \
  -d "{\"phone_number\": \"$PHONE_NUMBER_3\"}")
echo $RESPONSE | jq .
echo $RESPONSE | jq -e '.success == true' > /dev/null || { echo "Request failed"; exit 1; }

# Test /api/contacts/request
echo "### Test /api/contacts/request"
RESPONSE=$(curl -s -X POST http://localhost:3000/api/contacts/request \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEST_JWT_TOKEN_1234567890" \
  -d "{\"phone_number\": \"$PHONE_NUMBER_2\"}")
echo $RESPONSE | jq .
echo $RESPONSE | jq -e '.success == true' > /dev/null || { echo "Request failed"; exit 1; }

# Test /api/contacts for phone number 9876543210 to check if it received friend request from 1234567890
echo "### Test /api/contacts for phone number 9876543210"
RESPONSE=$(curl -s -X GET http://localhost:3000/api/contacts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEST_JWT_TOKEN_9876543210")
echo $RESPONSE | jq .
echo $RESPONSE | jq -e ".contacts | map(select(.phone_number == \"$PHONE_NUMBER_1\")) | length > 0" > /dev/null || { echo "Friend request not received"; exit 1; }

# Test /api/contacts/accept
echo "### Test /api/contacts/accept"
RESPONSE=$(curl -s -X PUT http://localhost:3000/api/contacts/accept \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEST_JWT_TOKEN_9876543210" \
  -d "{\"phone_number\": \"$PHONE_NUMBER_1\"}")
echo $RESPONSE | jq .
echo $RESPONSE | jq -e '.success == true' > /dev/null || { echo "Accept failed"; exit 1; }

# Test /api/contacts/update
echo "### Test /api/contacts/update"
RESPONSE=$(curl -s -X PUT http://localhost:3000/api/contacts/update \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEST_JWT_TOKEN_1234567890" \
  -d "{\"phone_number\": \"$PHONE_NUMBER_2\", \"display_name\": \"Friend 9876543210\"}")
echo $RESPONSE | jq .
echo $RESPONSE | jq -e '.success == true' > /dev/null || { echo "Update failed"; exit 1; }

# Test /api/contacts/delete
echo "### Test /api/contacts/delete"
RESPONSE=$(curl -s -X PUT http://localhost:3000/api/contacts/delete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEST_JWT_TOKEN_1234567890" \
  -d "{\"phone_number\": \"$PHONE_NUMBER_2\"}")
echo $RESPONSE | jq .
echo $RESPONSE | jq -e '.success == true' > /dev/null || { echo "Delete failed"; exit 1; }

# Test /api/contacts for phone number 9876543210 to check if contact status is blocked
echo "### Test /api/contacts for phone number 9876543210 to check if contact status is blocked"
RESPONSE=$(curl -s -X GET http://localhost:3000/api/contacts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEST_JWT_TOKEN_9876543210")
echo $RESPONSE | jq .
echo $RESPONSE | jq -e ".contacts | map(select(.phone_number == \"$PHONE_NUMBER_1\" and .status == \"blocked\")) | length > 0" > /dev/null || { echo "Contact status is not blocked"; exit 1; }

# Test /api/contacts/request again to check if contact status goes back to accepted
echo "### Test /api/contacts/request again"
RESPONSE=$(curl -s -X POST http://localhost:3000/api/contacts/request \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEST_JWT_TOKEN_1234567890" \
  -d "{\"phone_number\": \"$PHONE_NUMBER_2\"}")
echo $RESPONSE | jq .
echo $RESPONSE | jq -e '.success == true' > /dev/null || { echo "Request failed"; exit 1; }

# Test /api/contacts for phone number 9876543210 to check if contact status is back to accepted
echo "### Test /api/contacts for phone number 9876543210 to check if contact status is back to accepted"
RESPONSE=$(curl -s -X GET http://localhost:3000/api/contacts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEST_JWT_TOKEN_9876543210")
echo $RESPONSE | jq .
echo $RESPONSE | jq -e ".contacts | map(select(.phone_number == \"$PHONE_NUMBER_1\" and .status == \"accepted\")) | length > 0" > /dev/null || { echo "Contact status is not accepted"; exit 1; }

echo "All tests passed successfully."
