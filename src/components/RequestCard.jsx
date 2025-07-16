import { ImCross } from "react-icons/im";
import { FaCheck } from "react-icons/fa";
import axios from "axios";
import { BASE_URL } from "../utils/constants"
import { toast } from "react-toastify";
import { useDispatch } from "react-redux";
import { removeRequest } from "../utils/requestsSlice";

const RequestCard = ({user}) => {

  const dispatch=useDispatch();
  const handleStatus= async (status, _id)=>{
    try {
      const review= await axios.post(BASE_URL+"/request/review/"+status+"/"+_id,{},{withCredentials:true});
      toast.success(review.data);
      dispatch(removeRequest(_id));
    } catch (error) {""}
  }
  const { photoUrl, firstName, lastName, gender, about, skills, age} = user;
  return (
    <div className="flex justify-center pt-4">
      <div className="flex rounded-md bg-[#111] w-6/12 h-30 shadow-sm overflow-auto">
          <div><img className="w-30 h-30 rounded-l-md" src={photoUrl} alt="user" /></div>
          <div className="flex px-5 my-1 w-11/12 justify-between">
          <div>
            <p className="text-lg font-semibold">{firstName + " " + lastName}</p>
            <p className="text-sm text-gray-400">{age} {gender}</p>
            <p className="text-sm text-gray-400">{about}</p>
            <p className="text-sm text-gray-400">{skills}</p>
          </div>
          <div className="flex justify-between gap-2">
            <button className="btn bg-gradient-to-br to-[#026e1fcd] from-[#0fc418] hover:from-[#08cb1bd8] hover:scale-[110%] transition-colors duration-200 w-15 my-auto" onClick={()=>{handleStatus("accepted",user._id)}}><FaCheck /></button>
            <button className="btn bg-gradient-to-br to-[#6e0202cd] from-[#c40f12] hover:from-[#cb0828d8] hover:scale-[110%] transition-colors duration-200 w-15 my-auto" onClick={()=>{handleStatus("rejected",user._id)}}><ImCross /></button>
          </div>
          </div>
      </div>
    </div>
  );
}

export default RequestCard