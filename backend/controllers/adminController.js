const User = require('../models/User');
const Feedback = require('../models/Feedback');

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({ attributes: { exclude: ['password'] }, order: [['createdAt', 'DESC']] });
    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getAllFeedbacks = async (req, res) => {
  try {
    const feedbacks = await Feedback.findAll({ order: [['createdAt', 'DESC']] });
    res.status(200).json(feedbacks);
  } catch (error) {
    console.error('Error fetching feedbacks:', error.message);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
