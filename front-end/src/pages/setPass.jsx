import React, { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import FoodBackground from "../Components/background";
import { supabase } from "../config/supabaseClient";

function setPass() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!password || !confirmPassword) {
      setError("Please fill out all fields.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords Do Not Match");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser(
        {
          password
        }
      );
      if (error) {
        setError(error.message);
      } else {
        setMessage("Password updated successfully! Redirecting to login...");
        setTimeout(() => navigate("/login"), 3000);
      }
    } catch (err) {
      console.error(err);
      setError("An Error Ocurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-cover bg-center bg-no-repeat bg-[#000000]">
      <FoodBackground />
      <div className=" absolute top-10 flex flex-row items-center mb-8 text-center animate-pulse">
        <img
          src="/logo__7_-removebg-preview.png"
          alt="NU Rate-ON Logo"
          className="w-50 h-50 mb-4 drop-shadow-md"
        />
      </div>
      <div className="bg-white/20 backdrop-blur-md rounded-xl shadow-lg p-8 w-full max-w-md">
        <h2 className="text-3xl place-self-center-safe font-bold mb-6 text-red-400">
          Set New Password
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          {message && (
            <div className="bg-red-100 border border-red-100 text-red-900 px-4 py-3 rounded">
               {message}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-2 text-red-400">
              New Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-red-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter New Password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-red-400">
              {" "}
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-red-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Confirm New Password"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 rounded-lg font-semibold border border-gray-300 bg-white text-red-800 hover:bg-black hover:text-white transition-all duration-200 disabled:opacity-50"
          >
            {loading ? "Updating..." : "Set Password"}
          </button>
        </form>

        <p className="mt-4 text-center text-white text-sm">
          Remembered your Password?{" "}
          <Link
            to="/login"
            className="font-semibold hover:underline hover:text-red-300"
          >
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default setPass;
