const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Service name is required.'],
      trim: true,
      minlength: [1, 'Service name cannot be empty.'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    duration: {
      type: Number,
      required: [true, 'Service duration is required.'],
      min: [1, 'Service duration must be at least 1 minute.'],
      validate: {
        validator: Number.isInteger,
        message: 'Service duration must be a whole number of minutes.',
      },
    },
    price: {
      type: Number,
      required: [true, 'Service price is required.'],
      min: [0, 'Service price cannot be negative.'],
    },
    image: {
      type: String,
      trim: true,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Service', serviceSchema);
