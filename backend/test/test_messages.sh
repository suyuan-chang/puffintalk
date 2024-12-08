#!/bin/bash

# Ensure the JWT tokens are available
if [ -z "$TEST_JWT_TOKEN_1234567890" ] || [ -z "$TEST_JWT_TOKEN_9876543210" ]; then
  echo "JWT tokens are not set. Please run test_sign_in.sh first."
  exit 1
fi

# Define phone numbers
PHONE_NUMBER_1="1234567890"
PHONE_NUMBER_2="9876543210"

# Test sending a text message from 1234567890 to 9876543210
echo "### Test sending a text message from $PHONE_NUMBER_1 to $PHONE_NUMBER_2"
RESPONSE=$(curl -s -X POST http://localhost:3000/api/messages/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEST_JWT_TOKEN_1234567890" \
  -d "{\"phone_number\": \"$PHONE_NUMBER_2\", \"message_type\": \"text\", \"message\": \"Hello from $PHONE_NUMBER_1\"}")
echo $RESPONSE | jq .
echo $RESPONSE | jq -e '.messages | length > 0' > /dev/null || { echo "Text message send failed"; exit 1; }
MESSAGE_ID=$(echo $RESPONSE | jq -r '.messages[0].id')
if [ "$MESSAGE_ID" == "null" ]; then
  echo "Failed to retrieve message ID"
  exit 1
fi
echo "created message_id: $MESSAGE_ID"

# Test reading all text messages for phone number 9876543210
echo "### Test reading all text messages from $PHONE_NUMBER1 to $PHONE_NUMBER_2"
RESPONSE=$(curl -s -X PUT http://localhost:3000/api/messages/read_all_text \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEST_JWT_TOKEN_9876543210" \
  -d "{\"phone_number\": \"$PHONE_NUMBER_1\"}")
echo $RESPONSE | jq .
echo $RESPONSE | jq -e 'type == "object" and .success == true' > /dev/null || { echo "Not success"; exit 1; }

# Test retrieving messages for phone number 9876543210 to check if all text messages are marked as seen
echo "### Test retrieving messages for $PHONE_NUMBER_2 to check if all text messages are marked as seen"
RESPONSE=$(curl -s -X GET http://localhost:3000/api/messages/$PHONE_NUMBER_1 \
  -H "Authorization: Bearer $TEST_JWT_TOKEN_9876543210")
echo $RESPONSE | jq .
echo $RESPONSE | jq -e '.messages[] | select(.message_type == "text" and .status == "seen")' > /dev/null || { echo "Some text messages are not marked as seen"; exit 1; }

# Test sending a text message from 1234567890 to 9876543210
echo "### Test sending a text message from $PHONE_NUMBER_1 to $PHONE_NUMBER_2"
RESPONSE=$(curl -s -X POST http://localhost:3000/api/messages/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEST_JWT_TOKEN_1234567890" \
  -d "{\"phone_number\": \"$PHONE_NUMBER_2\", \"message_type\": \"text\", \"message\": \"Hello from $PHONE_NUMBER_1 again.\"}")
echo $RESPONSE | jq .
echo $RESPONSE | jq -e '.messages | length > 0' > /dev/null || { echo "Text message send failed"; exit 1; }
MESSAGE_ID=$(echo $RESPONSE | jq -r '.messages[0].id')
if [ "$MESSAGE_ID" == "null" ]; then
  echo "Failed to retrieve message ID"
  exit 1
fi
echo "created message_id: $MESSAGE_ID"

# Test retrieving messages for phone number 9876543210
echo "### Test retrieving messages for $PHONE_NUMBER_2"
RESPONSE=$(curl -s -X GET http://localhost:3000/api/messages/$PHONE_NUMBER_1 \
  -H "Authorization: Bearer $TEST_JWT_TOKEN_9876543210")
echo $RESPONSE | jq .
echo $RESPONSE | jq -e ".messages[] | select(.id == $MESSAGE_ID)" > /dev/null || { echo "Message retrieval failed"; exit 1; }
echo $RESPONSE | jq -e ".messages[] | select(.id == $MESSAGE_ID and .status != \"seen\")" > /dev/null || { echo "Message status is incorrect"; exit 1; }

# Test reading the new created message using PHONE_NUMBER_2
echo "### Test reading the new created message using $PHONE_NUMBER_2"
RESPONSE=$(curl -s -X PUT http://localhost:3000/api/messages/read \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEST_JWT_TOKEN_9876543210" \
  -d "{\"message_id\": $MESSAGE_ID}")

echo $RESPONSE | jq .
echo $RESPONSE | jq -e 'type == "object" and .success == true' > /dev/null || { echo "Not success"; exit 1; }

# Test retrieving messages for phone number 9876543210
echo "### Test retrieving messages for $PHONE_NUMBER_2"
RESPONSE=$(curl -s -X GET http://localhost:3000/api/messages/$PHONE_NUMBER_1 \
  -H "Authorization: Bearer $TEST_JWT_TOKEN_9876543210")
