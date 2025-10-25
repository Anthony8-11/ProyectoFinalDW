const supabase = require('../config/supabase');

class AuthService {
  // Sign up a new user
  async signUp(email, password, userData = {}) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData,
        },
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    }
  }

  // Sign in a user
  async signIn(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  }

  // Sign out a user
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { message: 'Signed out successfully' };
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }

  // Get current user
  async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      return user;
    } catch (error) {
      console.error('Error getting current user:', error);
      throw error;
    }
  }

  // Verify JWT token (for middleware)
  async verifyToken(token) {
    try {
      const { data, error } = await supabase.auth.getUser(token);
      if (error) throw error;
      return data.user;
    } catch (error) {
      console.error('Error verifying token:', error);
      throw error;
    }
  }
}

module.exports = new AuthService();