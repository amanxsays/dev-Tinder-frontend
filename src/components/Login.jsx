import { useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useDispatch } from "react-redux";
import { addUser } from "../utils/userSlice";
import { useNavigate } from "react-router-dom";
import { BASE_URL } from "../utils/constants"
import { MdDriveFileRenameOutline } from "react-icons/md";
import { PiPasswordBold } from "react-icons/pi";
import CountdownTimer from "./OtpCoundown";


const Login = () => {
  const [showPass, setShowPass] = useState(false);
  const [isSignUpPage, setIsSignUpPage] = useState(false);
  const [otpInput,setOtpInput]= useState(false);
  const [startTime,setStartTime] = useState(null);

  const dispatch=useDispatch();
  const navigate=useNavigate();

  const firstName = useRef("");
  const lastName = useRef("");
  const emailId = useRef("");
  const password = useRef("");
  const otp = useRef("");
  const handleLogin = async () => {
    try {
      const res = await axios.post(
        BASE_URL+"/login",
        {
          emailId: emailId.current.value,
          password: password.current.value,
        },
        { withCredentials: true }
      )
      dispatch(addUser(res.data.data))
      toast.success(res.data.message);
      navigate("/")
    } catch (err) {
      toast.error(err.response.data)
    }
  };
  const handleSignUp= async () => {
    try {
      const res = await axios.post(
        BASE_URL+"/signup",
        {
          firstName: firstName.current.value,
          lastName: lastName.current.value,
          emailId: emailId.current.value,
          password: password.current.value,
          otp: otp.current.value,
        },
        { withCredentials: true }
      )
      dispatch(addUser(res.data.data))
      toast.success(res.data.message);
      navigate("/profile")
    } catch (err) {
      toast.error(err.response.data)
    } 
  }
  const handleOtp= async ()=>{
    try {
    const res = await axios.post(
        BASE_URL+"/otp",
        {
          firstName: firstName.current.value,
          lastName: lastName.current.value,
          emailId: emailId.current.value,
          password: password.current.value,
        },
        { withCredentials: true }
      )
      setStartTime(Date.now());
      setOtpInput(true);
      console.log(res);
      toast.success(res.data.message);
    } catch (err) {
      if(err.status==402) setOtpInput(true);
      console.log(err);
      toast.error(err.response.data.message || err.response.data)
    } 
  }

  

  return (
    <div>
      <div className="absolute top-10 z-[-10] overflow-hidden">
        <div>
          <img src="/cover_page4.png"></img>
        </div>
      </div>
    <div className="flex justify-center pt-13">
      <div className="card w-96 bg-[#0f0f10] card-lg shadow-sm">
        <form className="card-body" onSubmit={(e) => e.preventDefault()}>
          <h2 className="card-title mb-8 text-2xl">{isSignUpPage?"Sign Up":"Login"}</h2>
          <div className={isSignUpPage?"":"hidden"}>
            <fieldset className="fieldset">
              <MdDriveFileRenameOutline className="scale-200 m-1"/>
              <input
                ref={firstName}
                type="text"
                className="input"
                placeholder="First Name"
              />
            </fieldset>
          </div>
          <div className={isSignUpPage?"":"hidden"}>
            <fieldset className="fieldset">
              <MdDriveFileRenameOutline className="scale-200 m-1"/>
              <input
                ref={lastName}
                type="text"
                className="input"
                placeholder="Last Name"
              />
            </fieldset>
          </div>
          <div>
            <fieldset className="fieldset">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="size-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
                />
              </svg>
              <input
                ref={emailId}
                type="text"
                className="input"
                placeholder="Email Id"
              />
            </fieldset>
          </div>
          <div>
            <fieldset className="fieldset ">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="size-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z"
                />
              </svg>
              <div className="flex rounded-sm">
                <input ref={password}
                type={showPass ? "text" : "password"}
                className="input rounded-r-none"
                placeholder="Password"
              />
              <div className="cursor-pointer px-2 bg-[#323F56] rounded-r-sm" onClick={()=>setShowPass(!showPass)}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="size-4 my-3"
                >
                  <path
                    strokeLinecap="round"
                   strokeLinejoin="round"
                    d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                  />
                </svg>
              </div>
              </div>
            </fieldset>
          </div>
          <div className={otpInput?"":"hidden"}>
            <fieldset className="fieldset">
              <PiPasswordBold className="scale-200 ml-2"/>
              <input
                ref={otp}
                type="text"
                className="input"
                placeholder="otp"
              />
              {startTime && <CountdownTimer startTime={startTime} />}
            </fieldset>
          </div>
          <div className="flex justify-center card-actions">
            <button
              className="btn bg-gradient-to-br to-[#020b6ecd] from-[#0F5BC4] mt-8 mb-2 w-full hover:from-[#0818cbd8] transition-colors duration-500"
              onClick={isSignUpPage?(otpInput?handleSignUp:handleOtp):handleLogin}
            >
              {isSignUpPage?(otpInput?"Verify & Sign Up":"Send Otp"):"Login"}
            </button>

            <button onClick={()=>setIsSignUpPage(!isSignUpPage)} className="cursor-pointer flex gap-1">{!isSignUpPage?(<>New user ? <p className="text-blue-400">Sign Up</p> now</>):(<>Already registered ? <p className="text-blue-400">Login</p> now</>)}</button>
          </div>
        </form>
      </div>
    </div>
    </div>
  );
};

export default Login;
