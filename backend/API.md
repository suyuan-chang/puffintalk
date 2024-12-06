# PuffinTalk Backend API

This document outlines the API endpoints for the PuffinTalk application.

## Authentication

### POST /api/auth/signup
Sign up a new user.

**Request Body:**
```json
{
    "phone_number": "string"
}
```

**Response:**

- `200 OK`: One-time passcode sent to the phone number.
- `400 Bad Request`: Invalid phone number.
- `409 Conflict`: Phone number already registered.
- `500 Internal Server Error`: Server error.


### POST /api/auth/complete-signup
Complete the sign-up process using the phone number and one-time passcode.

**Request Body:**
```json
{
    "phone_number": "string",
    "passcode": "string"
}
```

**Response:**

- `200 OK`: Account creation successful.
- `400 Bad Request`: Invalid phone number or passcode.
- `408 Timeout`: Passcode is expired.
- `500 Internal Server Error`: Server error.

### POST /api/auth/signin
Sign in a user.

**Request Body:**
```json
{
    "phone_number": "string"
}
```

**Response:**
On succes, return JWT token used in other APIs.
```json
{
    "success": true,
    "token": "string"
}
```

On error, return error message
```json
{
    "success": false,
    "message": "string"
}
```

- `200 OK`: One-time passcode sent to the phone number.
- `400 Bad Request`: Invalid phone number.
- `404 Not Found`: Phone number not registered.
- `500 Internal Server Error`: Server error.

### POST /api/auth/complete-signin
Complete the sign-in process using the phone number and one-time passcode.

**Request Body:**
```json
{
    "phone_number": "string",
    "passcode": "string"
}
```

**Response:**

On succes, return JWT token used in other APIs.
```json
{
    "success": true,
    "token": "string"
}
```

On error, return error message
```json
{
    "success": false,
    "message": "string"
}
```

- `200 OK`: Sign-in successful.
- `400 Bad Request`: Invalid phone number or passcode.
- `408 Timeout`: Passcode is expired.
- `500 Internal Server Error`: Server error.

## Contact List Management

### GET /api/contacts
Retrieve the contact list of the authenticated user.

**Response:**

```json
{
    "contacts": [
        {
            "phone_number": "string",
            "display_name": "string",
            "status": "string",
            "last_touch_at": "string (ISO 8601)"
        }
    ]
}
```

- `200 OK`: Returns a list of friends.
- `401 Unauthorized`: Authentication required.
- `500 Internal Server Error`: Server error.

### GET /api/contacts/<phone_number>
Retrieve the a contact of the authenticated user.

**Response:**

```json
{
    "contacts": [
        {
            "phone_number": "string",
            "display_name": "string",
            "status": "string",
            "last_touch_at": "string (ISO 8601)"
        }
    ]
}
```

- `200 OK`: Returns the contact of the phone number.
- `401 Unauthorized`: Authentication required.
- `500 Internal Server Error`: Server error.

### PUT /api/contacts/request
Send a friend request to another user by phone number.
If the phone number is not registered, system will use SMS to send invitation link to the user.

User can send a friend reqeust to a deleted user and resume the friendship, but only success if peer side didn't delete this user.

**Request Body:**
```json
{
    "phone_number": "string",
    "display_name": "string"
}
```

**Response:**

Message body is the updated contacts list if 200 OK.
```json
{
    "contacts": [
        {
            "phone_number": "string",
            "display_name": "string",
            "status": "requesting",
            "last_touch_at": "string (ISO 8601)"
        }
    ]
}
```

- `200 OK`: Friend request sent successfully.
- `400 Bad Request`: Invalid phone number.
- `404 Not Found`: User not found.
- `409 Conflict`: Friend request already sent.
- `500 Internal Server Error`: Server error.

### PUT /api/contacts/accept
Accept a friend request from another user.

**Request Body:**
```json
{
    "phone_number": "string"
}
```

**Response:**

Message body is the updated contacts list if 200 OK.
```json
{
    "contacts": [
        {
            "phone_number": "string",
            "display_name": "string",
            "status": "accepted",
            "last_touch_at": "string (ISO 8601)"
        }
    ]
}
```

- `200 OK`: Friend request accepted.
- `400 Bad Request`: Invalid phone number.
- `404 Not Found`: Friend request not found.
- `500 Internal Server Error`: Server error.

### PUT /api/contacts/delete
For an accepted contact, delete this contact and block messages from this contact.
For a requesting contact, cancel friend request and remove it from contact list.

**Request Body:**
```json
{
    "phone_number": "string",
}
```

**Response:**

Message body is the updated contacts list if 200 OK.
```json
{
    "contacts": [
        {
            "phone_number": "string",
            "display_name": "string",
            "status": "deleted",
            "last_touch_at": "string (ISO 8601)"
        }
    ]
}
```

