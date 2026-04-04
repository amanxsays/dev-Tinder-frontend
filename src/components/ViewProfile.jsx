import axios from "axios";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { BASE_URL } from "../utils/constants";
import UserCard from "./UserCard";

const ViewProfile = () => {
  const { userId } = useParams();
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  const fetchUserProfile = async () => {
    try {
      const res = await axios.get(BASE_URL + "/profile/view/" + userId, {
        withCredentials: true,
      });
      setUser(res.data);
    } catch (err) {
      setError("User not found or something went wrong.");
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, [userId]);

  if (error) return <div className="text-center mt-10 text-red-500 font-bold">{error}</div>;
  
  if (!user) return (
    <div className="flex justify-center mt-20">
      <span className="loading loading-dots loading-lg"></span>
    </div>
  );

  return (
    <div className="flex justify-center mt-10 mb-10">
      <UserCard user={user} />
    </div>
  );
};

export default ViewProfile;