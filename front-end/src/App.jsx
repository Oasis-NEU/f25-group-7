import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import './App.css'
import Login from './pages/Login';
import Signup from "./pages/Signup";
import Reset from "./pages/Reset";
import { Home } from "./pages/Home";
import { Vote } from "./pages/Vote";
import { Navigate } from "react-router-dom";
import { NotFound } from "./pages/NotFound";
import { Steast } from "./pages/Steast-breakfast";
import { SupabaseClient } from "@supabase/supabase-js"; 
import SetPass from "./pages/setPass";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup/>}/>
        <Route path="/forgot" element={<Reset/>}/>   
        <Route path="/reset-password" element={<SetPass/>}/>   
        <Route path="/home" element={<Home/>}></Route>
        <Route path="/vote" element={<Vote/>} />
        <Route path="/menu/:hall/:meal" element={<Steast/>} />
        <Route path= "*" element={<NotFound/>}></Route>
      </Routes>
    </Router>
  );
}

export default App;
