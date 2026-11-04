import { useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useDispatch } from "react-redux";
import { addUser } from "../utils/userSlice";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { rememberSession, sessionReturnPath } from "../utils/sessionHint";
import { BASE_URL } from "../utils/constants"
import { MdDriveFileRenameOutline } from "react-icons/md";
import { PiPasswordBold } from "react-icons/pi";
import CountdownTimer from "./OtpCoundown";
import "../styles/auth.css";


const Login = () => {
  const [showPass, setShowPass] = useState(false);
  const [isSignUpPage, setIsSignUpPage] = useState(false);
  const [otpInput,setOtpInput]= useState(false);
  const [startTime,setStartTime] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const actionPending = useRef(false);

  const dispatch=useDispatch();
  const navigate=useNavigate();
  const location = useLocation();
  const { startManualAuth } = useOutletContext() || {};
  const beginAction = action => {
    if (actionPending.current) return false;
    actionPending.current = true;
    setPendingAction(action);
    startManualAuth?.();
    return true;
  };
  const finishAction = () => { actionPending.current = false; setPendingAction(null); };
  const showAuthError = error => {
    const data = error.response?.data;
    const message = typeof data === 'string' && !data.trim().startsWith('<') ? data : data?.message;
    toast.error(message || 'The server is starting or unavailable. Please try again.');
  };

  const firstName = useRef("");
  const lastName = useRef("");
  const emailId = useRef("");
  const password = useRef("");
  const otp = useRef("");
  const handleLogin = async () => {
    if (!beginAction('Signing in')) return;
    try {
      const res = await axios.post(
        BASE_URL+"/login",
        {
          emailId: emailId.current.value,
          password: password.current.value,
        },
        { withCredentials: true, timeout: 180000 }
      )
      if (!res.data?.data?._id) throw new Error('Unexpected login response');
      rememberSession();
      dispatch(addUser(res.data.data))
      toast.success(res.data.message);
      navigate(sessionReturnPath(location.state?.from), { replace: true })
    } catch (err) {
      showAuthError(err);
    } finally { finishAction(); }
  };
  const handleSignUp= async () => {
    if (!beginAction('Creating your account')) return;
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
        { withCredentials: true, timeout: 180000 }
      )
      if (!res.data?.data?._id) throw new Error('Unexpected signup response');
      rememberSession();
      dispatch(addUser(res.data.data))
      toast.success(res.data.message);
      navigate("/profile")
    } catch (err) {
      showAuthError(err);
    } finally { finishAction(); }
  }
  const handleOtp= async ()=>{
    if (!beginAction('Sending your code')) return;
    try {
    const res = await axios.post(
        BASE_URL+"/otp",
        {
          firstName: firstName.current.value,
          lastName: lastName.current.value,
          emailId: emailId.current.value,
          password: password.current.value,
        },
        { withCredentials: true, timeout: 180000 }
      )
      if (typeof res.data?.message !== 'string') throw new Error('Unexpected OTP response');
      setStartTime(Date.now());
      setOtpInput(true);
      toast.success(res.data.message, {
          autoClose: 10000, // 10 seconds
      });
    } catch (err) {
      if (err.response && err.response.status < 500) {
        setStartTime(0);
        setOtpInput(true);
      }
      showAuthError(err);
    } finally { finishAction(); }
  }

  

  return (
    <div className="dt-auth-page">
      <div className="dt-auth-backdrop" aria-hidden="true">
        <svg className="dt-auth-contours" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" fill="none" focusable="false">
          <path d="M-260 870C90 870 160 290 510 290S790 40 870-180" />
          <path d="M-300 930C90 930 200 350 550 350S850 90 930-180" />
          <path d="M1040 1180C1000 840 1380 900 1420 540S1690 220 1840 220" />
          <path d="M1100 1200C1060 900 1440 940 1480 580S1740 280 1900 280" />
        </svg>
      </div>
    <div className="flex justify-center pt-13">
      <div className="dt-auth-card card w-96 bg-[#0f0f10] card-lg shadow-sm">
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
              {startTime!==null && <CountdownTimer startTime={startTime} onResend={handleOtp}/>}
            </fieldset>
          </div>
          <div className="flex justify-center card-actions">
            <button disabled={Boolean(pendingAction)}
              className="btn bg-gradient-to-br to-[#020b6ecd] from-[#0F5BC4] mt-8 mb-2 w-full hover:from-[#0818cbd8] transition-colors duration-500"
              onClick={isSignUpPage?(otpInput?handleSignUp:handleOtp):handleLogin}
            >
              {pendingAction ? pendingAction + '…' : isSignUpPage?(otpInput?"Verify & Sign Up":"Send Otp"):"Login"}
            </button>
            {pendingAction && <p className="dt-auth-wait" role="status">The server may take a moment to wake up. Please keep this page open.</p>}

            <button disabled={Boolean(pendingAction)} onClick={()=>setIsSignUpPage(!isSignUpPage)} className="cursor-pointer flex gap-1">{!isSignUpPage?(<>New user ? <p className="text-blue-400">Sign Up</p> now</>):(<>Already registered ? <p className="text-blue-400">Login</p> now</>)}</button>
          </div>
        </form>
      </div>
    </div>
    </div>
  );
};

export default Login;
