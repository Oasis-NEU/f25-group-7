import Link from "next/link"
function Navbar() {
     return <nav className="flex items-center justify-center px-10 py-4 lg:justify-between">
          <div className="cursor-pointer">
               <img 
               src="/Dining_Monogram_K.png"
               alt="logo"
               width={180}
               height={180}
               className="transition duration-300 transform hover:scale-110"
               />
          </div>
          <div className="hidden gap-8 lg:pr-10 xl:gap-20 lg:flex">
               <Link href="#"><span className="font-bold uppercase text-sm hover:text-[#bd311e] transition duration-300"></span>
               Home
               </Link>
               <Link href="#"><span className="font-bold uppercase text-sm hover:text-[#bd311e] transition duration-300"></span>
               Stetson West (Outtakes)
               </Link>
               <Link href="#"><span className="font-bold uppercase text-sm hover:text-[#bd311e] transition duration-300"></span>
               Stetson East
               </Link>
               <Link href="#"><span className="font-bold uppercase text-sm hover:text-[#bd311e] transition duration-300"></span>
               International Village
               </Link>
               <Link href="#"><span className="font-bold uppercase text-sm hover:text-[#bd311e] transition duration-300"></span>
               60 Belvidere
               </Link>
               <Link href="#"><span className="font-bold uppercase text-sm hover:text-[#bd311e] transition duration-300"></span>
               Logout
               </Link>
          </div>
     </nav>
}

export default Navbar;