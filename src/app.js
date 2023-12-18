const express = require('express');
const recoveryRoutes = require('./routes/recovery');
const cors = require('cors');

const app = express();
app.use(express.json());
const corsOptions = {
  origin: '*',
  credentials: true, //access-control-allow-credentials:true
  optionSuccessStatus: 200,
};

app.use(cors(corsOptions)); // Use this after the variable declaration
app.use('/api/auth', recoveryRoutes);

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
  console.log(`Servicio de recuperación de contraseñas corriendo en el puerto ${PORT}`);
});