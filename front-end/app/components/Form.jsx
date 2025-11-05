"use client";
import { Users, Mail } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

function Form() {
  const [variant, setVariant] = useState("Login");

  const toggleVariant = () => {
    setVariant((prev) =>
      prev === "Login" ? "Signup" : prev === "Signup" ? "Login" : "Login"
    );
  };

  const showForgotPassword = () => setVariant("Forgot");

  const formVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -30 },
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      transition={{ duration: 0.6 }}
      variants={formVariants}
      className="flex flex-col items-center gap-4 p-4 w-screen h-screen
                 bg-white/20 backdrop-blur-lg border border-white/10 shadow-xl"
    >
     <img
        src="/Dining_Monogram_K.png"
        alt="Dining Logo"
        width={400}
        height={400}
        className="mt-4 opacity-80 hover:opacity-100 transition duration-500 transform hover:scale-110"
      />
      <AnimatePresence mode="wait">
        {variant === "Login" && (
          <motion.div
            key="login"
            variants={formVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center gap-4 w-full max-w-xs"
          >
               
            <input
              type="email"
              className="w-full rounded-xl px-4 py-3 bg-white/70 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-400 transition"
              placeholder="Northeastern Email"
            />
            <input
              type="password"
              className="w-full rounded-xl px-4 py-3 bg-white/70 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-400 transition"
              placeholder="Password"
            />
            <motion.button
              className="px-8 py-3 rounded-full bg-linear-to-r from-red-500 via-red-600 to-red-700 text-white font-bold uppercase tracking-wide shadow-lg transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-2xl active:scale-95 focus:outline-none focus:ring-4 focus:ring-red-300"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Login
            </motion.button>
            <motion.p
              className="text-sm text-center text-black/60 hover:text-black cursor-pointer"
              onClick={toggleVariant}
              whileHover={{ scale: 1.05 }}
            >
              Don’t have an account? Register
            </motion.p>
            <motion.p
              className="text-sm text-center text-black/50 hover:text-black/80 cursor-pointer"
              onClick={showForgotPassword}
              whileHover={{ scale: 1.05 }}
            >
              Forgot Password?
            </motion.p>
          </motion.div>
        )}

        {variant === "Signup" && (
          <motion.div
            key="signup"
            variants={formVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center gap-4 w-full max-w-xs"
          >
            <input
              type="text"
              className="w-full rounded-xl px-4 py-3 bg-white/70 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-400 transition"
              placeholder="Full Name"
            />
            <input
              type="email"
              className="w-full rounded-xl px-4 py-3 bg-white/70 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-400 transition"
              placeholder="Northeastern Email"
            />
            <input
              type="password"
              className="w-full rounded-xl px-4 py-3 bg-white/70 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-400 transition"
              placeholder="Password"
            />
            <motion.button
              className="px-8 py-3 rounded-full bg-linear-to-r from-red-500 via-red-600 to-red-700 text-white font-bold uppercase tracking-wide shadow-lg transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-2xl active:scale-95 focus:outline-none focus:ring-4 focus:ring-red-300"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Sign up
            </motion.button>
            <motion.p
              className="text-sm text-center text-white/60 hover:text-white cursor-pointer"
              onClick={toggleVariant}
              whileHover={{ scale: 1.05 }}
            >
              Already have an account? Login
            </motion.p>
          </motion.div>
        )}

        {variant === "Forgot" && (
          <motion.div
            key="forgot"
            variants={formVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center gap-4 w-full max-w-xs"
          >
            <p className="text-center text-white/70 text-sm mb-2">
              Enter your registered email below. We’ll send you a password reset
              link.
            </p>
            <div className="relative w-full">
              <Mail className="absolute left-3 top-3.5 text-gray-500 size-5" />
              <input
                type="email"
                className="w-full rounded-xl pl-10 pr-4 py-3 bg-white/70 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-400 transition"
                placeholder="Your Northeastern Email"
              />
            </div>
            <motion.button
              className="px-8 py-3 rounded-full bg-linear-to-r from-red-500 via-red-600 to-red-700 text-white font-bold uppercase tracking-wide shadow-lg transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-2xl active:scale-95 focus:outline-none focus:ring-4 focus:ring-red-300"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Send Reset Link
            </motion.button>
            <motion.p
              className="text-sm text-center text-white/60 hover:text-white cursor-pointer"
              onClick={toggleVariant}
              whileHover={{ scale: 1.05 }}
            >
              Back to Login
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Decorative Logo */}
      
    </motion.div>
  );
}

export default Form;
