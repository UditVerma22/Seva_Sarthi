const mongoose = require('mongoose');
const Service = require('../models/Service');
const User = require('../models/User');
const Provider = require('../models/Provider');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// @desc    List all services (filtered by city if provided) — only approved
// @route   GET /api/services
// @access  Public
const getAllServices = asyncHandler(async (req, res) => {
  const { category, city, search } = req.query;
  const query = { isActive: true, approvalStatus: 'approved' };
  if (category) query.category = category;

  // Word-boundary search — prevents "ac" from matching "machine"
  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const r = new RegExp(`(?:^|[\\s\\-_/,&()])${escaped}`, 'i');
    query.$or = [{ name: r }, { description: r }, { category: r }];
  }

  let services = await Service.find(query).sort({ category: 1, name: 1 }).populate('providerId', 'name avatar');

  if (city) {
    // Check Provider schema city
    const providersInCity = await Provider.find({ 
      city: { $regex: new RegExp(`^${city}$`, 'i') }
    }).select('userId');
    
    // Check User schema address.city
    const usersInCity = await User.find({
      role: 'provider',
      'address.city': { $regex: new RegExp(`^${city}$`, 'i') }
    }).select('_id');
    
    const userIds = [
      ...providersInCity.map(p => p.userId),
      ...usersInCity.map(u => u._id)
    ];

    if (userIds.length > 0) {
      services = services.filter(service => 
        service.providerId && userIds.some(id => id.equals(service.providerId._id || service.providerId))
      );
    } else {
      services = [];
    }
  }

  res.status(200).json(
    new ApiResponse(200, { services }, 'Services retrieved.')
  );
});

// @desc    Get single service
// @route   GET /api/services/:id
// @access  Public
const getService = asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id);
  if (!service) throw new ApiError(404, 'Service not found.');

  res.status(200).json(
    new ApiResponse(200, { service }, 'Service retrieved.')
  );
});

// @desc    Get provider's own services (all statuses)
// @route   GET /api/services/my-services
// @access  Private (Provider)
const getMyServices = asyncHandler(async (req, res) => {
  const services = await Service.find({ providerId: req.user._id }).sort({ createdAt: -1 });
  res.status(200).json(
    new ApiResponse(200, { services }, 'Your services retrieved.')
  );
});

// @desc    Create a service (provider) — starts as pending
// @route   POST /api/services
// @access  Private (Provider)
const createService = asyncHandler(async (req, res) => {
  const { name, category, description, icon, basePrice, image, workingHours } = req.body;

  if (!name || !category || basePrice === undefined) {
    throw new ApiError(422, 'Name, category, and base price are required.');
  }

  const service = await Service.create({
    name,
    category,
    description: description || '',
    icon: icon || 'home_repair_service',
    basePrice,
    image: image || '',
    providerId: req.user._id,
    isActive: true,
    approvalStatus: 'pending',
    workingHours: workingHours || { start: '09:00', end: '18:00' },
  });

  res.status(201).json(
    new ApiResponse(201, { service }, 'Service created. It will be visible after admin approval.')
  );
});

// @desc    Update a service
// @route   PUT /api/services/:id
// @access  Private (Provider)
const updateService = asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id);
  if (!service) throw new ApiError(404, 'Service not found.');

  if (service.providerId && service.providerId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Not authorized to update this service.');
  }

  const allowedFields = ['name', 'category', 'description', 'icon', 'basePrice', 'image', 'isActive', 'workingHours'];
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      service[field] = req.body[field];
    }
  });

  await service.save();

  res.status(200).json(
    new ApiResponse(200, { service }, 'Service updated.')
  );
});

// @desc    Toggle service active status
// @route   PUT /api/services/:id/toggle-active
// @access  Private (Provider)
const toggleServiceActive = asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id);
  if (!service) throw new ApiError(404, 'Service not found.');

  if (service.providerId && service.providerId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Not authorized.');
  }

  service.isActive = !service.isActive;
  await service.save();

  res.status(200).json(
    new ApiResponse(200, { service }, `Service ${service.isActive ? 'activated' : 'deactivated'}.`)
  );
});

// @desc    Delete a service
// @route   DELETE /api/services/:id
// @access  Private (Provider)
const deleteService = asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id);
  if (!service) throw new ApiError(404, 'Service not found.');

  if (service.providerId && service.providerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ApiError(403, 'Not authorized.');
  }

  await service.deleteOne();
  res.status(200).json(
    new ApiResponse(200, null, 'Service deleted.')
  );
});

module.exports = {
  getAllServices,
  getService,
  getMyServices,
  createService,
  updateService,
  toggleServiceActive,
  deleteService,
};
