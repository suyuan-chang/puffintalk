#!/bin/bash

echo "### Cleanup test phone number 1234567890"
curl -X DELETE http://localhost:3000/api/test/users \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "1234567890"}'
  echo "\n"

echo "### Test sign-up with valid phone number 1234567890"
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "1234567890"}'
echo "\n"

echo "### Complete sign-up phone number 1234567890 (use wildcard passcode)"
curl -X POST http://localhost:3000/api/auth/complete-signup \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "1234567890", "passcode": "654321"}'
echo "\n"

echo "### Cleanup test phone number 9876543210"
curl -X DELETE http://localhost:3000/api/test/users \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "9876543210"}'
  echo "\n"

echo "### Test sign-up with valid phone number 9876543210"
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "9876543210"}'
echo "\n"

echo "### Complete sign-up phone number 9876543210 (use wildcard passcode)"
curl -X POST http://localhost:3000/api/auth/complete-signup \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "9876543210", "passcode": "654321"}'
echo "\n"
