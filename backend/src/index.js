const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { initializeWebSocketServer } = require('./websocket');

const app = express();
const port = process.env.PORT || 3000;
const frontend_domain = process.env.FRONTEND_DOMAIN || 'http://localhost:4000';

app.use(cors({
  origin: frontend_domain,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
}));

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
