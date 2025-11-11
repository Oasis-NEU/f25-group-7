import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import FoodBackground from "../Components/background";
import { supabase } from '../config/supabaseClient';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
    const {data,error} = await supabase.auth.signInWithPassword({
      email, 
      password,
    });
    if(error){
      setError("Invalid Password or Email!");

    } else if (data.user) {
      navigate("/Home");
    }
  }
  catch (err) {
    setError("Invalid Password or Email!")
    console.error(err);
  } finally {
    setLoading(false);
  }

  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-cover bg-center bg-no-repeat bg-[#000000]"
    >
    <FoodBackground/>
      <div className=' absolute top-10 flex flex-row items-center mb-8 text-center animate-pulse'>
        <img
        src="/logo__7_-removebg-preview.png"
        alt='NU Rate-ON Logo'
        className='w-50 h-50 mb-4 drop-shadow-md'/> 
      </div>
      <div className="bg-white/20 backdrop-blur-md rounded-xl shadow-lg p-8 w-full max-w-md">
        <h2 className="text-3xl place-self-center-safe font-bold mb-6 text-red-400">Login</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2 text-red-400">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-red-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="your@northeastern.edu"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-red-400">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none text-red-400 focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 rounded-lg font-semibold border border-gray-300 bg-white text-red-800 hover:bg-black hover:text-white transition-all duration-200 disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="mt-4 text-center text-white text-sm">
          Don't have an account?{' '}
          <Link to="/signup" className="font-semibold hover:text-red-300 hover:underline">
            Sign up
          </Link>
        </p>
        <p className="mt-4 text-center text-white text-sm">
          Forgot Password?{' '}
          <Link to="/forgot" className="font-semibold hover:underline hover:text-red-300">
            Reset Password
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
