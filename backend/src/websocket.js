
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'puffintalk_jwt_secret';

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

    jwt.verify(token, JWT_SECRET, (err, user) => {
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

      ws.send(JSON.stringify({ event: 'connected', timestamp: new Date().toISOString() }));
    });
  });
}

function notifyClients(event, userId) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN &&
        client.userId === userId) {
      client.send(JSON.stringify(event));
    }
  });
}

module.exports = { initializeWebSocketServer, notifyClients };
