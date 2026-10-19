const mongoose = require('mongoose');

/**
 * Item Schema Definition
 * 
 * In Mongoose, a Schema defines the shape of documents inside a MongoDB collection.
 * It enforces data types, default values, validators, and indexing.
 */
const itemSchema = new mongoose.Schema(
  {
    // The type of report: whether the student lost an item or found someone else's
    type: {
      type: String,
      required: [true, 'Please specify if the item is lost or found'],
      enum: {
        values: ['lost', 'found'],
        message: '{VALUE} is not a valid item type. Must be either "lost" or "found".',
      },
      lowercase: true,
      trim: true,
    },

    // Name or title of the item (e.g. "Hydro Flask Water Bottle")
    title: {
      type: String,
      required: [true, 'Please provide an item title/name'],
      trim: true,
      minlength: [2, 'Title must be at least 2 characters long'],
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },

    // Detailed description (e.g., color, brand, distinct marks, stickers)
    description: {
      type: String,
      required: [true, 'Please provide an item description'],
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },

    // Standardized campus category for quick filtering
    category: {
      type: String,
      required: [true, 'Please select a category'],
      trim: true,
      enum: {
        values: [
          'Electronics',
          'Books & Stationery',
          'ID & Cards',
          'Clothing & Accessories',
          'Keys',
          'Bags & Backpacks',
          'Other',
        ],
        message: '{VALUE} is not a supported category',
      },
    },

    // Campus location where the item was lost or found
    location: {
      type: String,
      required: [true, 'Please specify the campus location'],
      trim: true,
      maxlength: [100, 'Location cannot exceed 100 characters'],
    },

    // Current resolution status of the report
    status: {
      type: String,
      enum: {
        values: ['open', 'claimed', 'resolved'],
        message: '{VALUE} is not a valid status',
      },
      default: 'open',
      lowercase: true,
      trim: true,
    },

    // Date when the item was lost or found
    date: {
      type: Date,
      default: Date.now,
    },

    // Reporter contact information
    contactName: {
      type: String,
      required: [true, 'Please provide contact person name'],
      trim: true,
    },

    contactEmail: {
      type: String,
      required: [true, 'Please provide contact email'],
      trim: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address',
      ],
    },

    contactPhone: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    // Automatically creates `createdAt` and `updatedAt` timestamps
    timestamps: true,
  }
);

// Optional index for efficient searching on title and description
itemSchema.index({ title: 'text', description: 'text' });

const Item = mongoose.model('Item', itemSchema);

module.exports = Item;
