const Tool = require('../models/Tool');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

const getAllTools = asyncHandler(async (req, res) => {
  const { category, search, status, city, page = 1, limit = 20 } = req.query;
  const query = {};
  if (category && category !== 'All') query.category = category;
  if (status) query.status = status;
  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const r = new RegExp(`(?:^|[\\s\\-_/,&()])${escaped}`, 'i');
    query.$or = [{ name: r }, { description: r }];
  }

  // Industry-level filtering: If city is provided, only return tools whose owners are in that city
  if (city) {
    const User = require('../models/User');
    const usersInCity = await User.find({ 
      'address.city': { $regex: new RegExp(`^${city}$`, 'i') }
    }).select('_id');
    
    const userIds = usersInCity.map(u => u._id);
    if (userIds.length > 0) {
      query.ownerId = { $in: userIds };
    } else {
      // Force empty result if no users in this city
      query.ownerId = null;
    }
  }

  const total = await Tool.countDocuments(query);
  const tools = await Tool.find(query).populate('ownerId', 'name').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit));
  res.status(200).json(new ApiResponse(200, { tools, pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) } }, 'Tools retrieved.'));
});

const getTool = asyncHandler(async (req, res) => {
  const tool = await Tool.findById(req.params.id).populate('ownerId', 'name phone');
  if (!tool) throw new ApiError(404, 'Tool not found.');
  res.status(200).json(new ApiResponse(200, { tool }, 'Tool retrieved.'));
});

const createTool = asyncHandler(async (req, res) => {
  const { name, description, category, condition, dailyRate, image } = req.body;
  const tool = await Tool.create({ name, description: description || '', category, condition: condition || 'Good', dailyRate, image: image || '', ownerId: req.user._id });
  res.status(201).json(new ApiResponse(201, { tool }, 'Tool listed successfully.'));
});

const updateTool = asyncHandler(async (req, res) => {
  const tool = await Tool.findById(req.params.id);
  if (!tool) throw new ApiError(404, 'Tool not found.');
  if (tool.ownerId.toString() !== req.user._id.toString()) throw new ApiError(403, 'Not authorized.');
  ['name', 'description', 'category', 'condition', 'dailyRate', 'image', 'status'].forEach(f => { if (req.body[f] !== undefined) tool[f] = req.body[f]; });
  await tool.save();
  res.status(200).json(new ApiResponse(200, { tool }, 'Tool updated.'));
});

const deleteTool = asyncHandler(async (req, res) => {
  const tool = await Tool.findById(req.params.id);
  if (!tool) throw new ApiError(404, 'Tool not found.');
  if (tool.ownerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') throw new ApiError(403, 'Not authorized.');
  await tool.deleteOne();
  res.status(200).json(new ApiResponse(200, null, 'Tool deleted.'));
});

const getMyTools = asyncHandler(async (req, res) => {
  const tools = await Tool.find({ ownerId: req.user._id }).sort({ createdAt: -1 });
  res.status(200).json(new ApiResponse(200, { tools }, 'Your tools retrieved.'));
});

// @desc    Toggle tool status (available / maintenance)
// @route   PUT /api/tools/:id/toggle-status
// @access  Private (Provider)
const toggleToolStatus = asyncHandler(async (req, res) => {
  const tool = await Tool.findById(req.params.id);
  if (!tool) throw new ApiError(404, 'Tool not found.');
  if (tool.ownerId.toString() !== req.user._id.toString()) throw new ApiError(403, 'Not authorized.');

  // Toggle between available and maintenance
  tool.status = tool.status === 'available' ? 'maintenance' : 'available';
  await tool.save();

  res.status(200).json(
    new ApiResponse(200, { tool }, `Tool ${tool.status === 'available' ? 'activated' : 'deactivated'}.`)
  );
});

module.exports = { getAllTools, getTool, createTool, updateTool, deleteTool, getMyTools, toggleToolStatus };
