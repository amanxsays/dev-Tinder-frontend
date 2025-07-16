import NavBar from './NavBar'
import { Outlet, useNavigate } from 'react-router-dom'
import Footer from './Footer'
import { useEffect } from 'react'
import axios from 'axios'
import { BASE_URL } from '../utils/constants'
import { useDispatch, useSelector } from 'react-redux'
import { addUser } from '../utils/userSlice'

const Body = () => {
  const dispatch=useDispatch();
  const navigate=useNavigate();
  const selector=useSelector(store => store.user);
  
  useEffect(()=>{
    (selector==null && fetchUser());
  },[])
  
  const fetchUser= async ()=>{
    try {
      const res= await axios.get(BASE_URL+"/profile/view", { withCredentials:true });
      dispatch(addUser(res.data));
    } catch (err) {
      navigate("/login");
      err
    }
  }

  return (
    <div>
        <NavBar/>
        <div className='min-h-screen mt-15'><Outlet/></div>
        <Footer/>
    </div>
  )
}

export default Body