import { ImCross } from "react-icons/im";
import { FaCheck } from "react-icons/fa";
import axios from "../platform/apiClient";
import { BASE_URL } from "../utils/constants";
import { toast } from "react-toastify";
import { useDispatch } from "react-redux";
import { removeRequest } from "../utils/requestsSlice";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { Link } from "react-router-dom";
import UserAvatar from './UserAvatar';

const RequestCard = ({ user, time }) => {

  const [pastTime, setPastTime] = useState("");
  setInterval(() => {setPastTime(formatDistanceToNow(time, { addSuffix: true }));}, 1000*60);

  const dispatch = useDispatch();
  const handleStatus = async (status, _id) => {
    try {
      const review = await axios.post(
        BASE_URL + "/request/review/" + status + "/" + _id,
        {},
        { withCredentials: true }
      );
      toast.success(review.data);
      dispatch(removeRequest(_id));
    } catch (error) {
      error;
    }
  };
  const { firstName, lastName, gender, about, skills, age } = user;
  return (
    <div className="flex justify-center pt-4">
      <div className="dt-person-row dt-request-row flex rounded-md bg-[#111] w-6/12 h-30 shadow-sm overflow-auto">
        <div>
          <Link to={`/profile/${user._id}`}><UserAvatar user={user} className="dt-person-avatar w-30 h-30 rounded-l-md" /></Link>
        </div>
        <div className="dt-person-body flex px-5 my-1 w-11/12 justify-between">
          <div className="dt-person-copy">
            <p className="text-lg font-semibold">
              {firstName + " " + lastName}
            </p>
            <p className="text-sm text-gray-400">
              {age} {gender}
            </p>
            <p className="text-sm text-gray-400">{about}</p>
            <p className="text-sm text-gray-400">{skills}</p>
          </div>
          <div className="dt-person-actions"><p className="text-gray-500 text-xs mb-5 flex justify-end">{pastTime}</p>
          <div className="flex justify-between gap-2">
            <button
              aria-label={`Accept ${firstName}'s connection request`}
              className="btn bg-gradient-to-br to-[#026e1fcd] from-[#0fc418] hover:from-[#08cb1bd8] hover:scale-[110%] transition-colors duration-200 w-15 my-auto"
              onClick={() => {
                handleStatus("accepted", user._id);
              }}
            >
              <FaCheck />
            </button>
            <button
              aria-label={`Reject ${firstName}'s connection request`}
              className="btn bg-gradient-to-br to-[#6e0202cd] from-[#c40f12] hover:from-[#cb0828d8] hover:scale-[110%] transition-colors duration-200 w-15 my-auto"
              onClick={() => {
                handleStatus("rejected", user._id);
              }}
            >
              <ImCross />
            </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RequestCard;
