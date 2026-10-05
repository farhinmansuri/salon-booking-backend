const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const Service = require('../models/Service');
const {
  SALON_TIME_ZONE,
  OPEN_MINUTE,
  CLOSE_MINUTE,
  SLOT_INTERVAL_MINUTES,
  timeToMinutes,
  minutesToTime,
  salonDateString,
  appointmentStart,
} = require('../utils/salonSchedule');

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const BLOCKING_STATUSES = ['pending', 'confirmed', 'completed'];

function parseDate(dateString) {
  if (typeof dateString !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return null;
  }

  const date = new Date(`${dateString}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== dateString
    ? null
    : date;
}

function addMinutes(time, minutes) {
  const [hours, mins] = time.split(':').map(Number);
  const endMinutes = hours * 60 + mins + minutes;
  if (endMinutes >= 24 * 60) return null;

  const endHours = Math.floor(endMinutes / 60);
  const endRemainder = endMinutes % 60;
  return `${String(endHours).padStart(2, '0')}:${String(endRemainder).padStart(2, '0')}`;
}

function validId(id) {
  return mongoose.isValidObjectId(id);
}

function handleValidationError(error, res, next) {
  if (error.name === 'ValidationError' || error.name === 'CastError') {
    return res.status(400).json({ message: error.message });
  }
  return next(error);
}

async function createAppointment(req, res, next) {
  const body = req.body || {};
  const date = parseDate(body.appointmentDate);
  const { service: serviceId, startTime, notes = '' } = body;

  if (!serviceId || !startTime || !date) {
    return res.status(400).json({
      message: 'service, appointmentDate (YYYY-MM-DD), and startTime (HH:mm) are required.',
    });
  }
  if (!validId(serviceId)) {
    return res.status(400).json({ message: 'Invalid service ID.' });
  }
  if (typeof startTime !== 'string' || !TIME_PATTERN.test(startTime)) {
    return res.status(400).json({ message: 'startTime must use 24-hour HH:mm format.' });
  }
  if (typeof notes !== 'string') {
    return res.status(400).json({ message: 'notes must be a string.' });
  }
  if (appointmentStart(date, startTime) <= new Date()) {
    return res.status(400).json({ message: 'Appointment must be scheduled in the future.' });
  }

  try {
    const service = await Service.findOne({ _id: serviceId, isActive: true });
    if (!service) {
      return res.status(404).json({ message: 'Active service not found.' });
    }

    const endTime = addMinutes(startTime, service.duration);
    if (!endTime) {
      return res.status(400).json({ message: 'Appointment must end before midnight.' });
    }
    if (timeToMinutes(startTime) < OPEN_MINUTE || timeToMinutes(startTime) % SLOT_INTERVAL_MINUTES !== 0 || timeToMinutes(endTime) > CLOSE_MINUTE) {
      return res.status(400).json({
        message: `Appointments must use 30-minute start times between 09:00 and 18:00 ${SALON_TIME_ZONE}, and finish by closing.`,
      });
    }

    const conflict = await Appointment.findOne({
      service: service._id,
      appointmentDate: date,
      status: { $in: BLOCKING_STATUSES },
      startTime: { $lt: endTime },
      endTime: { $gt: startTime },
    });
    if (conflict) {
      return res.status(409).json({ message: 'That service time slot is already booked.' });
    }

    const appointment = await Appointment.create({
      customer: req.user.id,
      service: service._id,
      appointmentDate: date,
      startTime,
      endTime,
      notes: notes.trim(),
      status: 'pending',
    });

    await appointment.populate('service', 'name duration price');
    return res.status(201).json({ appointment });
  } catch (error) {
    return handleValidationError(error, res, next);
  }
}

async function getAvailableTimes(req, res, next) {
  const { service: serviceId, date: dateString } = req.query;
  const date = parseDate(dateString);

  if (!serviceId || !dateString) {
    return res.status(400).json({ message: 'service and date (YYYY-MM-DD) are required.' });
  }
  if (!validId(serviceId)) {
    return res.status(400).json({ message: 'Invalid service ID.' });
  }
  if (typeof dateString !== 'string') {
    return res.status(400).json({ message: 'date must use YYYY-MM-DD format.' });
  }
  if (!date || dateString < salonDateString()) {
    return res.status(400).json({ message: 'Choose a valid appointment date that is today or later.' });
  }

  try {
    const service = await Service.findOne({ _id: serviceId, isActive: true }).select('name duration');
    if (!service) {
      return res.status(404).json({ message: 'Active service not found.' });
    }

    const existingAppointments = await Appointment.find({
      service: service._id,
      appointmentDate: date,
      status: { $in: BLOCKING_STATUSES },
    }).select('startTime endTime').lean();

    const availableTimes = [];
    const latestStart = CLOSE_MINUTE - service.duration;
    for (let minute = OPEN_MINUTE; minute <= latestStart; minute += SLOT_INTERVAL_MINUTES) {
      const startTime = minutesToTime(minute);
      const endTime = addMinutes(startTime, service.duration);
      if (appointmentStart(date, startTime) <= new Date()) continue;

      const conflicts = existingAppointments.some((appointment) =>
        appointment.startTime < endTime && appointment.endTime > startTime
      );
      if (!conflicts) availableTimes.push(startTime);
    }

    return res.status(200).json({
      date: dateString,
      timeZone: SALON_TIME_ZONE,
      service: { id: service.id, name: service.name, duration: service.duration },
      availableTimes,
    });
  } catch (error) {
    return next(error);
  }
}

async function getMyAppointments(req, res, next) {
  try {
    const appointments = await Appointment.find({ customer: req.user.id })
      .populate('service', 'name duration price image')
      .sort({ appointmentDate: -1, startTime: -1 });
    return res.status(200).json({ appointments });
  } catch (error) {
    return next(error);
  }
}

async function getAllAppointments(_req, res, next) {
  try {
    const appointments = await Appointment.find()
      .populate('customer', 'name email')
      .populate('service', 'name duration price')
      .sort({ appointmentDate: 1, startTime: 1 });
    return res.status(200).json({ appointments });
  } catch (error) {
    return next(error);
  }
}

async function getAppointmentById(req, res, next) {
  if (!validId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid appointment ID.' });
  }

  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('customer', 'name email')
      .populate('service', 'name duration price');
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }
    return res.status(200).json({ appointment });
  } catch (error) {
    return next(error);
  }
}

async function updateAppointmentStatus(req, res, next) {
  if (!validId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid appointment ID.' });
  }

  const { status } = req.body || {};
  if (!['confirmed', 'rejected', 'completed'].includes(status)) {
    return res.status(400).json({
      message: 'status must be confirmed, rejected, or completed.',
    });
  }

  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }

    const validTransition =
      (appointment.status === 'pending' && ['confirmed', 'rejected'].includes(status)) ||
      (appointment.status === 'confirmed' && status === 'completed');
    if (!validTransition) {
      return res.status(409).json({
        message: `Cannot change appointment from ${appointment.status} to ${status}.`,
      });
    }

    appointment.status = status;
    await appointment.save();
    await appointment.populate([
      { path: 'customer', select: 'name email' },
      { path: 'service', select: 'name duration price' },
    ]);
    return res.status(200).json({ appointment });
  } catch (error) {
    return handleValidationError(error, res, next);
  }
}

async function cancelMyAppointment(req, res, next) {
  if (!validId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid appointment ID.' });
  }

  try {
    const appointment = await Appointment.findOne({
      _id: req.params.id,
      customer: req.user.id,
    });
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }
    if (!['pending', 'confirmed'].includes(appointment.status)) {
      return res.status(409).json({
        message: `Cannot cancel an appointment with ${appointment.status} status.`,
      });
    }

    appointment.status = 'cancelled';
    await appointment.save();
    await appointment.populate('service', 'name duration price');
    return res.status(200).json({ appointment });
  } catch (error) {
    return handleValidationError(error, res, next);
  }
}

module.exports = {
  createAppointment,
  getAvailableTimes,
  getMyAppointments,
  getAllAppointments,
  getAppointmentById,
  updateAppointmentStatus,
  cancelMyAppointment,
};
