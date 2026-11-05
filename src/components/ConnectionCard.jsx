import { Link } from "react-router-dom";
import UserAvatar from './UserAvatar';

const ConnectionCard = ({ user }) => {
  const { _id, firstName, lastName, gender, age } = user;
  
  return (
    <div className="flex justify-center pt-4">
      <div className="dt-person-row flex rounded-md bg-[#111] w-6/12 h-20 shadow-sm">
        <div>
          <Link to={`/profile/${_id}`}><UserAvatar user={user} className="dt-person-avatar w-20 h-20 rounded-l-md object-cover" /></Link>
        </div>
        <div className="dt-person-body flex px-5 w-11/12 justify-between items-center">
          <div className="dt-person-copy">
            <p className="text-lg font-semibold">{firstName + " " + lastName}</p>
            <p className="text-sm text-gray-400">{age} {gender}</p>
          </div>
          <div className="dt-person-actions flex gap-3">
            <Link to={"/profile/" + _id} className="btn btn-outline border-gray-600 text-gray-300 hover:bg-[#1a1a1a] transition-colors duration-500 w-20">
                Profile
            </Link>
            <Link to={"/chat/" + _id} className="btn bg-gradient-to-br to-[#020b6ecd] from-[#0F5BC4] hover:from-[#0818cbd8] transition-colors duration-500 w-20 border-none text-white">
                Chat
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectionCard;
