import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./Navbar.css";
import { supabase } from "../config/supabaseClient";

const NavLink = ({ to, children, onClick }) => (
  <Link
    to={to}
    onClick={onClick}
    className="px-4 py-2 rounded-md text-sm font-medium text-white hover:bg-white/10 transition-colors"
  >
    {children}
  </Link>
);

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // keep routes to hide navbar on auth pages only — DON'T include "/" here
  const hideOn = ["/login", "/signup", "/forgot", "/reset-password"];
  const shouldHide = hideOn.includes(location.pathname);

  // treat both "/" and "/home" as the "home page" where main nav links are hidden
  const homePaths = ["/", "/home"];
  const isOnHomePage = homePaths.includes(location.pathname);

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      try {
        // supabase v2: getUser returns { data: { user } }
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          console.error("supabase getUser error:", error);
        }
        if (!mounted) return;
        setUser(data?.user ?? null);
      } catch (err) {
        console.error("getUser unexpected error:", err);
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadUser();

    // subscribe to auth changes
    // supabase.auth.onAuthStateChange returns { data: { subscription } } in some versions,
    // or returns a subscription directly. We normalize both.
    const listenerPromise = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setUser(session?.user ?? null);
    });

    // normalize unsubscribe
    const unsubscribe = () => {
      try {
        // case: listenerPromise?.data?.subscription?.unsubscribe()
        if (listenerPromise?.data?.subscription?.unsubscribe) {
          listenerPromise.data.subscription.unsubscribe();
        } else if (listenerPromise?.unsubscribe) {
          // case: listenerPromise.unsubscribe()
          listenerPromise.unsubscribe();
        }
      } catch (e) {
        // ignore
      }
    };

    function handleClickOutside(e) {
      // if clicking outside the dropdown & menu button, close the menu
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("click", handleClickOutside);

    return () => {
      mounted = false;
      unsubscribe();
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  async function handleSignOut() {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("signOut error:", err);
    } finally {
      setUser(null);
      // after sign out, push to login
      navigate("/login");
    }
  }

  if (shouldHide) return null;

  // helper to get an email/display string defensively
  const userEmail =
    user?.email ??
    user?.user_metadata?.email ??
    user?.user_metadata?.full_name ??
    null;

  return (
    <header className="navbar fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-black/50 border-b border-white/5">
      <div className="container mx-auto px-4 md:px-6 lg:px-8 flex items-center justify-between h-16">
        {/* Logo */}
        <div className="flex items-center gap-4">
          <Link to={isOnHomePage ? "/" : "/home"} className="flex items-center gap-3">
            <img
              src="/logo__7_-removebg-preview.png"
              alt="logo"
              className="w-10 h-10 rounded-md shadow-md"
            />
            <span className="text-xl font-semibold text-white">NU RATE-ON</span>
          </Link>
        </div>

        {/* Desktop navigation (hidden on home) */}
        {!isOnHomePage && (
          <nav className="hidden md:flex items-center gap-2">
            <NavLink to="/home">Home</NavLink>
            <NavLink to="/about">About</NavLink>
            {user && <NavLink to="/vote">Vote</NavLink>}
          </nav>
        )}

        {/* User section — ALWAYS visible */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen((s) => !s)}
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-3 py-1 rounded-full text-sm cursor-pointer text-white transition-all duration-200"
                aria-haspopup="true"
                aria-expanded={userMenuOpen}
              >
                <div className="w-7 h-7 rounded-full bg-red-400 flex items-center justify-center text-white font-semibold uppercase shadow-md">
                  {/* fallback: first char of display name/email */}
                  {userEmail ? userEmail.charAt(0).toUpperCase() : "U"}
                </div>
                <span className="hidden sm:inline-block">
                  {userEmail ?? "User"}
                </span>

                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {userMenuOpen && (
                <div className="user-dropdown" role="menu" aria-label="User menu">
                  <div className="px-4 py-3 text-sm text-gray-200 border-b border-gray-700">
                    <div className="font-semibold text-white">
                      {userEmail ?? "Signed in"}
                    </div>
                  </div>
                  <div className="px-3 py-2">
                    <button
                      onClick={handleSignOut}
                      className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-full font-semibold transition-all duration-200 text-sm"
                    >
                      Log out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-full text-sm font-semibold"
            >
              Sign In
            </Link>
          )}

          {/* Mobile navigation toggle — hidden only on home */}
          {!isOnHomePage && (
            <button
              className="md:hidden p-2 rounded-md hover:bg-white/5 text-white"
              onClick={() => setOpen((s) => !s)}
              aria-label="Toggle menu"
            >
              {open ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Mobile navigation */}
      {!isOnHomePage && (
        <div className={`mobile-menu md:hidden ${open ? "open" : ""}`}>
          <NavLink to="/home" onClick={() => setOpen(false)}>Home</NavLink>
          <NavLink to="/about" onClick={() => setOpen(false)}>About</NavLink>
          {user && <NavLink to="/vote" onClick={() => setOpen(false)}>Vote</NavLink>}
        </div>
      )}
    </header>
  );
}
