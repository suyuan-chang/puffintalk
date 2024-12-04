DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'puffintalk') THEN
    PERFORM dblink_exec('dbname=postgres', 'CREATE DATABASE puffintalk');
  END IF;
END
$$;

\c puffintalk;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    phone_number VARCHAR(15) UNIQUE NOT NULL,
    username VARCHAR(50),
    status VARCHAR(16) CHECK (status IN ('inviting', 'registering', 'registered', 'suspended', 'deleted')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    passcode VARCHAR(10),
    passcode_at TIMESTAMP
);

-- Create contacts table
CREATE TABLE IF NOT EXISTS contacts (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    contact_id INT REFERENCES users(id) ON DELETE CASCADE,
    display_name VARCHAR(50),
    status VARCHAR(16) CHECK (status IN ('requesting', 'requested', 'accepted', 'blocked', 'deleted')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_touch_at TIMESTAMP
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    sender_id INT REFERENCES users(id) ON DELETE CASCADE,
    receiver_id INT REFERENCES users(id) ON DELETE CASCADE,
    message TEXT,
    message_type VARCHAR(10) CHECK (message_type IN ('text', 'audio', 'video')),
    status VARCHAR(16) CHECK (status IN ('created', 'delivered', 'seen')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create media_content table
CREATE TABLE IF NOT EXISTS media_content (
    id SERIAL PRIMARY KEY,
    creator_id INT REFERENCES users(id) ON DELETE CASCADE,
    message_id INT REFERENCES messages(id) ON DELETE CASCADE,
    media_type VARCHAR(16),
    media_data BYTEA,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users(phone_number);
CREATE INDEX IF NOT EXISTS idx_contacts_user_id_contact_id ON contacts(user_id, contact_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_media_content_message_id ON media_content(message_id);
CREATE INDEX IF NOT EXISTS idx_media_content_created_at ON media_content(created_at);
