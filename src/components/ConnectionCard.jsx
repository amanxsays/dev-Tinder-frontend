import { Link } from "react-router-dom";

const ConnectionCard = ({ user }) => {
  const { photoUrl, firstName, lastName, gender ,age } = user;
  return (
    <div className="flex justify-center pt-4">
      <div className="flex rounded-md bg-[#111] w-6/12 h-20 shadow-sm">
          <div><img className="w-20 h-20 rounded-l-md" src={photoUrl} alt="user" /></div>
          <div className="flex px-5 my-1 w-11/12 justify-between">
          <div>
            <p className="text-lg font-semibold">{firstName + " " + lastName}</p>
            <p className="text-sm text-gray-400">{age} {gender}</p>
          </div>
          <Link to={"/chat/"+user._id}><button className="btn bg-gradient-to-br to-[#020b6ecd] from-[#0F5BC4] hover:from-[#0818cbd8] transition-colors duration-500 w-20 my-auto">Chat</button></Link>
        </div>
      </div>
    </div>
  );
};

export default ConnectionCard;
