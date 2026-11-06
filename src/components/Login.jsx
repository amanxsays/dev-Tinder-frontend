import { isAndroid, NativeDeviceData } from '../platform/platform';
import { writeDeviceCache } from '../platform/deviceCache';
import { acceptNativeSession } from '../platform/session';
import { getNotificationState, disableNotifications } from '../platform/nativeNotifications';
import { useEffect, useRef, useState } from "react";
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


const savedEmail = () => { try { return localStorage.getItem('devtinder.remembered-email') || ''; } catch { return ''; } };
const Login = () => {
  const [rememberEmail, setRememberEmail] = useState(() => Boolean(savedEmail()));
  const [authError, setAuthError] = useState('');
  const [saveAccount, setSaveAccount] = useState(false);
  const [savedAccount, setSavedAccount] = useState('');
  useEffect(() => {
    if (!isAndroid()) return;
    let alive = true;
    void NativeDeviceData.savedAccount().then(value => { if (alive) setSavedAccount(value.email || ''); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  const chooseMode = signup => { setIsSignUpPage(signup); setAuthError(''); setOtpInput(false); setStartTime(null); };
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
    const hint = error.response?.status === 401 ? 'Email or password not recognised. New here? Choose Create account above.' : message || 'The server is starting or unavailable. Please try again.';
    setAuthError(hint);
    toast.error(hint);
  };
  const saveSession = async data => {
    if (isAndroid()) {
      const previous = await getNotificationState();
      if (previous.userId && previous.userId !== data.data?._id) await disableNotifications({ awaitRemote: false });
    }
    await acceptNativeSession(data);
    void writeDeviceCache(data.data._id, 'profile', data.data);
    if (isAndroid() && saveAccount) {
      try { await NativeDeviceData.saveCredentials({ email: emailId.current.value.trim(), password: password.current.value }); }
      catch (error) { toast.info(error.message || 'Could not save this account. Sign-in still succeeded.'); }
    }
    try {
      if (rememberEmail) localStorage.setItem('devtinder.remembered-email', emailId.current.value.trim());
      else localStorage.removeItem('devtinder.remembered-email');
    } catch { /* Password manager and login remain usable without local storage. */ }
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
  const useSavedAccount = async () => {
    if (actionPending.current) return;
    actionPending.current = true; setPendingAction('Unlocking saved account');
    try {
      const credentials = await NativeDeviceData.unlockCredentials();
      setShowPass(false); password.current.type = 'password';
      emailId.current.value = credentials.email; password.current.value = credentials.password;
      actionPending.current = false; setPendingAction(null);
      await handleLogin();
    } catch { setAuthError('Unlock cancelled or unavailable. You can sign in below.'); }
    finally { actionPending.current = false; setPendingAction(null); }
  };
  const forgetSavedAccount = async () => {
    try { await NativeDeviceData.forgetCredentials(); setSavedAccount(''); }
    catch { setAuthError('Could not remove saved account. Please try again.'); }
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
      setAuthError('');
      setStartTime(Date.parse(res.data.sentAt) || Date.now());
      setOtpInput(true);
      toast.success(res.data.message, {
          autoClose: 10000, // 10 seconds
      });
    } catch (err) {
      if (err.response?.data?.code === 'OTP_ACTIVE') {
        setStartTime(Date.parse(err.response.data.sentAt) || Date.now());
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
          <form autoComplete="on" className="card-body" aria-describedby="dt-auth-description" onSubmit={event => {
            event.preventDefault();
            if (isSignUpPage) { if (otpInput) void handleSignUp(); else void handleOtp(); }
            else void handleLogin();
          }}>
            <div className="dt-auth-intro">
              <h1 id="dt-auth-heading">{isSignUpPage ? 'Create your account' : 'Welcome back'}</h1>
              <p id="dt-auth-description">{isSignUpPage ? 'Meet developers and build your network.' : 'Sign in to your developer network.'}</p>
            </div>
            <div className="dt-auth-modes" role="group" aria-label="Choose account action">
              <button type="button" aria-pressed={!isSignUpPage} disabled={Boolean(pendingAction)} onClick={() => chooseMode(false)}>Log in</button>
              <button type="button" aria-pressed={isSignUpPage} disabled={Boolean(pendingAction)} onClick={() => chooseMode(true)}>Create account</button>
            </div>
            <p className="dt-auth-mode-hint">{isSignUpPage ? 'Already have an account? Choose Log in.' : 'First time here? Choose Create account.'}</p>
            {authError && <p className="dt-auth-inline-error" role="alert">{authError}</p>}
            {!isSignUpPage && isAndroid() && savedAccount && <div className="dt-saved-account">
              <button type="button" disabled={Boolean(pendingAction)} onClick={useSavedAccount}>Continue as {savedAccount}</button>
              <button type="button" disabled={Boolean(pendingAction)} onClick={forgetSavedAccount}>Remove saved account</button>
              <p>Confirm your phone screen lock to sign in.</p>
            </div>}
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
              <input id="dt-email" name="username" defaultValue={savedEmail()} ref={emailId} onChange={() => {
                if (otpInput) { setOtpInput(false); setStartTime(null); if (otp.current) otp.current.value = ''; }
                setAuthError('');
              }} type="email" inputMode="email" enterKeyHint="next" autoComplete="username" autoCapitalize="none" spellCheck={false} className="input" placeholder="Email Id" readOnly={Boolean(pendingAction)} />
            </div>
            <div className="dt-auth-field">
              <label htmlFor="dt-password"><FiLock aria-hidden="true" />Password</label>
              <div className="dt-auth-password">
                <input id="dt-password" name="password" ref={password} type={showPass ? 'text' : 'password'} enterKeyHint={isSignUpPage && otpInput ? 'next' : 'go'} autoComplete={isSignUpPage ? 'new-password' : 'current-password'} className="input" placeholder="Password" readOnly={Boolean(pendingAction)} />
                <button type="button" className="dt-password-toggle" aria-label={showPass ? 'Hide password' : 'Show password'} aria-pressed={showPass} onClick={() => setShowPass(!showPass)}>
                  {showPass ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}
                </button>
              </div>
            </div>
            <div className="dt-auth-field" hidden={!isSignUpPage || !otpInput}>
              <label htmlFor="dt-otp"><FiKey aria-hidden="true" />Verification code</label>
              <input id="dt-otp" name="one-time-code" ref={otp} type="text" inputMode="numeric" enterKeyHint="go" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" className="input" placeholder="6-digit code" disabled={Boolean(pendingAction)} />
              {startTime !== null && <CountdownTimer startTime={startTime} onResend={handleOtp} disabled={Boolean(pendingAction)} />}
            </div>
            {!isSignUpPage && <div className="dt-auth-remember">
              <label><input type="checkbox" checked={rememberEmail} onChange={event => {
                setRememberEmail(event.target.checked);
                if (!event.target.checked) { try { localStorage.removeItem('devtinder.remembered-email'); } catch { /* Optional preference. */ } }
              }} /> Remember my email</label>
              <p>{isAndroid() ? 'Use your password manager or save this account securely below.' : 'Your password manager can save and autofill your password. DevTinder does not store it in browser storage.'}</p>
            </div>}
            {isAndroid() && <div className="dt-auth-remember"><label><input type="checkbox" checked={saveAccount} onChange={event => setSaveAccount(event.target.checked)} />Save this account on my phone</label><p>Encrypted on this device. Screen lock is required to use it.</p></div>}
            <div className="dt-auth-actions">
              <button type="submit" disabled={Boolean(pendingAction)} className="btn dt-auth-submit">
                {pendingAction ? pendingAction + '…' : isSignUpPage ? (otpInput ? 'Verify & Sign Up' : 'Send Otp') : 'Login'}
              </button>
              {pendingAction && <p className="dt-auth-wait" role="status">Signing you in securely. Please keep this page open.</p>}
              <button type="button" disabled={Boolean(pendingAction)} className="dt-auth-switch" onClick={() => chooseMode(!isSignUpPage)}>
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
