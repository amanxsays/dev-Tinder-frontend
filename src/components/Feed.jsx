import { useEffect } from "react";
import UserCard from "./UserCard";
import axios from "axios";
import { BASE_URL } from "../utils/constants";
import { useDispatch, useSelector } from "react-redux";
import {addFeed} from "../utils/feedSlice";

const Feed = () => {

  const dispatch=useDispatch();
  const feed=useSelector( store => store.feed );
  useEffect(() => {
    fetchFeed();
  }, []);

  const fetchFeed = async () => {
    if(feed) return;
    try {
      const feedUsers = await axios.get(BASE_URL + "/user/feed", {
        withCredentials: true,
      });
      dispatch(addFeed(feedUsers.data));
    } catch (error) {error
    }
  };
  if(!feed) return;
  if(feed.length==0) return <div className="text-3xl font-mono pt-2 flex justify-center"><p>No more users present !</p></div>;
  return feed && (
    <div className="pt-10">
      <UserCard user={feed[0]}/>
    </div>
  );
};

export default Feed;
