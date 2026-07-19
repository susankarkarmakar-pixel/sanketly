import express from 'express';
import { authRouter } from './routes/auth';

const app = express();
const port = process.env.PORT || 4000;

app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/', authRouter);

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

export default app;
