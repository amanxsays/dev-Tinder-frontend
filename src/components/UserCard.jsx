import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { BASE_URL } from "../utils/constants";
import { toast } from "react-toastify";
import { removeCard } from "../utils/feedSlice";

const UserCard = ({ user }) => {
  const { _id, firstName, lastName, age, gender, skills, about, photoUrl } =
    user;
  const loggedInUserId = useSelector((store) => store.user._id);
  const dispatch = useDispatch();

  const handleStatus = async (status, _id) => {
    try {
      const send = await axios.post(
        BASE_URL + "/request/send/" + status + "/" + _id,
        {},
        { withCredentials: true }
      );
      toast.success(send.data);
      dispatch(removeCard(_id));
    } catch (error) {
      error;
    }
  };

  return (
    <div className="flex justify-center">
      <div className="card bg-[#131111] w-60 md:w-80 shadow-sm">
        <figure>
          <img
            src={photoUrl}
            alt="user"
            className="w-60 md:w-80 h-60 md:h-80 object-cover"
          />
        </figure>
        <div className="card-body">
          <h2 className="card-title">{firstName + " " + lastName}</h2>
          <p className="text-xs md:text-base">
            {age} {gender}
          </p>
          <p className="text-xs md:text-base">{skills.join(", ")}</p>
          <p className="text-xs md:text-base">{about}</p>
          {loggedInUserId != _id && (
            <div className="flex justify-between gap-2">
              <button
                className="btn bg-gradient-to-br to-[#026e1fcd] from-[#0fc418] hover:from-[#08cb1bd8] hover:scale-[110%] transition-colors duration-200 w-20 my-auto"
                onClick={() => {
                  handleStatus("interested", user._id);
                }}
              >
                Interested
              </button>
              <button
                className="btn bg-gradient-to-br to-[#6e0202cd] from-[#c40f12] hover:from-[#cb0828d8] hover:scale-[110%] transition-colors duration-200 w-20 my-auto"
                onClick={() => {
                  handleStatus("ignored", user._id);
                }}
              >
                Ignore
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserCard;
