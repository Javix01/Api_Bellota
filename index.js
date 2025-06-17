const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// 1. Configuración mejorada de middlewares
app.use(cors({
  origin: '*' // Puedes restringir esto a tu dominio en producción
}));
app.use(express.json({ limit: '25mb' })); // Aumentado para fotos grandes
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// 2. Conexión robusta a MongoDB
const mongoOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000, // 10 segundos de timeout
  retryWrites: true,
  w: 'majority'
};

mongoose.connect(process.env.MONGO_URI, mongoOptions)
  .then(() => console.log('MongoDB conectado exitosamente'))
  .catch(err => {
    console.error('Error crítico de MongoDB:', err);
    process.exit(1); // Falla rápida si no hay DB
  });

// 3. Esquema mejorado con validaciones
const incidenciaSchema = new mongoose.Schema({
  bellota: { 
    type: Number, 
    required: [true, 'El ID de bellota es requerido'],
    min: [0, 'ID no puede ser negativo']
  },
  localizacion: {
    latitud: { 
      type: Number, 
      required: true,
      min: -90,
      max: 90
    },
    longitud: { 
      type: Number, 
      required: true,
      min: -180,
      max: 180
    }
  },
  incidencias: { 
    type: Number, 
    required: true,
    enum: [1, 2], // 1: pánico, 2: hombre muerto
    validate: {
      validator: Number.isInteger,
      message: 'Tipo de incidencia debe ser 1 o 2'
    }
  },
  activo: { 
    type: Boolean, 
    default: true 
  },
  fechaCreacion: { 
    type: Date, 
    default: Date.now,
    immutable: true // No puede modificarse
  },
  foto: { 
    type: String, 
    required: [true, 'La foto es requerida'],
    validate: {
      validator: v => v && v.length > 100,
      message: 'La foto debe ser un Base64 válido'
    }
  }
}, {
  timestamps: true // Añade createdAt y updatedAt automáticamente
});

// 4. Modelo con métodos personalizados
const Incidencia = mongoose.model('Incidencia', incidenciaSchema);

// 5. Middleware de logging para todas las peticiones
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// 6. Endpoint mejorado para reportar
app.post('/api/reportar', async (req, res) => {
  console.log('Datos recibidos:', {
    body: Object.keys(req.body),
    fotoSize: req.body.foto?.length || 0
  });

  try {
    // Normalización de datos entrantes
    const datosIncidencia = {
      ...req.body,
      incidencias: req.body.incidencias || req.body.incidencia || 1, // Default a 1 (pánico)
      localizacion: req.body.localizacion || {
        latitud: req.body.latitud || 0,
        longitud: req.body.longitud || 0
      }
    };

    const nuevaIncidencia = new Incidencia(datosIncidencia);
    const saved = await nuevaIncidencia.save();
    
    console.log(`Incidencia ${saved._id} guardada`);
    return res.status(201).json({
      success: true,
      id: saved._id,
      fecha: saved.fechaCreacion
    });

  } catch (err) {
    console.error('Error:', err.message);
    
    // Manejo diferente para errores de validación
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(422).json({ 
        success: false,
        errors 
      });
    }
    
    return res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor' 
    });
  }
});

// 7. Endpoint de estado del servicio
app.get('/api/status', (req, res) => {
  const status = {
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    memory: process.memoryUsage(),
    uptime: process.uptime()
  };
  res.json(status);
});

app.get('/api/reportarData', async (req, res) => {
  console.log('📥 Datos recibidos por GET:', Object.keys(req.query));

  // Validación estricta de parámetros
  if (!req.query.foto || req.query.foto.length < 100) {
    return res.status(422).json({
      success: false,
      error: 'La foto en Base64 es obligatoria y debe ser válida'
    });
  }

  try {
    const datosIncidencia = {
      bellota: parseInt(req.query.bellota) || 0,
      localizacion: {
        latitud: parseFloat(req.query.latitud),
        longitud: parseFloat(req.query.longitud)
      },
      incidencias: parseInt(req.query.incidencias),
      foto: req.query.foto
    };

    // Validación de coordenadas
    if (isNaN(datosIncidencia.localizacion.latitud) || 
        isNaN(datosIncidencia.localizacion.longitud)) {
      return res.status(422).json({
        success: false,
        error: 'Coordenadas GPS inválidas'
      });
    }

    // Validación de tipo de incidencia
    if (![1, 2].includes(datosIncidencia.incidencias)) {
      return res.status(422).json({
        success: false,
        error: 'Tipo de incidencia debe ser 1 (pánico) o 2 (hombre muerto)'
      });
    }

    const nuevaIncidencia = new Incidencia(datosIncidencia);
    const saved = await nuevaIncidencia.save();
    
    return res.status(201).json({
      success: true,
      id: saved._id
    });

  } catch (err) {
    console.error('Error en GET:', err.message);
    return res.status(500).json({ 
      success: false,
      error: 'Error al procesar la incidencia' 
    });
  }
});

// 8. Manejo de errores global mejorado
app.use((err, req, res, next) => {
  console.error('Error no manejado:', err.stack);
  res.status(500).json({ 
    success: false,
    error: 'Error inesperado del servidor' 
  });
});

// 9. Iniciar servidor con manejo de puerto
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});

// 10. Manejo adecuado de cierre
process.on('SIGINT', () => {
  server.close(() => {
    mongoose.connection.close(false, () => {
      console.log('Servidor y conexión a MongoDB cerrados');
      process.exit(0);
    });
  });
});
