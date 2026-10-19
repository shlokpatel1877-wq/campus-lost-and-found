const mongoose = require('mongoose');
const Item = require('../models/Item');

/**
 * Controller functions handle incoming HTTP requests, interact with the database
 * via the Mongoose model, and return formatted HTTP responses.
 */

// Helper function to escape special characters for regex search safely
const escapeRegex = (text) => {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
};

/**
 * @desc    Report a new lost or found item
 * @route   POST /api/items
 * @access  Public
 */
const createItem = async (req, res, next) => {
  try {
    const {
      type,
      title,
      description,
      category,
      location,
      contactName,
      contactEmail,
      contactPhone,
      date,
    } = req.body;

    // Explicit manual validation for required fields to provide clear user feedback
    const requiredFields = ['type', 'title', 'description', 'category', 'location', 'contactName', 'contactEmail'];
    const missingFields = requiredFields.filter((field) => !req.body[field] || req.body[field].toString().trim() === '');

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required field(s): ${missingFields.join(', ')}`,
      });
    }

    // Create the item document in MongoDB
    const newItem = await Item.create({
      type,
      title,
      description,
      category,
      location,
      contactName,
      contactEmail,
      contactPhone,
      date: date || Date.now(),
    });

    // 201 Created indicates successful resource creation
    return res.status(201).json({
      success: true,
      message: 'Item report created successfully',
      data: newItem,
    });
  } catch (error) {
    // Forward error to centralized error handler middleware
    next(error);
  }
};

/**
 * @desc    Get all items with search, filter, and sort capabilities
 * @route   GET /api/items
 * @access  Public
 */
const getItems = async (req, res, next) => {
  try {
    const { search, category, location, type, status, sortBy = 'createdAt', order = 'desc' } = req.query;

    // Build dynamic query filter object
    const filter = {};

    // 1. Search by name (title) or description
    if (search && search.trim() !== '') {
      const sanitized = escapeRegex(search.trim());
      filter.$or = [
        { title: { $regex: sanitized, $options: 'i' } },
        { description: { $regex: sanitized, $options: 'i' } },
      ];
    }

    // 2. Filter by category
    if (category && category.trim() !== '') {
      filter.category = category.trim();
    }

    // 3. Filter by location (case-insensitive substring match)
    if (location && location.trim() !== '') {
      filter.location = { $regex: escapeRegex(location.trim()), $options: 'i' };
    }

    // 4. Filter by type (lost / found)
    if (type && type.trim() !== '') {
      filter.type = type.trim().toLowerCase();
    }

    // 5. Filter by status (open / claimed / resolved)
    if (status && status.trim() !== '') {
      filter.status = status.trim().toLowerCase();
    }

    // Sort order: 1 for ascending, -1 for descending (newest first by default)
    const sortDirection = order.toLowerCase() === 'asc' ? 1 : -1;
    const sortOptions = { [sortBy]: sortDirection };

    const items = await Item.find(filter).sort(sortOptions);

    return res.status(200).json({
      success: true,
      count: items.length,
      data: items,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single item by ID
 * @route   GET /api/items/:id
 * @access  Public
 */
const getItemById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate if the ID is a valid MongoDB 24-character hex ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ID format: "${id}". Must be a valid 24-character hexadecimal string.`,
      });
    }

    const item = await Item.findById(id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: `Item not found with id: ${id}`,
      });
    }

    return res.status(200).json({
      success: true,
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update an item report (e.g. status, details)
 * @route   PUT /api/items/:id
 * @access  Public
 */
const updateItem = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ID format: "${id}".`,
      });
    }

    // Validate status value if provided in body
    if (req.body.status) {
      const allowedStatuses = ['open', 'claimed', 'resolved'];
      const normalizedStatus = req.body.status.toLowerCase().trim();
      if (!allowedStatuses.includes(normalizedStatus)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status "${req.body.status}". Allowed values: ${allowedStatuses.join(', ')}.`,
        });
      }
      req.body.status = normalizedStatus;
    }

    // returnDocument: 'after' returns the modified document, runValidators ensures schema rules run on updates
    const updatedItem = await Item.findByIdAndUpdate(id, req.body, {
      returnDocument: 'after',
      runValidators: true,
    });

    if (!updatedItem) {
      return res.status(404).json({
        success: false,
        message: `Item not found with id: ${id}`,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Item updated successfully',
      data: updatedItem,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete an item report
 * @route   DELETE /api/items/:id
 * @access  Public
 */
const deleteItem = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ID format: "${id}".`,
      });
    }

    const item = await Item.findByIdAndDelete(id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: `Item not found with id: ${id}`,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Item report deleted successfully',
      data: { id: item._id, title: item.title },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createItem,
  getItems,
  getItemById,
  updateItem,
  deleteItem,
};
