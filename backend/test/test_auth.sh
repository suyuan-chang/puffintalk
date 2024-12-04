#!/bin/bash

echo "### Test auth middleware"
curl http://localhost:3000/api/test/auth
echo "\n"

echo "### Test auth middleware with bad token"
curl -X GET http://localhost:3000/api/test/auth \
  -H "Authorization: Bearer BAD_JWT_TOKEN"
echo "\n"

echo "### Test auth middleware with token from environment variable TEST_JWT_TOKEN_1234567890"
curl -X GET http://localhost:3000/api/test/auth \
  -H "Authorization: Bearer $TEST_JWT_TOKEN_1234567890"
echo "\n"

echo "### Test auth middleware with token from environment variable TEST_JWT_TOKEN_9876543210"
curl -X GET http://localhost:3000/api/test/auth \
  -H "Authorization: Bearer $TEST_JWT_TOKEN_9876543210"
echo "\n"
