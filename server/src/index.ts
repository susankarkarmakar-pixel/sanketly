import express from 'express';
import { createServer } from 'http';
import { authRouter } from './routes/auth';
import { prekeysRouter } from './routes/prekeys';
import { groupsRouter } from './routes/groups';
import { setupSocket } from './socket';

const app = express();
const server = createServer(app);
const port = process.env.PORT || 4000;

app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/', authRouter);
app.use('/', prekeysRouter);
app.use('/', groupsRouter);

// Setup Socket.io
setupSocket(server);

if (require.main === module) {
  server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

export default server;
