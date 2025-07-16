import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { BASE_URL } from "../utils/constants";
import { removeUser } from "../utils/userSlice";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { removeFeed } from "../utils/feedSlice";
import { IoNotifications } from "react-icons/io5";
import { HiMiniUserGroup } from "react-icons/hi2";
import { removeConnections } from "../utils/connectionsSlice"
import { removeAllRequests } from "../utils/requestsSlice"

const NavBar = () => {
  const dispatch = useDispatch();
  const selector = useSelector((store) => store.user);
  const requests = useSelector((store) => store.request);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await axios.post(BASE_URL + "/logout", {}, { withCredentials: true });
      dispatch(removeUser());
      dispatch(removeFeed());
      dispatch(removeConnections());
      dispatch(removeAllRequests());
      navigate("/login");
      toast.success("Logged out successfully.");
    } catch (err) {
      //
    }
  };

  return (
    <div className="navbar bg-base-300 shadow-sm fixed top-0 z-10">
      <div className="flex-1">
        <div className="flex">
          <Link to="/">
            <img src="/image.png" className="h-10" />
          </Link>
          <Link to="/" className="btn btn-ghost text-xl">
            DevTinder
          </Link>
        </div>
      </div>
      {selector && (
        <div className="flex gap-2">
          <div className="flex cursor-pointer" onClick={()=>navigate('/requests')}>
            <IoNotifications className="scale-150 mt-3 mr-1 " />
            {requests &&  requests.length>0 && <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75"></span>
              <span className="relative inline-flex size-2 rounded-full bg-sky-500"></span>
            </span>}
          </div>
          <HiMiniUserGroup className="scale-175 mt-2.5 mx-3 cursor-pointer" onClick={()=>navigate('/connections')}/>
          <input
            type="text"
            placeholder="Search"
            className="input input-bordered w-24 md:w-auto"
          />
          <div className="dropdown dropdown-end px-2">
            <div
              tabIndex={0}
              role="button"
              className="btn btn-ghost btn-circle avatar"
            >
              <div className="w-10 rounded-md">
                <img
                  alt="Tailwind CSS Navbar component"
                  src={
                    selector.photoUrl ||
                    "https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp"
                  }
                />
              </div>
            </div>
            <ul
              tabIndex={0}
              className="menu menu-sm dropdown-content bg-base-300 rounded-box z-1 mt-3 w-52 p-2 shadow"
            >
              <li>
                <Link to="/profile" className="justify-between">
                  Profile
                  <span className="badge">New</span>
                </Link>
              </li>
              <li>
                <a>Settings</a>
              </li>
              <li>
                <button onClick={handleLogout}>Logout</button>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default NavBar;
