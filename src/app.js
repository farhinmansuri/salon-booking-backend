const express = require('express');
const cors = require('cors');
const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const salonAvailabilityRoutes = require('./routes/salonAvailabilityRoutes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/availability', salonAvailabilityRoutes);

app.use(notFoundHandler);
app.use(errorHandler); 

module.exports = app;
