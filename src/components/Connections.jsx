import axios from "axios";
import { useEffect } from "react";
import { BASE_URL } from "../utils/constants";
import { useDispatch, useSelector } from "react-redux";
import { addConnections } from "../utils/connectionsSlice";
import ConnectionCard from "./ConnectionCard";

const Connections = () => {
  const dispatch = useDispatch();
  const connections = useSelector((store) => store.connection);
  useEffect(() => {
    fetchConnections();
  }, []);
  const fetchConnections = async () => {
    if(connections) return;
    try {
      const res = await axios.get(BASE_URL + "/user/connections", {
        withCredentials: true,
      });
      dispatch(addConnections(res.data));
    } catch (error) {""}
  };
  if (!connections) return;
  if (connections.length == 0) return <div className="text-3xl font-mono pt-2 flex justify-center"><p>No Connection !</p></div>;
  return (
    <div>
      <div className="text-3xl font-mono pt-2 flex justify-center"><p>Connections</p></div>
      {connections.map((user) => (
        <ConnectionCard user={user} />
      ))}
    </div>
  );
};

export default Connections;
