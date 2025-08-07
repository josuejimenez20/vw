import express from 'express';
import cors from 'cors';

import terraformRoutes from './src/routes/terraform.route.js';

const app = express();
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json());

app.use('/api/v1', terraformRoutes);

app.listen(3000, () => {
  console.log('Servidor escuchando en el puerto 3000');
});
