const mongoose = require('mongoose');
const SalonAvailability = require('../models/SalonAvailability');

const DAYS_OF_WEEK = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];
const EDITABLE_FIELDS = ['dayOfWeek', 'isOpen', 'openingTime', 'closingTime', 'breakStart', 'breakEnd'];
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function timeToMinutes(value) {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function validateSchedule(schedule) {
  const errors = [];

  if (typeof schedule.dayOfWeek !== 'string' || !DAYS_OF_WEEK.includes(schedule.dayOfWeek.toLowerCase())) {
    errors.push('dayOfWeek must be a valid weekday name.');
  }
  if (typeof schedule.isOpen !== 'boolean') {
    errors.push('isOpen must be a boolean.');
  }

  const times = ['openingTime', 'closingTime', 'breakStart', 'breakEnd'];
  for (const field of times) {
    if (schedule[field] !== undefined && schedule[field] !== null && schedule[field] !== '' &&
        (typeof schedule[field] !== 'string' || !TIME_PATTERN.test(schedule[field]))) {
      errors.push(`${field} must use 24-hour HH:mm format.`);
    }
  }

  if (schedule.isOpen) {
    if (!schedule.openingTime || !schedule.closingTime) {
      errors.push('openingTime and closingTime are required when the salon is open.');
    } else if (TIME_PATTERN.test(schedule.openingTime) && TIME_PATTERN.test(schedule.closingTime) &&
               timeToMinutes(schedule.openingTime) >= timeToMinutes(schedule.closingTime)) {
      errors.push('closingTime must be later than openingTime.');
    }
  }

  const hasBreakStart = Boolean(schedule.breakStart);
  const hasBreakEnd = Boolean(schedule.breakEnd);
  if (hasBreakStart !== hasBreakEnd) {
    errors.push('breakStart and breakEnd must both be provided for a break.');
  } else if (hasBreakStart && TIME_PATTERN.test(schedule.breakStart) && TIME_PATTERN.test(schedule.breakEnd)) {
    const breakStart = timeToMinutes(schedule.breakStart);
    const breakEnd = timeToMinutes(schedule.breakEnd);
    if (breakStart >= breakEnd) {
      errors.push('breakEnd must be later than breakStart.');
    }
    if (schedule.isOpen && schedule.openingTime && schedule.closingTime &&
        TIME_PATTERN.test(schedule.openingTime) && TIME_PATTERN.test(schedule.closingTime) &&
        (breakStart < timeToMinutes(schedule.openingTime) || breakEnd > timeToMinutes(schedule.closingTime))) {
      errors.push('The break must fall within openingTime and closingTime.');
    }
  }

  return errors;
}

function getEditableValues(body) {
  const values = {};
  for (const field of EDITABLE_FIELDS) {
    if (body[field] !== undefined) {
      values[field] = field === 'dayOfWeek' && typeof body[field] === 'string'
        ? body[field].trim().toLowerCase()
        : (['openingTime', 'closingTime', 'breakStart', 'breakEnd'].includes(field) && body[field] === ''
          ? null
          : body[field]);
    }
  }
  return values;
}

async function getWeeklyAvailability(_req, res, next) {
  try {
    const availability = await SalonAvailability.find().sort({
      dayOfWeek: 1,
    });
    const dayOrder = new Map(DAYS_OF_WEEK.map((day, index) => [day, index]));
    availability.sort((a, b) => dayOrder.get(a.dayOfWeek) - dayOrder.get(b.dayOfWeek));
    return res.status(200).json({ availability });
  } catch (error) {
    return next(error);
  }
}

async function createAvailability(req, res, next) {
  const body = req.body || {};
  const values = getEditableValues(body);
  if (values.isOpen === undefined) values.isOpen = true;
  if (values.dayOfWeek === undefined) {
    return res.status(400).json({ message: 'dayOfWeek is required.' });
  }

  const errors = validateSchedule(values);
  if (errors.length) {
    return res.status(400).json({ message: 'Invalid salon availability.', errors });
  }

  try {
    const availability = await SalonAvailability.create(values);
    return res.status(201).json({ availability });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Availability for this weekday already exists.' });
    }
    if (error.name === 'ValidationError' || error.name === 'CastError') {
      return res.status(400).json({ message: error.message });
    }
    return next(error);
  }
}

async function updateAvailability(req, res, next) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid availability ID.' });
  }

  const values = getEditableValues(req.body || {});
  if (Object.keys(values).length === 0) {
    return res.status(400).json({ message: 'Provide at least one availability field to update.' });
  }

  try {
    const availability = await SalonAvailability.findById(req.params.id);
    if (!availability) {
      return res.status(404).json({ message: 'Availability record not found.' });
    }

    const updatedValues = { ...availability.toObject(), ...values };
    const errors = validateSchedule(updatedValues);
    if (errors.length) {
      return res.status(400).json({ message: 'Invalid salon availability.', errors });
    }

    Object.assign(availability, values);
    await availability.save();
    return res.status(200).json({ availability });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Availability for this weekday already exists.' });
    }
    if (error.name === 'ValidationError' || error.name === 'CastError') {
      return res.status(400).json({ message: error.message });
    }
    return next(error);
  }
}

async function deleteAvailability(req, res, next) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid availability ID.' });
  }

  try {
    const availability = await SalonAvailability.findByIdAndDelete(req.params.id);
    if (!availability) {
      return res.status(404).json({ message: 'Availability record not found.' });
    }
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

module.exports = { getWeeklyAvailability, createAvailability, updateAvailability, deleteAvailability };
