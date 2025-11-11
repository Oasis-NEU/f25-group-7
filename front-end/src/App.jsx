import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import './App.css'
import Login from './pages/Login';
import { Home } from "./pages/Home";
import { Vote } from "./pages/Vote";
import { NotFound } from "./pages/NotFound";
import { SupabaseClient } from "@supabase/supabase-js"; 

function App() {
  return (
    <Router>
      <Routes>
        <Route index element={<Home/>}></Route>
        <Route path="/login" element={<Login/>} />
        <Route path="/vote" element={<Vote/>} />
        <Route path= "*" element={<NotFound/>}></Route>
      </Routes>
    </Router>
  );
}

export default App;
