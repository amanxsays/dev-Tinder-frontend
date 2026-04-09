import { useEffect,useState } from "react";
import UserCard from "./UserCard";
import axios from "axios";
import { BASE_URL } from "../utils/constants";
import { useDispatch, useSelector } from "react-redux";
import {addFeed} from "../utils/feedSlice";
import { FaSpinner } from "react-icons/fa";
import { AnimatePresence } from "framer-motion";

const Feed = () => {
  const [isLoading, setIsLoading] = useState(true);
  const dispatch=useDispatch();
  const feed=useSelector( store => store.feed );
  useEffect(() => {
    fetchFeed();
  }, []);

  const fetchFeed = async () => {
    if(feed) {
      setIsLoading(false);
      return; 
    }
    try {
      setIsLoading(true);
      const feedUsers = await axios.get(BASE_URL + "/user/feed", {
        withCredentials: true,
      });
      dispatch(addFeed(feedUsers.data));
    } catch (error) {error
    } finally {
        setIsLoading(false);
    }
  };
  if(isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <FaSpinner className="animate-spin text-blue-500 text-4xl mb-4" />
        <p className="text-gray-400 text-sm animate-pulse">
          Waking up the server... gathering developer stats 🧩
        </p>
      </div>
    );
  }
  if(!feed) return;
  if(feed.length==0) return <div className="text-3xl font-mono pt-2 flex justify-center"><p>No more users present !</p></div>;
  return feed && (
    <div className="flex justify-center items-start min-h-[80vh]">
      <AnimatePresence mode="wait">
        <UserCard key={feed[0]._id} user={feed[0]} />
      </AnimatePresence>
    </div>
  );
};

export default Feed;
