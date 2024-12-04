# NOTE: This script use wscat to test the notifications endpoint
# npm install -g wscat

# Ensure the JWT tokens are available
if [ -z "$TEST_JWT_TOKEN_1234567890" ] || [ -z "$TEST_JWT_TOKEN_9876543210" ]; then
  echo "JWT tokens are not set. Please run test_sign_in.sh first."
  exit 1
fi

#wscat -c "ws://localhost:3000/api/notifications?token=$TEST_JWT_TOKEN_1234567890"
wscat -c "ws://localhost:3000/api/notifications?token=$TEST_JWT_TOKEN_9876543210"
