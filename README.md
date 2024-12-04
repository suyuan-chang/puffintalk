# PuffinTalk
PuffinTalk is a lightweight web-based instant messaging application designed to work on CloudMosa Cloud Phone. But it can also runs in Desktop and mobile web browser with limited features. This README document outlines the specifications and features of the app.

## User Accounts

PuffinTalk uses phone numbers as the primary user account and identity. This ensures a seamless and secure way to identify users uniquely.
To sign up or sign in to PuffinTalk, the system will send a one-time code via SMS to the user's phone number. Users must enter this code to complete the signup or sign-in process.

## Contact List

PuffinTalk allows users to send messages only to other PuffinTalk users who are in their contact list. To add someone to the contact list, users must invite them using their phone number. If the invited person does not have a PuffinTalk account, the system will send them instructions on how to create one. Upon receiving a friend invitation, the recipient can choose to either block or accept it. If the invitation is blocked, the sender will not be notified, and the friend request will remain pending. If the invitation is accepted, both users can start a conversation and exchange messages.

## Messaging Capabilities

PuffinTalk supports sending:
- Text messages
- Emojis
- Audio clips
- Video clips

**Note**: PuffinTalk does not support group chat.

## Features

- **Real-time Messaging**: Send and receive messages instantly.
- **User Authentication**: Secure login and registration system.
- **Responsive Design**: Designed for QVGA and QQVGA feature phone.
- **Navigation**: Support both keypad and touch screen navigation.
- **User Profiles**: Customizable user profiles with avatars.
- **Message History**: Persistent message history for each conversation.
- **Typing Indicators**: See when someone is typing a message.
- **Read Receipts**: Know when your messages have been read.
- **Notifications**: Real-time notifications for new messages.

## Technology Stack

- **Frontend**: HTML, CSS, JavaScript, React
- **Backend**: Node.js
- **Database**: PostgreSQL
- **WebSocket**: Socket.IO for real-time communication
- **Authentication**: JWT (JSON Web Tokens)

## System Requirements

Before installing PuffinTalk, ensure your system meets the following requirements:
- Node.js v20
- npm v10.8.2 or higher
- PostgreSQL v17

## Installation

1. Clone the repository:
    ```bash
    git clone https://github.com/yourusername/puffintalk.git
    ```
2. Navigate to the project directory:
    ```bash
    cd puffintalk/src
    ```
3. Install dependencies:
    ```bash
    npm install
    ```
4. Start the development server:
    ```bash
    npm start
    ```

## Usage

1. Open your web browser and navigate to `http://localhost:3000`.
2. Register a new account or log in with existing credentials.
3. Start chatting with your friends in real-time!

## Contributing

We welcome contributions! Please read our [Contributing Guidelines](CONTRIBUTING.md) for more information.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contact

For any questions or suggestions, please contact us at support@puffintalk.com.
