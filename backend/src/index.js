const express = require('express');
const bodyParser = require('body-parser');
const { initializeWebSocketServer } = require('./websocket');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

const testRoutes = require('./routes/test');
const authRoutes = require('./routes/auth');
const contactsRoutes = require('./routes/contacts');
const messagesRoutes = require('./routes/messages');

if (process.env.ENABLE_TEST_API) {
  app.use('/api/test', testRoutes);
}

app.use('/api/auth', authRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/messages', messagesRoutes);

const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

initializeWebSocketServer(server);
