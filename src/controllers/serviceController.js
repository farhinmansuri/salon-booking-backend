const mongoose = require('mongoose');
const Service = require('../models/Service');

const requiredFields = ['name', 'price', 'duration'];
const editableFields = ['name', 'description', 'duration', 'price', 'image', 'isActive'];

function validateFields(body, { requireAll = false } = {}) {
  const errors = [];

  if (requireAll) {
    for (const field of requiredFields) {
      if (body[field] === undefined || body[field] === null || body[field] === '') {
        errors.push(`${field} is required.`);
      }
    }
  }

  if (body.name !== undefined && (typeof body.name !== 'string' || !body.name.trim())) {
    errors.push('name must be a non-empty string.');
  }

  if (body.price !== undefined &&
      (typeof body.price !== 'number' || !Number.isFinite(body.price) || body.price < 0)) {
    errors.push('price must be a number greater than or equal to 0.');
  }

  if (body.duration !== undefined &&
      (!Number.isInteger(body.duration) || body.duration < 1)) {
    errors.push('duration must be a positive whole number of minutes.');
  }

  if (body.description !== undefined && typeof body.description !== 'string') {
    errors.push('description must be a string.');
  }

  if (body.image !== undefined && typeof body.image !== 'string') {
    errors.push('image must be a string.');
  }

  if (body.isActive !== undefined && typeof body.isActive !== 'boolean') {
    errors.push('isActive must be a boolean.');
  }

  return errors;
}

function validId(id) {
  return mongoose.isValidObjectId(id);
}

async function listActiveServices(_req, res, next) {
  try {
    const services = await Service.find({ isActive: true }).sort({ name: 1 });
    return res.status(200).json({ services });
  } catch (error) {
    return next(error);
  }
}

async function getActiveService(req, res, next) {
  if (!validId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid service ID.' });
  }

  try {
    const service = await Service.findOne({ _id: req.params.id, isActive: true });
    if (!service) {
      return res.status(404).json({ message: 'Service not found.' });
    }
    return res.status(200).json({ service });
  } catch (error) {
    return next(error);
  }
}

async function createService(req, res, next) {
  const body = req.body || {};
  const errors = validateFields(body, { requireAll: true });
  if (errors.length) {
    return res.status(400).json({ message: 'Invalid service data.', errors });
  }

  const serviceData = {};
  for (const field of editableFields) {
    if (body[field] !== undefined) serviceData[field] = body[field];
  }

  try {
    const service = await Service.create(serviceData);
    return res.status(201).json({ service });
  } catch (error) {
    if (error.name === 'ValidationError' || error.name === 'CastError') {
      return res.status(400).json({ message: error.message });
    }
    return next(error);
  }
}

async function updateService(req, res, next) {
  if (!validId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid service ID.' });
  }

  const body = req.body || {};
  const serviceData = {};
  for (const field of editableFields) {
    if (body[field] !== undefined) serviceData[field] = body[field];
  }

  if (Object.keys(serviceData).length === 0) {
    return res.status(400).json({ message: 'Provide at least one service field to update.' });
  }

  const errors = validateFields(serviceData);
  if (errors.length) {
    return res.status(400).json({ message: 'Invalid service data.', errors });
  }

  try {
    const service = await Service.findByIdAndUpdate(req.params.id, serviceData, {
      new: true,
      runValidators: true,
    });
    if (!service) {
      return res.status(404).json({ message: 'Service not found.' });
    }
    return res.status(200).json({ service });
  } catch (error) {
    if (error.name === 'ValidationError' || error.name === 'CastError') {
      return res.status(400).json({ message: error.message });
    }
    return next(error);
  }
}

async function deleteService(req, res, next) {
  if (!validId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid service ID.' });
  }

  try {
    const service = await Service.findByIdAndDelete(req.params.id);
    if (!service) {
      return res.status(404).json({ message: 'Service not found.' });
    }
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listActiveServices,
  getActiveService,
  createService,
  updateService,
  deleteService,
};
