import React, { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { Coins, PiggyBank, ArrowUpRight, ArrowDownRight, Users, Shield } from 'lucide-react';
import { db } from './lib/db';
import toast from 'react-hot-toast';

interface Transaction {
  id: string;
  amount: number;
  description: string;
  created_at: string;
}

interface Profile {
  username: string;
  points_balance: number;
  is_admin: boolean;
}

interface User {
  id: string;
  username: string;
  points_balance: number;
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    if (storedUserId) {
      setUserId(storedUserId);
      setIsLoggedIn(true);
      fetchUserData(storedUserId);
    }
  }, []);

  const fetchUserData = async (uid: string) => {
    try {
      // Fetch profile
      const profileResult = await db.execute({
        sql: 'SELECT username, points_balance, is_admin FROM users WHERE id = ?',
        args: [uid]
      });
      
      if (profileResult.rows[0]) {
        setProfile({
          username: profileResult.rows[0].username as string,
          points_balance: profileResult.rows[0].points_balance as number,
          is_admin: profileResult.rows[0].is_admin as boolean
        });

        // If admin, fetch all users
        if (profileResult.rows[0].is_admin) {
          const usersResult = await db.execute({
            sql: 'SELECT id, username, points_balance FROM users WHERE id != ?',
            args: [uid]
          });
          
          setUsers(usersResult.rows.map(row => ({
            id: row.id as string,
            username: row.username as string,
            points_balance: row.points_balance as number
          })));
        }
      }

      // Fetch transactions
      const transactionsResult = await db.execute({
        sql: 'SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC',
        args: [uid]
      });

      setTransactions(transactionsResult.rows.map(row => ({
        id: row.id as string,
        amount: row.amount as number,
        description: row.description as string,
        created_at: row.created_at as string
      })));
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast.error('Failed to load user data');
    }
  };

  const handleTransaction = async (type: 'deposit' | 'withdraw', targetUserId?: string) => {
    const userToUpdate = targetUserId || userId;
    if (!userToUpdate || !amount || !description) {
      toast.error('Please fill in all fields');
      return;
    }

    const pointsAmount = parseInt(amount);
    if (isNaN(pointsAmount) || pointsAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    const finalAmount = type === 'withdraw' ? -pointsAmount : pointsAmount;

    try {
      const transactionId = crypto.randomUUID();
      
      await db.transaction(async (tx) => {
        await tx.execute({
          sql: 'INSERT INTO transactions (id, user_id, amount, description) VALUES (?, ?, ?, ?)',
          args: [transactionId, userToUpdate, finalAmount, description]
        });

        await tx.execute({
          sql: 'UPDATE users SET points_balance = points_balance + ? WHERE id = ?',
          args: [finalAmount, userToUpdate]
        });
      });

      toast.success('Transaction successful!');
      fetchUserData(userId!);
      setAmount('');
      setDescription('');
    } catch (error) {
      console.error('Transaction failed:', error);
      toast.error('Transaction failed');
    }
  };

  const handleSignIn = async () => {
    try {
      const result = await db.execute({
        sql: 'SELECT id, username, is_admin FROM users WHERE username = ? AND password = ?',
        args: [username, password]
      });

      if (result.rows[0]) {
        const uid = result.rows[0].id as string;
        setUserId(uid);
        setIsLoggedIn(true);
        localStorage.setItem('userId', uid);
        fetchUserData(uid);
        toast.success('Signed in successfully!');
      } else {
        toast.error('Invalid credentials');
      }
    } catch (error) {
      console.error('Sign in failed:', error);
      toast.error('Sign in failed');
    }
  };

  const handleSignUp = async () => {
    if (!username || !password) {
      toast.error('Please enter username and password');
      return;
    }

    try {
      const newUserId = crypto.randomUUID();
      
      await db.execute({
        sql: 'INSERT INTO users (id, username, password, points_balance) VALUES (?, ?, ?, ?)',
        args: [newUserId, username, password, 0]
      });

      setUserId(newUserId);
      setIsLoggedIn(true);
      localStorage.setItem('userId', newUserId);
      fetchUserData(newUserId);
      toast.success('Account created successfully!');
    } catch (error) {
      console.error('Sign up failed:', error);
      toast.error('Sign up failed');
    }
  };

  const handleSignOut = () => {
    setIsLoggedIn(false);
    setUserId(null);
    setProfile(null);
    setTransactions([]);
    setUsers([]);
    localStorage.removeItem('userId');
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-xl w-96">
          <div className="flex items-center justify-center mb-8">
            <PiggyBank className="w-12 h-12 text-purple-500" />
            <h1 className="text-3xl font-bold ml-2">KidsBank</h1>
          </div>
          <div className="space-y-4">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="w-full p-2 border rounded"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full p-2 border rounded"
            />
            <button
              onClick={handleSignIn}
              className="w-full bg-purple-500 text-white py-2 rounded-lg hover:bg-purple-600 transition"
            >
              Sign In
            </button>
            <button
              onClick={handleSignUp}
              className="w-full border border-purple-500 text-purple-500 py-2 rounded-lg hover:bg-purple-50 transition"
            >
              Create Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center">
            <PiggyBank className="w-10 h-10 text-purple-500" />
            <h1 className="text-2xl font-bold ml-2">KidsBank</h1>
            {profile?.is_admin && (
              <div className="ml-2 flex items-center text-purple-500">
                <Shield className="w-5 h-5" />
                <span className="ml-1">Admin</span>
              </div>
            )}
          </div>
          <button
            onClick={handleSignOut}
            className="text-gray-600 hover:text-gray-800"
          >
            Sign Out
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Points Balance</h2>
              <Coins className="w-6 h-6 text-yellow-500" />
            </div>
            <p className="text-4xl font-bold text-purple-600">
              {profile?.points_balance || 0}
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">New Transaction</h2>
            <div className="space-y-4">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Amount"
                className="w-full p-2 border rounded"
              />
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description"
                className="w-full p-2 border rounded"
              />
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleTransaction('deposit')}
                  className="flex items-center justify-center bg-green-500 text-white py-2 rounded hover:bg-green-600"
                >
                  <ArrowUpRight className="w-4 h-4 mr-2" />
                  Deposit
                </button>
                <button
                  onClick={() => handleTransaction('withdraw')}
                  className="flex items-center justify-center bg-red-500 text-white py-2 rounded hover:bg-red-600"
                >
                  <ArrowDownRight className="w-4 h-4 mr-2" />
                  Withdraw
                </button>
              </div>
            </div>
          </div>
        </div>

        {profile?.is_admin && (
          <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center mb-4">
              <Users className="w-6 h-6 text-purple-500 mr-2" />
              <h2 className="text-xl font-semibold">Manage Users</h2>
            </div>
            <div className="space-y-4">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border rounded"
                >
                  <div>
                    <p className="font-medium">{user.username}</p>
                    <p className="text-sm text-gray-500">
                      Balance: {user.points_balance} points
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleTransaction('deposit', user.id)}
                      className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                    >
                      Add Points
                    </button>
                    <button
                      onClick={() => handleTransaction('withdraw', user.id)}
                      className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      Remove Points
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Transaction History</h2>
          <div className="space-y-4">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-4 border rounded"
              >
                <div>
                  <p className="font-medium">{tx.description}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(tx.created_at).toLocaleDateString()}
                  </p>
                </div>
                <p className={`font-bold ${tx.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;