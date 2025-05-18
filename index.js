const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Configuración de middlewares
app.use(cors());
app.use(express.json({ limit: '20mb' }));  // Solo necesitas este, bodyParser está incluido en express

// Conexión a MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000  // Timeout de 5 segundos para la conexión
})
.then(() => console.log('✅ MongoDB conectado'))
.catch(err => {
  console.error('❌ Error de conexión a MongoDB:', err);
  process.exit(1);  // Salir si no hay conexión
});

// Esquema e Modelo (mejor definidos en el mismo archivo para este ejemplo)
const incidenciaSchema = new mongoose.Schema({
  bellota: { type: Number, required: true },
  localizacion: {
    latitud: { type: Number, required: true },
    longitud: { type: Number, required: true }
  },
  incidencias: { type: Number, required: true },  // Nota: plural "incidencias"
  activo: { type: Boolean, default: true },
  fechaCreacion: { type: Date, default: Date.now },
  foto: { type: String, required: true }  // Campo obligatorio
});

const Incidencia = mongoose.model('Incidencia', incidenciaSchema);

// Endpoint para reportar
app.post('/api/reportar', async (req, res) => {
  console.log('📥 Datos recibidos:', {
    body: req.body,
    fotoLength: req.body.foto?.length || 0
  });

  try {
    // Validación manual adicional
    if (!req.body.foto || req.body.foto.length < 100) {  // Ejemplo: mínimo 100 caracteres
      throw new Error('La foto no es válida o está vacía');
    }

    const nuevaIncidencia = new Incidencia({
      ...req.body,
      // Aseguramos que "incidencias" esté presente (puede venir como "incidencia")
      incidencias: req.body.incidencias || req.body.incidencia
    });

    await nuevaIncidencia.save();
    
    console.log('💾 Incidencia guardada:', nuevaIncidencia._id);
    res.status(201).json({ 
      mensaje: 'Incidencia guardada',
      id: nuevaIncidencia._id 
    });

  } catch (err) {
    console.error('❌ Error al guardar:', err.message);
    res.status(400).json({  // 400 para errores de validación
      error: err.message || 'Error al guardar la incidencia'
    });
  }
});

// Endpoint de prueba
app.get('/', (req, res) => {
  res.send('API de Incidencias Funcionando 🚀');
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('🔥 Error no manejado:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🖥️ Servidor escuchando en puerto ${PORT}`);
});
