import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { createSocketConnection } from "../utils/socket";

const Chat = () => {
  const { targetUserId } = useParams();
  const [messages, setMessages] = useState([]);
  const user = useSelector((store) => store.user);
  const userId = user?._id;
  const photoUrl=user?.photoUrl;
  const msg = useRef("");

  useEffect(() => {
    if (!userId) return;
    const socket = createSocketConnection();

    socket.emit("joinChat", { userId, targetUserId });
    
    socket.on("messageReceived", ({ firstName, text ,photoUrl}) => {
      setMessages((messages)=>[...messages, { firstName, text, photoUrl }]);
    });

    return () => {
      socket.disconnect();
    };
  }, [userId, targetUserId]);

  const handleSend = () => {
    const socket = createSocketConnection();
    socket.emit("sendMessage", {
      firstName: user.firstName,
      userId,
      targetUserId,
      text: msg.current.value,
      photoUrl
    });
    msg.current.value="";
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
                {mess.firstName!=user.firstName?<div className="chat chat-start">
                  <div className="chat-image avatar">
                    <div className="w-10 rounded-full">
                      <img
                        alt="Tailwind CSS chat bubble component"
                        src={mess.photoUrl}
                      />
                    </div>
                  </div>
                  <div className="chat-header">
                    {mess.firstName}
                    <time className="text-xs opacity-50">12:45</time>
                  </div>
                  <div className="chat-bubble">{mess.text}</div>
                  <div className="chat-footer opacity-50">Delivered</div>
                </div>:
                <div className="chat chat-end">
                  <div className="chat-image avatar">
                    <div className="w-10 rounded-full">
                      <img
                        alt="Tailwind CSS chat bubble component"
                        src={mess.photoUrl}
                      />
                    </div>
                  </div>
                  <div className="chat-header">
                    {mess.firstName}
                    <time className="text-xs opacity-50">12:46</time>
                  </div>
                  <div className="chat-bubble">{mess.text}</div>
                  <div className="chat-footer opacity-50">Seen at 12:46</div>
                </div>}
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
          <fieldset className="fieldset p-0 m-0 w-screen">
            <input
              ref={msg}
              type="text"
              className="input w-full"
              placeholder="Type a message"
            />
          </fieldset>
          <button className="btn bg-gradient-to-br to-[#020b6ecd] from-[#0F5BC4] hover:opacity-70- w-20 my-auto rounded-l-none">
            Send
          </button>
        </form>
        </div>
      </div>
    </>
  );
};

export default Chat;
