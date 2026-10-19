const express = require('express');
const router = express.Router();
const {
  createItem,
  getItems,
  getItemById,
  updateItem,
  deleteItem,
} = require('../controllers/itemController');

/**
 * Routes for /api/items
 * 
 * Express Router allows grouping related endpoints together.
 * We can chain HTTP methods (.get(), .post(), etc.) on the same URL path.
 */

// Root collection route: /api/items
router
  .route('/')
  .get(getItems)       // GET /api/items (supports ?search=..., ?category=..., ?location=..., ?type=..., ?status=...)
  .post(createItem);   // POST /api/items (create a new report)

// Single item resource route: /api/items/:id
router
  .route('/:id')
  .get(getItemById)    // GET /api/items/:id (retrieve one item)
  .put(updateItem)     // PUT /api/items/:id (update item details or status)
  .delete(deleteItem); // DELETE /api/items/:id (remove an item report)

module.exports = router;
