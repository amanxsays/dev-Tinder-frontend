import axios from "axios"
import { useDispatch, useSelector } from "react-redux"
import { BASE_URL } from "../utils/constants"
import { removeUser } from "../utils/userSlice";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { removeFeed } from "../utils/feedSlice";

const NavBar = () => {

  const dispatch=useDispatch();
  const selector= useSelector( store => store.user);
  const navigate=useNavigate();

  const handleLogout= async ()=>{
    try {
      await axios.post(BASE_URL+"/logout",{}, {withCredentials: true});
      dispatch(removeUser());
      dispatch(removeFeed());
      navigate("/login")
      toast.success("Logged out successfully.");
    } catch (err) {
      //
    }
  }

  return (
    <div className="navbar bg-base-300 shadow-sm fixed top-0 z-10">
  <div className="flex-1">
    <div className="flex">
      <Link to='/'><img src="/image.png" className="h-10"/></Link>
    <Link to="/" className="btn btn-ghost text-xl">DevTinder</Link>
    </div>
  </div>
  {selector && <div className="flex gap-2">
    <input type="text" placeholder="Search" className="input input-bordered w-24 md:w-auto" />
    <div className="dropdown dropdown-end px-2">
      <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar">
        <div className="w-10 rounded-full">
          <img
            alt="Tailwind CSS Navbar component"
            src={ selector.photoUrl || "https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp"} />
        </div>
      </div>
      <ul
        tabIndex={0}
        className="menu menu-sm dropdown-content bg-base-300 rounded-box z-1 mt-3 w-52 p-2 shadow">
        <li>
          <Link to="/profile" className="justify-between">
            Profile
            <span className="badge">New</span>
          </Link>
        </li>
        <li><a>Settings</a></li>
        <li><button onClick={handleLogout}>Logout</button></li>
      </ul>
    </div>
  </div>
}
</div>
  )
}

export default NavBar