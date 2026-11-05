import { isAndroid } from '../platform/platform';
import { acceptNativeSession } from '../platform/session';
import { getNotificationState, disableNotifications } from '../platform/nativeNotifications';
import { useRef, useState } from "react";
import axios from "../platform/apiClient";
import { toast } from "react-toastify";
import { useDispatch } from "react-redux";
import { addUser } from "../utils/userSlice";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { rememberSession, sessionReturnPath } from "../utils/sessionHint";
import { BASE_URL } from "../utils/constants"
import { FiEye, FiEyeOff, FiMail, FiLock, FiUser, FiKey } from "react-icons/fi";
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
  const saveSession = async data => {
    if (isAndroid()) {
      const previous = await getNotificationState();
      if (previous.userId && previous.userId !== data.data?._id) await disableNotifications({ awaitRemote: false });
    }
    await acceptNativeSession(data);
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
        BASE_URL+(isAndroid() ? "/mobile/login" : "/login"),
        {
          emailId: emailId.current.value,
          password: password.current.value,
        },
        { withCredentials: true, timeout: 180000 }
      )
      if (!res.data?.data?._id) throw new Error('Unexpected login response');
      await saveSession(res.data);
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
        BASE_URL+(isAndroid() ? "/mobile/signup" : "/signup"),
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
      await saveSession(res.data);
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
      <div className="dt-auth-content">
        <section className="dt-auth-card card w-96 card-lg" aria-labelledby="dt-auth-heading">
          <form className="card-body" aria-describedby="dt-auth-description" onSubmit={event => {
            event.preventDefault();
            if (isSignUpPage) { if (otpInput) void handleSignUp(); else void handleOtp(); }
            else void handleLogin();
          }}>
            <div className="dt-auth-intro">
              <h1 id="dt-auth-heading">{isSignUpPage ? 'Create your account' : 'Welcome back'}</h1>
              <p id="dt-auth-description">{isSignUpPage ? 'Meet developers and build your network.' : 'Sign in to your developer network.'}</p>
            </div>
            <div className="dt-auth-name-fields" hidden={!isSignUpPage}>
              <div className="dt-auth-field">
                <label htmlFor="dt-first-name"><FiUser aria-hidden="true" />First name</label>
                <input id="dt-first-name" name="given-name" ref={firstName} type="text" autoComplete="given-name" className="input" placeholder="First Name" disabled={Boolean(pendingAction)} />
              </div>
              <div className="dt-auth-field">
                <label htmlFor="dt-last-name"><FiUser aria-hidden="true" />Last name</label>
                <input id="dt-last-name" name="family-name" ref={lastName} type="text" autoComplete="family-name" className="input" placeholder="Last Name" disabled={Boolean(pendingAction)} />
              </div>
            </div>
            <div className="dt-auth-field">
              <label htmlFor="dt-email"><FiMail aria-hidden="true" />Email address</label>
              <input id="dt-email" name="username" ref={emailId} type="email" inputMode="email" enterKeyHint="next" autoComplete="username" autoCapitalize="none" spellCheck={false} className="input" placeholder="Email Id" disabled={Boolean(pendingAction)} />
            </div>
            <div className="dt-auth-field">
              <label htmlFor="dt-password"><FiLock aria-hidden="true" />Password</label>
              <div className="dt-auth-password">
                <input id="dt-password" name="password" ref={password} type={showPass ? 'text' : 'password'} enterKeyHint={isSignUpPage && otpInput ? 'next' : 'go'} autoComplete={isSignUpPage ? 'new-password' : 'current-password'} className="input" placeholder="Password" disabled={Boolean(pendingAction)} />
                <button type="button" className="dt-password-toggle" aria-label={showPass ? 'Hide password' : 'Show password'} aria-pressed={showPass} onClick={() => setShowPass(!showPass)}>
                  {showPass ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}
                </button>
              </div>
            </div>
            <div className="dt-auth-field" hidden={!isSignUpPage || !otpInput}>
              <label htmlFor="dt-otp"><FiKey aria-hidden="true" />Verification code</label>
              <input id="dt-otp" name="one-time-code" ref={otp} type="text" inputMode="numeric" enterKeyHint="go" autoComplete="one-time-code" className="input" placeholder="otp" disabled={Boolean(pendingAction)} />
              {startTime !== null && <CountdownTimer startTime={startTime} onResend={handleOtp} />}
            </div>
            <div className="dt-auth-actions">
              <button type="submit" disabled={Boolean(pendingAction)} className="btn dt-auth-submit">
                {pendingAction ? pendingAction + '…' : isSignUpPage ? (otpInput ? 'Verify & Sign Up' : 'Send Otp') : 'Login'}
              </button>
              {pendingAction && <p className="dt-auth-wait" role="status">The server may take a moment to wake up. Please keep this page open.</p>}
              <button type="button" disabled={Boolean(pendingAction)} className="dt-auth-switch" onClick={() => setIsSignUpPage(!isSignUpPage)}>
                {isSignUpPage ? <>Already registered? <span>Log in</span></> : <>New to DevTinder? <span>Sign up</span></>}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
};

export default Login;
