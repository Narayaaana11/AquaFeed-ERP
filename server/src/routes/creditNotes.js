const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { roleGuard } = require('../middleware/roleGuard');
const { createCreditNote, getCreditNotes, getCreditNote } = require('../controllers/creditNoteController');

router.use(protect);

router.get('/', getCreditNotes);
router.get('/:id', getCreditNote);
router.post('/', roleGuard('Owner', 'Manager', 'Accountant'), createCreditNote);

module.exports = router;
