
const mongoose = require('mongoose');

const IncidenciaSchema = new mongoose.Schema({
  bellota: Number,
  localizacion: {
    latitud: Number,
    longitud: Number
  },
  incidencia: Number,
  activo: { type: Boolean, default: true },
  fechaCreacion: { type: Date, default: Date.now },
  fotoBase64: String
});

module.exports = mongoose.model('Incidencia', IncidenciaSchema);
