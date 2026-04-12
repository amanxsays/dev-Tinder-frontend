import React, { useEffect, useState } from "react";

function CountdownTimer({ startTime , onResend}) {
  const [timeLeft, setTimeLeft] = useState(2 * 60); // 2 minutes in second
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - startTime) / 1000);
      const remaining = 2 * 60 - elapsedSeconds;
      setTimeLeft(remaining > 0 ? remaining : 0);
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  if (timeLeft <= 0) {
    return (
      <div className="flex gap-1 text-[13px] mt-1 text-gray-400">
        Didn't receive the code? 
        <button 
          type="button" // VERY IMPORTANT: Prevents the form from submitting
          onClick={onResend} 
          className="text-blue-500 font-bold hover:underline cursor-pointer"
        >
          Resend OTP
        </button>
      </div>
    );
  }

  return (
      <p className="flex gap-1">
        <span className="text-[15px] mt-[-2px] font-semibold text-green-500">
          Otp will expire in <div className={`text-[15px] mt-[-2px] font-semibold ${minutes>=1 ? 'text-green-500' : 'text-red-500'}`}>{String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}</div>
        </span>
      </p>
  );
}

export default CountdownTimer;
