const mongoose = require('mongoose');

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const DAYS_OF_WEEK = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const salonAvailabilitySchema = new mongoose.Schema(
  {
    dayOfWeek: {
      type: String,
      enum: DAYS_OF_WEEK,
      required: [true, 'Day of week is required.'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    isOpen: {
      type: Boolean,
      required: true,
      default: true,
    },
    openingTime: {
      type: String,
      default: null,
      match: [TIME_PATTERN, 'Opening time must use 24-hour HH:mm format.'],
    },
    closingTime: {
      type: String,
      default: null,
      match: [TIME_PATTERN, 'Closing time must use 24-hour HH:mm format.'],
    },
    breakStart: {
      type: String,
      default: null,
      match: [TIME_PATTERN, 'Break start must use 24-hour HH:mm format.'],
    },
    breakEnd: {
      type: String,
      default: null,
      match: [TIME_PATTERN, 'Break end must use 24-hour HH:mm format.'],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SalonAvailability', salonAvailabilitySchema);
