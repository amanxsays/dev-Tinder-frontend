import React, { useEffect, useState } from "react";

function CountdownTimer({ startTime }) {
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

  return (
      <p className="flex gap-1">
        Otp will expire in <div className={`text-[15px] mt-[-2px] font-semibold ${minutes>=1 ? 'text-green-500' : 'text-red-500'}`}>{String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}</div>
      </p>
  );
}

export default CountdownTimer;
