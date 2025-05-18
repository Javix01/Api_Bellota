
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const Incidencia = require('./models/Incidencia');

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.json({ limit: '20mb' }));  // Permite hasta 20MB de Base64

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB conectado'))
.catch(err => console.error('Error de conexión:', err));

app.post('/api/reportar', async (req, res) => {
  console.log("Datos recibidos:", {
    fotoRecibida: !!req.body.foto,  // ¿Llegó la foto?
    longitudFoto: req.body.foto?.length  // Tamaño del string
  });
  try {
    const data = req.body;
    const nueva = new Incidencia(data);
    await nueva.save();
    res.status(201).json({ mensaje: 'Incidencia guardada' });
  } catch (err) {
    console.error('Error al guardar:', err);
    res.status(500).json({ error: 'Error al guardar la incidencia' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});
