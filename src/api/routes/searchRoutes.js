const express = require('express');
const SearchController = require('../controllers/searchController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', authMiddleware.authenticate, SearchController.handleSearch);

module.exports = router;