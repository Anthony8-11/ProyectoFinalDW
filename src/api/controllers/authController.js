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
      // Return user and session (if available) so the frontend can store access token immediately
      res.status(201).json({
        message: 'User created successfully',
        user: result.user,
        session: result.session || null,
      });
    } catch (error) {
      console.error('Error signing up:', error);
      // Detect common "email already exists" errors from Supabase/Postgres
      const msg = (error && error.message) ? String(error.message).toLowerCase() : '';
      if (msg.includes('already') || msg.includes('duplicate') || msg.includes('user already') || error?.status === 409) {
        return res.status(409).json({ error: 'El correo ya existe, utiliza otro' });
      }

      res.status(500).json({ error: 'Failed to sign up' });
    }
  }

  // Sign in a user
  async signIn(req, res) {
    try {
      // Defensive checks: ensure authService.signIn exists and is not aliased to signUp
      if (typeof authService.signIn !== 'function') {
        console.error('authService.signIn is not a function. authService keys:', Object.keys(authService));
        return res.status(500).json({ error: 'Server misconfiguration: signIn handler missing' });
      }
      if (authService.signIn === authService.signUp) {
        console.error('authService.signIn is pointing to authService.signUp — possible miswire in service exports');
        return res.status(500).json({ error: 'Server misconfiguration: signIn handler misassigned' });
      }

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