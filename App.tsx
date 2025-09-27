
import React, { useState, useEffect, useCallback } from 'react';
import { User } from './types';
import { verifyAccessCode, isUserAdmin, initializeDB, getUserById } from './services/dbService';
import WelcomeScreen from './components/auth/WelcomeScreen';
import AdminView from './components/admin/AdminView';
import UserView from './components/user/UserView';
import { Loader } from './components/common/Loader';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    initializeDB();
    
    const storedUserId = localStorage.getItem('userId');
    if (storedUserId) {
      const userId = parseInt(storedUserId, 10);
      if (!isNaN(userId)) {
        const user = verifyAccessCode(String(userId), true);
        if (user) {
          setCurrentUser(user);
          setIsAdmin(isUserAdmin(user.user_id));
        } else {
          // If the stored user ID is invalid (e.g., user deleted), clear it.
          localStorage.removeItem('userId');
        }
      } else {
        // If the stored ID isn't even a number, clear it.
        localStorage.removeItem('userId');
      }
    }
    setIsLoading(false);
  }, []);

  const handleLogin = useCallback((code: string): boolean => {
    setError('');
    setIsLoading(true);
    const user = verifyAccessCode(code);
    if (user) {
      setCurrentUser(user);
      const adminStatus = isUserAdmin(user.user_id);
      setIsAdmin(adminStatus);
      localStorage.setItem('userId', String(user.user_id));
      setIsLoading(false);
      return true;
    } else {
      setError('کد دسترسی یا رمز عبور نامعتبر است. لطفاً دوباره تلاش کنید.');
      setIsLoading(false);
      return false;
    }
  }, []);

  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    setIsAdmin(false);
    localStorage.removeItem('userId');
  }, []);
  
  const handleUserUpdate = useCallback(() => {
    setCurrentUser(prevUser => {
        if (!prevUser) return null;
        const updatedUser = getUserById(prevUser.user_id);
        return updatedUser || prevUser; // Keep old user data if update fails
    });
  }, []);


  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <Loader />
      </div>
    );
  }

  if (!currentUser) {
    return <WelcomeScreen onLogin={handleLogin} error={error} setError={setError} />;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {isAdmin ? (
        <AdminView user={currentUser} onLogout={handleLogout} />
      ) : (
        <UserView user={currentUser} onLogout={handleLogout} onUserUpdate={handleUserUpdate} />
      )}
    </div>
  );
};

export default App;
