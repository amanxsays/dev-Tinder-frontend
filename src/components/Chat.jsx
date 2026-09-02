import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { createSocketConnection } from "../utils/socket";
import axios from "axios";
import { BASE_URL } from "../utils/constants";

const Chat = () => {
  const { targetUserId } = useParams();
  const [messages, setMessages] = useState([]);
  const user = useSelector((store) => store.user);
  const userId = user?._id;
  const photoUrl = user?.photoUrl;
  const msg = useRef("");

  // Assuming you have a specific ID or way to know if this is the AI chat
  const isAIChat = targetUserId === "ai-agent"; // CHANGE THIS to whatever ID your AI uses

  const fetchChat = async () => {
    try {
      const chat = await axios(BASE_URL + "/chat/" + targetUserId, {
        withCredentials: true,
      });

      const chatMessages = chat?.data?.messages.map((msg) => {
        return {
          firstName: msg.senderId.firstName,
          photoUrl: msg.senderId.photoUrl,
          text: msg.text,
          time: msg.updatedAt,
        };
      });
      setMessages(chatMessages || []);
    } catch (err) {
      console.error("Failed to fetch chat", err);
    }
  };

  useEffect(() => {
    fetchChat();
  }, [targetUserId]);

  // Only connect to WebSocket if it's a human chat
  useEffect(() => {
    if (!userId || isAIChat) return;
    
    const socket = createSocketConnection();
    socket.emit("joinChat", { userId, targetUserId });

    socket.on("messageReceived", ({ firstName, text, photoUrl }) => {
      setMessages((messages) => [...messages, { firstName, text, photoUrl, time: handleTime(new Date()) }]);
    });

    return () => {
      socket.disconnect();
    };
  }, [userId, targetUserId, isAIChat]);

  const handleAIStream = (query) => {
    const jobId = crypto.randomUUID(); 
    
    // Add the 'id' field so we can target this exact bubble
    setMessages((prev) => [...prev, { 
        id: jobId, 
        firstName: "Agentic AI", 
        text: "Connecting to Agentic AI...", 
        photoUrl: "https://cdn-icons-png.flaticon.com/512/4712/4712027.png", 
        time: handleTime(new Date()),
        isStatus: true 
    }]);

    const eventSource = new EventSource(`${BASE_URL}/chat/stream?jobId=${jobId}&query=${encodeURIComponent(query)}&userId=${userId}`);

    // Update by matching the jobId
    eventSource.addEventListener("status", (event) => {
      setMessages((prev) => prev.map(msg => 
        msg.id === jobId ? { ...msg, text: event.data } : msg
      ));
    });

    // Final answer update
    eventSource.addEventListener("message", (event) => {
      setMessages((prev) => prev.map(msg => 
        // Swap out the text and remove the pulsing status effect
        msg.id === jobId ? { ...msg, text: event.data, isStatus: false } : msg
      ));
      eventSource.close(); 
    });

    eventSource.onerror = () => {
      console.error("SSE Connection Error");
      eventSource.close();
    };
  };

  const handleSend = () => {
    const textValue = msg.current.value;
    if (!textValue.trim()) return;

    // Immediately push the user's own message to the UI
    setMessages((prev) => [...prev, { 
        firstName: user.firstName, 
        text: textValue, 
        photoUrl, 
        time: handleTime(new Date()) 
    }]);
    
    msg.current.value = "";

    // Route the message to either the AI Stream or the WebSockets
    if (isAIChat) {
      handleAIStream(textValue);
    } else {
      const socket = createSocketConnection();
      socket.emit("sendMessage", {
        firstName: user.firstName,
        userId,
        targetUserId,
        text: textValue,
        photoUrl,
      });
    }
  };

  const handleTime = (time) => {
    if (typeof time === "string" && /^\d{2}:\d{2}$/.test(time)) return time;
    const date = new Date(time);
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  return (
    <>
      <div className="bg-black m-10 mt-[11%] rounded-md p-2 min-h-screen">
        <div className="flex flex-col min-h-screen bg-[#11132686] border-1 rounded-md border-gray-700">
          <div className="bg-base-300 border-1 border-gray-500 p-2 rounded-t-md">
            <p>Chat</p>
          </div>
          <div className="m-1">
            {messages.map((mess, index) => {
              return (
                <div key={index}>
                  {mess.firstName !== user.firstName ? (
                    <div className="chat chat-start">
                      <div className="chat-image avatar">
                        <div className="w-10 rounded-full">
                          <img alt="avatar" src={mess.photoUrl} />
                        </div>
                      </div>
                      <div className="chat-header">
                        {mess.firstName}
                        <time className="text-xs opacity-50 ml-1">{handleTime(mess.time)}</time>
                      </div>
                      <div className={`chat-bubble whitespace-pre-wrap ${mess.isStatus ? "bg-gray-600 animate-pulse" : ""}`}>
                          {mess.text}
                      </div>
                    </div>
                  ) : (
                    <div className="chat chat-end">
                      <div className="chat-image avatar">
                        <div className="w-10 rounded-full">
                          <img alt="avatar" src={mess.photoUrl} />
                        </div>
                      </div>
                      <div className="chat-header">
                        {mess.firstName}
                        <time className="text-xs opacity-50 ml-1">
                          {handleTime(mess.time)}
                        </time>
                      </div>
                      <div className="chat-bubble">{mess.text}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <form
            className="bg-gray-600 flex justify-between rounded-md mt-auto"
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
          >
            <fieldset className="fieldset p-0 m-0 w-full">
              <input
                ref={msg}
                type="text"
                className="input w-full"
                placeholder="Type a message"
              />
            </fieldset>
            <button className="btn bg-gradient-to-br to-[#020b6ecd] from-[#0F5BC4] w-20 my-auto rounded-l-none">
              Send
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

export default Chat;