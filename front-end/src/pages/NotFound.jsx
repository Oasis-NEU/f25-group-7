import { Link } from "react-router-dom";
import FoodBackground from "../Components/background";

export const NotFound = () => {
  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <FoodBackground />
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 text-center">
        <p className="text-red-400 text-sm font-semibold uppercase tracking-widest mb-3">
          404
        </p>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">
          We couldn't find that page
        </h1>
        <p className="text-white/45 max-w-md mb-8">
          The link may be out of date, or the page may have moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            to="/home"
            className="px-6 py-2.5 rounded-full bg-red-500 hover:bg-red-600 text-white font-semibold transition-colors"
          >
            Back to home
          </Link>
          <Link
            to="/hours"
            className="px-6 py-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white font-semibold transition-colors"
          >
            Dining hall hours
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
