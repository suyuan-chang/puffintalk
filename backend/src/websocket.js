
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'puffintalk_jwt_secret';

const pool = require('./db');

let wss;

function initializeWebSocketServer(server) {
  wss = new WebSocket.Server({ server });

  wss.on('connection', (ws, req) => {
    const params = new URLSearchParams(req.url.split('?')[1]);
    const token = params.get('token');

    // Check url is /api/notifications
    if (req.url.split('?')[0] !== '/api/notifications') {
      console.log("wss connection invalid endpoint: ", req.url);
      ws.close(4000, 'Invalid endpoint');
      return;
    }

    // Check JWT token is provided
    if (!token) {
      console.log("wss connection missing token: ", req.url);
      ws.close(4000, 'token is required');
      return;
    }

    jwt.verify(token, JWT_SECRET, async (err, user) => {
      if (err) {
        console.log("wss connection invalid token: ", token);
        ws.close(4001, 'Invalid token');
        return;
      }

      const user_id = user.user_id;
      const phone_number = user.phone_number;
      ws.userId = user_id;
      ws.userPhoneNumber = phone_number;

      console.log(`Connection established for ${phone_number}`);

      ws.on('close', () => {
        console.log(`Connection closed for ${phone_number}`);
      });

      // confirm notification channel is established.
      ws.send(JSON.stringify({ event: 'connected', timestamp: new Date().toISOString() }));

      // find all created but not delivered messages for this user.
      const messagesResult = await pool.query(
        `SELECT id, sender_id, receiver_id
         FROM messages
         WHERE receiver_id = $1 AND status = 'created'`,
         [user_id]);
      if (messagesResult.rows.length > 0) {
        // A set for all sender_id need to notify messages status changed.
        const senders = new Set();

        for (const message of messagesResult.rows) {
          // mark all messages sent to this user as delivered.
          pool.query(
            `UPDATE messages SET status = 'delivered' WHERE id = $1`,
            [message.id]
          );
          senders.add(message.sender_id);
        }

        // notify all senders that the messages have been delivered.
        for (const senderId of senders) {
          notifyClients({
            event: "messages_updated",
            sender: phone_number,
            timestamp: new Date().toISOString()
          }, senderId);
        }
      }
    });
  });
}

function notifyClients(event, userId) {
  let notified = false;
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN &&
        client.userId === userId) {
      client.send(JSON.stringify(event));
      notified = true;
    }
  });
  return notified;
}

module.exports = { initializeWebSocketServer, notifyClients };
