import React, { useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useAgenticChat } from "../hooks/useAgenticChat";

const AiDrawerLayout = ({ children }) => {
    // Grab the user from Redux so we have their _id for the memory system
    const user = useSelector((store) => store.user);
    const msgRef = useRef("");
    const { askAiRecruiter, aiStatus, isAiThinking } = useAgenticChat();

    const [messages, setMessages] = useState([
        {
            sender: "ai",
            firstName: "DevTinder AI",
            photoUrl: "https://cdn-icons-png.flaticon.com/512/4712/4712027.png",
            text: "Hello! I am your Agentic AI recruiter. I can analyze profiles and remember your preferences. How can I help today?",
            time: new Date(),
        }
    ]);

    const handleTime = (time) => {
        const date = new Date(time);
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        return `${hours}:${minutes}`;
    };

    const handleSend = async () => {
        const userText = msgRef.current.value;
        if (!userText.trim()) return;

        const currentUserId = user?._id || "anonymous";

        setMessages((prev) => [
            ...prev,
            {
                sender: "user",
                firstName: user?.firstName || "You",
                photoUrl: user?.photoUrl || "https://cdn-icons-png.flaticon.com/512/847/847969.png",
                text: userText,
                time: new Date(),
            },
        ]);

        msgRef.current.value = "";

        await askAiRecruiter(userText, currentUserId, (finalAiText) => {
            setMessages((prev) => [
                ...prev,
                {
                    sender: "ai",
                    firstName: "DevTinder AI",
                    photoUrl: "https://cdn-icons-png.flaticon.com/512/4712/4712027.png",
                    text: finalAiText,
                    time: new Date(),
                },
            ]);
        });
    };

    return (
        <div className="drawer drawer-end h-screen">
            <input id="ai-drawer" type="checkbox" className="drawer-toggle" />

            <div className="drawer-content flex flex-col">
                {/* Main Application Content */}
                {children}

                {/* Floating Action Button */}
                <div className="fixed bottom-6 right-6 z-50">
                    <label htmlFor="ai-drawer" className="btn btn-circle btn-lg bg-gradient-to-br from-blue-600 to-indigo-800 hover:scale-105 border-none text-white shadow-2xl">
                        ✨
                    </label>
                </div>
            </div>

            <div className="drawer-side z-[100]">
                <label htmlFor="ai-drawer" aria-label="close sidebar" className="drawer-overlay"></label>

                <div className="menu p-4 w-96 min-h-full bg-[#111326] text-base-content flex flex-col border-l border-gray-700 shadow-2xl">

                    {/* Header */}
                    <div className="flex justify-between items-center border-b border-gray-700 pb-4 mb-4">
                        <div>
               <span className="font-bold text-lg text-blue-400 flex items-center gap-2">
                 ✨ AI Recruiter
               </span>
                            <p className="text-xs text-gray-400 mt-1">Long-Term Memory Active</p>
                        </div>
                        <label htmlFor="ai-drawer" className="btn btn-sm btn-circle btn-ghost text-white hover:bg-gray-800">✕</label>
                    </div>

                    {/* Chat Messages */}
                    <div className="flex-grow overflow-y-auto pb-4 space-y-4 pr-2">
                        {messages.map((mess, index) => (
                            <div key={index} className={`chat ${mess.sender === "user" ? "chat-end" : "chat-start"}`}>
                                <div className="chat-image avatar">
                                    <div className="w-8 rounded-full bg-gray-800 ring ring-primary ring-offset-base-100 ring-offset-2">
                                        <img alt="avatar" src={mess.photoUrl} />
                                    </div>
                                </div>
                                <div className="chat-header text-xs text-gray-400 mb-1">
                                    {mess.firstName} <time className="ml-1 opacity-70">{handleTime(mess.time)}</time>
                                </div>
                                <div className={`chat-bubble text-sm ${mess.sender === "ai" ? "bg-blue-900 text-white" : "bg-gray-700 text-white"}`}>
                                    {mess.text}
                                </div>
                            </div>
                        ))}

                        {/* Live Loading State */}
                        {isAiThinking && (
                            <div className="chat chat-start opacity-90 mt-4">
                                <div className="chat-image avatar w-8 rounded-full ring ring-blue-400 ring-offset-base-100 ring-offset-2">
                                    <img alt="ai-thinking" src="https://cdn-icons-png.flaticon.com/512/4712/4712027.png" />
                                </div>
                                <div className="chat-header text-blue-400 font-mono text-xs mb-1">
                                    Agent Working...
                                </div>
                                <div className="chat-bubble bg-transparent border border-blue-500 text-blue-300 text-sm">
                                    <span className="loading loading-dots loading-xs mr-2"></span>
                                    {aiStatus || "Analyzing..."}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input Area */}
                    <form
                        className="flex mt-auto pt-4 border-t border-gray-700"
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleSend();
                        }}
                    >
                        <input
                            ref={msgRef}
                            type="text"
                            className="input input-bordered w-full rounded-r-none bg-gray-800 border-gray-600 text-white focus:outline-none focus:border-blue-500"
                            placeholder="Search or set a preference..."
                            disabled={isAiThinking}
                        />
                        <button
                            disabled={isAiThinking}
                            className="btn bg-blue-600 hover:bg-blue-700 text-white border-none rounded-l-none"
                        >
                            Ask
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AiDrawerLayout;