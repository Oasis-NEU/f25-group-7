import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import './App.css'
import Login from './pages/Login';
import Signup from "./pages/Signup";
import Reset from "./pages/Reset";
import { Home } from "./pages/Home";
import { Vote } from "./pages/Vote";
import { NotFound } from "./pages/NotFound";
import { SupabaseClient } from "@supabase/supabase-js"; 

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" index element={<Login/>} />
        <Route path="/signup" element={<Signup/>}/>
        <Route path="/forgot" element={<Reset/>}/>        
        <Route path="/home" element={<Home/>}></Route>
        <Route path="/vote" element={<Vote/>} />
        <Route path= "*" element={<NotFound/>}></Route>
      </Routes>
    </Router>
  );
}

export default App;
