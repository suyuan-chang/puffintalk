# PuffinTalk Database Schema

This document outlines the database schema for PuffinTalk, including tables and their relationships.

## Tables

### Users

Stores user information.

| Column        | Type         | Description                        |
|---------------|--------------|------------------------------------|
| id            | SERIAL       | Primary key                        |
| phone_number  | VARCHAR(15)  | Unique phone number (full number including country code) |
| username      | VARCHAR(50)  | User's display name                |
| status        | VARCHAR(16)  | Account status                     |
| created_at    | TIMESTAMP    | Account creation timestamp         |
| passcode      | VARCHAR(10)  | System generated one-time passcode |
| passcode_at   | TIMESTAMP    | Passcode generate timestamp        |

User status definition:
- `inviting`: User is created because others invited this phone number to be friend.
- `registering`: User is in sign-up process. Passcode is generated and sent.
- `registered`: User sign-up.
- `suspended`: Account is suspended by adminstrator. User can not sign-in or sign-up this number again.
- `deleted`: Account is deleted by user. User can sign-up this number again.

### Contacts

Stores user contacts.

| Column        | Type         | Description                        |
|---------------|--------------|------------------------------------|
| id            | SERIAL       | Primary key                        |
| user_id       | INTEGER      | Foreign key to Users table         |
| contact_id    | INTEGER      | Foreign key to Users table         |
| display_name  | VARCHAR(50)  | Contact's display name for user    |
| status        | VARCHAR(16)  | Status of the contact              |
| created_at    | TIMESTAMP    | Contact creation timestamp         |
| last_touch_at | TIMESTAMP    | Last interaction timestamp         |

Contacts status definition:
- `requesting`: Friend request sent.
- `requested`: Friend request received.
- `accepted`: Friend request accepted. Both side can send messages.
- `blocked`: Deleted by the peer contact. Use can not send message to this contact.
- `deleted`: Delete this contact. Peer can not see or send message to user. Peer contact status will become blocked.

### Messages

Stores messages exchanged between users.

| Column        | Type         | Description                        |
|---------------|--------------|------------------------------------|
| id            | SERIAL       | Primary key                        |
| sender_id     | INTEGER      | Foreign key to Users table         |
| receiver_id   | INTEGER      | Foreign key to Users table         |
| message       | TEXT         | Text message content               |
| message_type  | VARCHAR(10)  | Type of message (text, audio, video) |
| status        | VARCHAR(16)  | Message status (created, delivered, seen) |
| created_at    | TIMESTAMP    | Message creation timestamp         |

Messages status definition:
- `created`: Message is created and uploaded to the server.
- `delivered`: Message is notified or arrived receiver's app.
- `seen`: Receiver opened and saw/listened to the message.

### MediaContent

Stores multimedia messages.

| Column        | Type         | Description                        |
|---------------|--------------|------------------------------------|
| id            | SERIAL       | Primary key                        |
| creator_id    | INTEGER      | Foreign key to Users table         |
| message_id    | INTEGER      | Foreign key to Messages table (nullable) |
| media_type    | VARCHAR(16)  | Media format (MIME)                |
| media_data    | BYTEA        | Binary data for the media content  |
| created_at    | TIMESTAMP    | Media content creation timestamp   |

## Relationships

- **Users**: Each user can have multiple contacts and can send/receive multiple messages.
- **Contacts**: Each contact entry links two users and tracks the status of their relationship.
- **Messages**: Each message is linked to a sender and a receiver, both of whom are users.
- **MediaContent**: Each media content entry is linked to a message.

## Indexes

- **Users**: Index on `phone_number` for quick lookups.
- **Contacts**: Composite index on `user_id` and `contact_id` for quick access to contact relationships.
- **Messages**: Index on `sender_id`, `receiver_id`, and `created_at` for efficient message retrieval.
- **MediaContent**: Index on `message_id` and `created_at` for quick access to media content.
