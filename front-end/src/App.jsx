import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import './App.css'
import Login from './pages/Login';
import Signup from "./pages/Signup";
import Reset from "./pages/Reset";
import { Home } from "./pages/Home";
import { Vote } from "./pages/Vote";
import { NotFound } from "./pages/NotFound";
import DiningHall from "./pages/DiningHall";
import Navbar from "./functions/Navbar";
import SetPass from "./pages/setPass";
import Hours from "./pages/Hours";
import Tracker from "./pages/Tracker";

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot" element={<Reset />} />
        <Route path="/reset-password" element={<SetPass />} />
        <Route path="/home" element={<Home />} />
        <Route path="/vote" element={<Vote />} />
        <Route path="/menu/:hall/:meal" element={<DiningHall />} />
        <Route path="/hours" element={<Hours />} />
        {/* The hours page used to live at /about; keep old links working. */}
        <Route path="/about" element={<Navigate to="/hours" replace />} />
        <Route path="/tracker" element={<Tracker />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;
