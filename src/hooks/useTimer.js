import { useEffect, useState } from "react";

function useTimer(initialTime = 0) {
    const [time, setTime] = useState(initialTime);
    const [isRunning, setIsRunning] = useState(false);

    useEffect(() => {
        if (!isRunning) return;

        const interval = setInterval(() => {
            setTime(prev => prev + 1);
        }, 1000);

        return () => clearInterval(interval);
    }, [isRunning]);

    const start = () => setIsRunning(true);
    const pause = () => setIsRunning(false);
    const reset = () => {
        setIsRunning(false);
        setTime(initialTime);
    };

    return {
        time,
        isRunning,
        start,
        pause,
        reset,
    };
}

export default useTimer;