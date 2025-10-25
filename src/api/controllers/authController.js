const authService = require('../../services/authService');

class AuthController {
  // Sign up a new user
  async signUp(req, res) {
    try {
      const { email, password, name, role } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const userData = { name, role };
      const result = await authService.signUp(email, password, userData);
      res.status(201).json({
        message: 'User created successfully',
        user: result.user,
      });
    } catch (error) {
      console.error('Error signing up:', error);
      res.status(500).json({ error: 'Failed to sign up' });
    }
  }

  // Sign in a user
  async signIn(req, res) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const result = await authService.signIn(email, password);
      res.json({
        message: 'Signed in successfully',
        user: result.user,
        session: result.session,
      });
    } catch (error) {
      console.error('Error signing in:', error);
      res.status(500).json({ error: 'Failed to sign in' });
    }
  }

  // Sign out a user
  async signOut(req, res) {
    try {
      await authService.signOut();
      res.json({ message: 'Signed out successfully' });
    } catch (error) {
      console.error('Error signing out:', error);
      res.status(500).json({ error: 'Failed to sign out' });
    }
  }

  // Get current user
  async getCurrentUser(req, res) {
    try {
      const user = await authService.getCurrentUser();
      res.json({ user });
    } catch (error) {
      console.error('Error getting current user:', error);
      res.status(500).json({ error: 'Failed to get current user' });
    }
  }
}

module.exports = new AuthController();