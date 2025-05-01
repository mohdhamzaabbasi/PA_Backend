const express = require('express');
const multer = require('multer');
const { signupUser, loginUser, uploadDocument, chatWithAI, getAllConversations, getConversationById, getProfile } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware'); // Import protect!

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() }); // ✅ use memory storage



router.post('/signup', signupUser);
router.post('/login', loginUser);
router.post('/chat', chatWithAI);
router.get('/conversations', getAllConversations);
router.get('/conversations/:id', getConversationById);
router.get('/profile', protect, getProfile);


router.post('/upload-documents',protect, upload.single('document'), uploadDocument);



module.exports = router;