echo $RESPONSE | jq .
echo $RESPONSE | jq -e ".messages[] | select(.id == $MESSAGE_ID and .status == \"seen\")" > /dev/null || { echo "Message status is incorrect"; exit 1; }

# Test uploading a video clip to media content
echo "### Test uploading a video clip to media content"
RESPONSE=$(curl -s -X POST http://localhost:3000/api/messages/upload_media?media_type=video/mp4 \
  -H "Authorization: Bearer $TEST_JWT_TOKEN_9876543210" \
  -F "file=@video.mp4")
echo $RESPONSE | jq .
MEDIA_CONTENT_ID=$(echo $RESPONSE | jq -r '.id')
if [ "$MEDIA_CONTENT_ID" == "null" ]; then
  echo "Video upload failed"
  exit 1
fi
echo "created media_content_id: $MEDIA_CONTENT_ID"

# Test downloading the previously uploaded video clip
echo "### Test downloading the previously uploaded video clip"
curl -v "http://localhost:3000/api/messages/media/$MEDIA_CONTENT_ID/?token=$TEST_JWT_TOKEN_9876543210" > downloaded_video.mp4
if cmp -s "downloaded_video.mp4" "video.mp4"; then
  echo "The downloaded video is identical to the original video."
  rm downloaded_video.mp4
else
  echo "The downloaded video is different from the original video."
  rm downloaded_video.mp4
  exit 1
fi

# Test sending a video message from 9876543210 to 1234567890
echo "### Test sending a video message from $PHONE_NUMBER_2 to $PHONE_NUMBER_1"
RESPONSE=$(curl -s -X POST http://localhost:3000/api/messages/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEST_JWT_TOKEN_9876543210" \
  -d "{\"phone_number\": \"$PHONE_NUMBER_1\", \"message_type\": \"video\", \"media_content_id\": $MEDIA_CONTENT_ID}")
echo $RESPONSE | jq .
echo $RESPONSE | jq -e '.messages | length > 0' > /dev/null || { echo "Video message send failed"; exit 1; }

# Test retrieving messages for phone number 1234567890
echo "### Test retrieving messages for $PHONE_NUMBER_1"
RESPONSE=$(curl -s -X GET http://localhost:3000/api/messages/$PHONE_NUMBER_2 \
  -H "Authorization: Bearer $TEST_JWT_TOKEN_1234567890")
echo $RESPONSE | jq .
echo $RESPONSE | jq -e ".messages[] | select(.sender == \"$PHONE_NUMBER_2\")" > /dev/null || { echo "Message retrieval failed"; exit 1; }

# Test retrieving contacts to check if last_touch_at field is not null
echo "### Test retrieving contacts to check if last_touch_at field is not null"
RESPONSE=$(curl -s -X GET http://localhost:3000/api/contacts \
  -H "Authorization: Bearer $TEST_JWT_TOKEN_1234567890")
echo $RESPONSE | jq .
echo $RESPONSE | jq -e '.contacts[] | select(.last_touch_at != null)' > /dev/null || { echo "last_touch_at field is null for some contacts"; exit 1; }

# Test uploading a audio clip to media content
echo "### Test uploading a audio clip to media content"
RESPONSE=$(curl -s -X POST http://localhost:3000/api/messages/upload_media?media_type=video/mp3 \
  -H "Authorization: Bearer $TEST_JWT_TOKEN_9876543210" \
  -F "file=@audio.mp3")
echo $RESPONSE | jq .
AUDIO_CONTENT_ID=$(echo $RESPONSE | jq -r '.id')
if [ "$AUDIO_CONTENT_ID" == "null" ]; then
  echo "Audio upload failed"
  exit 1
fi
echo "created media_content_id: $AUDIO_CONTENT_ID"

# Test downloading the previously uploaded audio clip
echo "### Test downloading the previously uploaded audio clip"
curl -v "http://localhost:3000/api/messages/media/$AUDIO_CONTENT_ID/?token=$TEST_JWT_TOKEN_9876543210" > downloaded_audio.mp3
if cmp -s "downloaded_audio.mp3" "audio.mp3"; then
  echo "The downloaded video is identical to the original video."
  rm downloaded_audio.mp3
else
  echo "The downloaded video is different from the original video."
  rm downloaded_audio.mp3
  exit 1
fi

# Test sending a audio message from 9876543210 to 1234567890
echo "### Test sending a video message from $PHONE_NUMBER_2 to $PHONE_NUMBER_1"
RESPONSE=$(curl -s -X POST http://localhost:3000/api/messages/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEST_JWT_TOKEN_9876543210" \
  -d "{\"phone_number\": \"$PHONE_NUMBER_1\", \"message_type\": \"audio\", \"media_content_id\": $AUDIO_CONTENT_ID}")
echo $RESPONSE | jq .
echo $RESPONSE | jq -e '.messages | length > 0' > /dev/null || { echo "Audio message send failed"; exit 1; }

echo "All tests passed successfully."
