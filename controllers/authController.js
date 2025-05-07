const axios = require('axios');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');


const signupUser = async (req, res) => {
    try {
        const { name, email, password } = req.body; 

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Create new user
        const newUser = new User({ name, email, password });
        await newUser.save();

        res.status(201).json({ message: 'User signed up successfully!' });
    } catch (error) {
        console.error('Signup error:', error.message);
        res.status(500).json({ message: 'Signup failed!' });
    }
};


const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        if (password !== user.password) {
            return res.status(401).json({ message: 'Invalid email or password' });
          }

        // Create JWT Token
        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.status(200).json({
            message: 'Login successful!',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Login error:', error.message);
        res.status(500).json({ message: 'Login failed!' });
    }
};


const FormData = require('form-data');

const uploadDocument = async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      console.log(req.user);
      const userEmail = req.user.email; // ✅ NOT req.body.email — use req.query.email
      console.log(userEmail);
      if (!userEmail) {
        return res.status(400).json({ message: 'User email missing' });
      }
  
      const formData = new FormData();
      formData.append('file', req.file.buffer, req.file.originalname);
      formData.append('userId', userEmail);
      formData.append('policyType', 'Health');
  
      const response = await axios.post('https://cuddly-carpets-camp.loca.lt/api/upload', formData, {
        headers: formData.getHeaders(),
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      });
  
      const user = await User.findOne({ email: userEmail });
  
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      user.documents.push(req.file.originalname);
      await user.save();
  
      res.status(200).json({ message: 'Document uploaded and saved successfully', data: response.data });
  
    } catch (error) {
      console.error('Upload error:', error.message);
      res.status(500).json({ message: 'Document upload failed' });
    }
  };
  
  

const chatWithAI = async (req, res) => {
    try {
      const { message, conversationId, token } = req.body;
      console.log(token);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.id; // ✅ Assuming token payload has "id" field

    // ✅ Now find user by _id
    const user = await User.findById(userId);
    console.log("**********************");
    console.log(user);

    if (!user) {
      return res.status(404).json({ reply: 'User not found' });
    }

    const userEmail = user.email; // ✅ Finally got the email
    console.log('User Email:', userEmail);
      if (!message) {
        return res.status(400).json({ reply: 'Message is required' });
      }





      let conv;
      conv = await Conversation.findOne({ conversationId });
      console.log(conv);
      console.log(typeof(conv));
        const apiResponse = await axios.post('https://cuddly-carpets-camp.loca.lt/api/query', {
          query: message,
          userId: userEmail,      // Hardcoded user for now
          policyType: "Health", // Hardcoded policy type for now
          pastQ: conv
        });
  
      // // Call your REAL API
      // const apiResponse = await axios.post('https://wide-rats-taste.loca.lt/api/query', {
      //   query: message,
      //   userId: userEmail,      // Hardcoded user for now
      //   policyType: "Health" // Hardcoded policy type for now
      // });
  
      const aiReply = apiResponse.data.answer || 'No response from AI.';
  
      if (conversationId) {
        conv = await Conversation.findOne({ conversationId });
        if (conv) {
          conv.messages.push({ sender: 'user', text: message, timestamp: new Date() });
          conv.messages.push({ sender: 'bot', text: aiReply, timestamp: new Date() });
          await conv.save();
        } else {
          return res.status(404).json({ reply: 'Conversation not found!' });
        }
      } else {
        const newConversationId = uuidv4();
        conv = new Conversation({
          conversationId: newConversationId,
          user: userEmail,
          messages: [
            { sender: 'user', text: message, timestamp: new Date() },
            { sender: 'bot', text: aiReply, timestamp: new Date() }
          ]
        });
        await conv.save();
      }
  
      res.status(200).json({
        reply: aiReply,
        conversationId: conv.conversationId
      });
  
    } catch (error) {
      console.error('Chat error:', error.message);
      res.status(500).json({ reply: 'Sorry, something went wrong' });
    }
  };
  
  
  


// Fetch only conversations belonging to logged-in user
const getAllConversations = async (req, res) => {
  console.log("####");
  const { token } = req.body;
  console.log(token);
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.id; // ✅ Assuming token payload has "id" field

    // ✅ Now find user by _id
    const user = await User.findById(userId);
    try {
      const conversations = await Conversation.find({user: user.email}, 'conversationId createdAt').sort({ createdAt: -1});
      res.status(200).json(conversations);
    } catch (error) {
      console.error('Get conversations error:', error.message);
      res.status(500).json({ message: 'Failed to fetch conversations' });
    }
  };
  
  

// Fetch full conversation by ID and user
const getConversationById = async (req, res) => {
    try {
      const conversationId = req.params.id;
  
      const conversation = await Conversation.findOne({ conversationId });
  
      if (!conversation) {
        return res.status(404).json({ message: 'Conversation not found' });
      }
  
      res.status(200).json(conversation);
    } catch (error) {
      console.error('Get conversation by id error:', error.message);
      res.status(500).json({ message: 'Failed to fetch conversation' });
    }
  };
  

const getProfile = async (req, res) => {
    try {
      const userId = req.user._id; // Securely extract user ID from token
      console.log(req.user);
      const user = await User.findById(userId);
  
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      res.status(200).json({
        name: user.name,
        email: user.email,
        documents: user.documents || [],
      });
    } catch (error) {
      console.error('Profile fetch error:', error.message);
      res.status(500).json({ message: 'Failed to fetch profile' });
    }
  };
  


module.exports = { signupUser, loginUser, uploadDocument, chatWithAI, getAllConversations, getConversationById, getProfile };