- `200 OK`: Contact is blocked.
- `400 Bad Request`: Invalid phone number.
- `404 Not Found`: Friend not found.
- `500 Internal Server Error`: Server error.

### PUT /api/contacts/update
Update a friend's display name in the contact list.

**Request Body:**
```json
{
  "phone_number": "string",
  "display_name": "string"
}
```

**Response:**

Message body is the updated contacts list if 200 OK.
```json
{
  "contacts": [
    {
      "phone_number": "string",
      "display_name": "string",
      "status": "string",
      "last_touch_at": "string (ISO 8601)"
    }
  ]
}
```

- `200 OK`: Display name updated successfully.
- `400 Bad Request`: Invalid phone number or display name.
- `404 Not Found`: Contact not found.
- `500 Internal Server Error`: Server error.

## Messaging

### GET /api/messages/<phone_number>
Retrieve messages between the authenticated user and a contact.

**Query Parameters:**
- `count`: Optional. Return up to `count` number latest messages. Maximum number is 255. Default is 100.

**Response:**
```json
{
    "messages": [
        {
            "id": number,
            "sender": "string (phone number)",
            "receiver": "string (phone number)",
            "message": "string (text message)",
            "message_type": "string (text, audio, video)",
            "media_type": "string (media format MIME)",
            "media_content_id": number,
            "status": "string (created, delivered, seen)",
            "created_at": "string (ISO 8601)"
        }
    ]
}
```

- `200 OK`: Returns a list of messages.
- `400 Bad Request`: Invalid phone number.
- `401 Unauthorized`: Authentication required.
- `404 Not Found`: Contact not found.
- `500 Internal Server Error`: Server error.

### POST /api/messages/send
Send a message to a contact.
For text message, set message_type to `text, and provide receiver's phone_number and sending message.
For audio or video message, set message_type to `audio` or `video` and set media_content_id to uploaded media content id received from previous /api/messages/upload_media API call.

**Request Body:**
```json
{
    "phone_number": "string",
    "message_type": "string (text, audio, video)",
    "message": "string",
    "media_content_id": number,
}
```

**Response:**

Response body return the new created message object if status is 200 OK.

```json
{
    "messages": [
        {
            "id": number,
            "sender": "string (phone number)",
            "receiver": "string (phone number)",
            "message": "string (text message)",
            "message_type": "string (text, audio, video)",
            "media_type": "string (media format MIME)",
            "media_content_id": number,
            "status": "string (created, delivered, seen)",
            "created_at": "string (ISO 8601)"
        }
    ]
}
```

- `200 OK`: Message sent successfully.
- `400 Bad Request`: Invalid phone number or message.
- `404 Not Found`: Recipient not found.
- `500 Internal Server Error`: Server error.

### POST /api/messages/upload_media
Upload a video or audio clip to the backend media content storage.

**Query Parameters:**
- `media_type`: The type of media being uploaded (audio, video).

**Request:**

Content-Type: `multipart/form-data`

**Request Body:**
- `file`: The file to be uploaded.

**Response:**
```json
{
    "id": number
}
```

- `200 OK`: Media content uploaded successfully.
- `400 Bad Request`: Invalid media type or data.
- `500 Internal Server Error`: Server error.

### GET /api/messages/media
Download previously uploaded media by the `media_content_id`.

**Query Parameters:**
- `media_content_id`: The ID of the media content to be downloaded.

**Response:**

The media content is returned in the response body with the `Content-Type` header set to the media type.

- `200 OK`: Media content downloaded successfully.
- `400 Bad Request`: Invalid media content ID.
- `404 Not Found`: Media content not found.
- `500 Internal Server Error`: Server error.

## Notification API

### WebSocket /api/notifications

Clients can connect to the WebSocket endpoint to receive real-time notifications for a registered phone number. Notifications are sent when there are changes to the user's contacts or messages. Client must provide JWT token to authenticate and indentify the target phone number.

**WebSocket Endpoint:**
```
ws://<server>>/api/notifications?token=<JWT_TOKEN>
```

**Notifications:**
Notifications are sent as JSON objects. The structure of the notification depends on the type of event.

**Connection establish Change Notification:**
```json
{
  "event": "connected",
  "timestamp": "string (ISO 8601)"
}
```

**Contact Change Notification:**
```json
{
  "event": "contacts_updated",
  "timestamp": "string (ISO 8601)"
}
```

**Message Change Notification:**
```json
{
  "event": "messages_updated",
  "sender": "string (phone number)",
  "timestamp": "string (ISO 8601)"
}
```

- `200 OK`: Connection established successfully.
- `400 Bad Request`: Invalid phone number.
- `401 Unauthorized`: Authentication required.
- `500 Internal Server Error`: Server error.
