import axios from "axios";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { BASE_URL } from "../utils/constants";
import { toast } from "react-toastify";
import { removeCard } from "../utils/feedSlice";
import { FaGithub, FaTrophy, FaExternalLinkAlt, FaChevronDown, FaChevronUp } from "react-icons/fa";

const UserCard = ({ user }) => {
  const { _id, firstName, lastName, age, gender, skills, about, photoUrl, githubHandle, codeforcesHandle, integrations } = user;
  
  const loggedInUserId = useSelector((store) => store.user._id);
  const dispatch = useDispatch();

  const [showGithubDrawer, setShowGithubDrawer] = useState(false);
  const [showCfDrawer, setShowCfDrawer] = useState(false);

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
      console.error(error);
    }
  };

  return (
    <div className="flex justify-center">
      <div className="card bg-[#0f0f0f] w-64 md:w-80 shadow-xl border border-gray-800 overflow-hidden">
        <figure>
          <img
            src={photoUrl || "https://via.placeholder.com/300"}
            alt="user"
            className="w-full h-64 md:h-80 object-cover"
          />
        </figure>
        
        <div className="card-body p-4 gap-2">
          <h2 className="card-title text-white">{firstName + " " + lastName}</h2>
          <p className="text-xs text-gray-400">
            {age} • {gender}
          </p>
          <p className="text-xs text-gray-300 italic mb-2">"{about}"</p>
          
          <div className="flex flex-wrap gap-1 mb-2">
            {skills?.map((skill, index) => (
              <span key={index} className="badge badge-sm badge-outline text-[10px] opacity-70">{skill}</span>
            ))}
          </div>


          <div className="flex flex-col gap-2 mt-1">
            
            {githubHandle && (
              <div className="bg-[#1a1a1a] rounded-md border border-gray-800 overflow-hidden">
                <div 
                  onClick={() => setShowGithubDrawer(!showGithubDrawer)}
                  className="flex items-center justify-between p-2 cursor-pointer hover:bg-[#222] transition-colors"
                >
                  <div className="flex items-center gap-2 text-white text-[11px] font-bold">
                    <FaGithub className="text-blue-500" />
                    <span>Github: @{githubHandle}</span>
                  </div>
                  {showGithubDrawer ? <FaChevronUp className="text-[10px]" /> : <FaChevronDown className="text-[10px]" />}
                </div>

                {showGithubDrawer && (
                  <div className="p-3 bg-[#0a0a0a] border-t border-gray-800 animate-in fade-in slide-in-from-top-1">
                    <div className="flex items-center gap-3 mb-3 border-b border-gray-900 pb-2">
                      <img 
                        src={integrations?.github?.avatar_url} 
                        className="w-10 h-10 rounded-md border border-gray-700 object-cover" 
                        alt="gh-pfp" 
                      />
                      <div>
                        <p className="text-white text-xs font-bold">{integrations?.github?.name || githubHandle}</p>
                        <p className="text-[10px] text-gray-500">{integrations?.github?.company || "Independent Dev"}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="bg-[#151515] p-2 rounded text-center">
                        <p className="text-blue-400 font-bold text-sm">{integrations?.github?.public_repos || 0}</p>
                        <p className="text-[8px] uppercase text-gray-500">Repos</p>
                      </div>
                      <div className="bg-[#151515] p-2 rounded text-center">
                        <p className="text-blue-400 font-bold text-sm">{integrations?.github?.followers || 0}</p>
                        <p className="text-[8px] uppercase text-gray-500">Followers</p>
                      </div>
                    </div>
                    <a href={`https://github.com/${githubHandle}`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1 text-[10px] text-blue-500 hover:underline">
                      Open Profile <FaExternalLinkAlt className="text-[8px]" />
                    </a>
                  </div>
                )}
              </div>
            )}

            {codeforcesHandle && (
              <div className="bg-[#1a1a1a] rounded-md border border-gray-800 overflow-hidden">
                <div 
                  onClick={() => setShowCfDrawer(!showCfDrawer)}
                  className="flex items-center justify-between p-2 cursor-pointer hover:bg-[#222] transition-colors"
                >
                  <div className="flex items-center gap-2 text-white text-[11px] font-bold">
                    <FaTrophy className="text-yellow-500" />
                    <span>Codeforces: {codeforcesHandle}</span>
                  </div>
                  {showCfDrawer ? <FaChevronUp className="text-[10px]" /> : <FaChevronDown className="text-[10px]" />}
                </div>

                {showCfDrawer && (
                  <div className="p-3 bg-[#0a0a0a] border-t border-gray-800 animate-in fade-in slide-in-from-top-1">
                    <div className="flex items-center gap-3 mb-3 border-b border-gray-900 pb-2">
                      <img 
                        src={integrations?.codeforces?.titlePhoto} 
                        className="w-10 h-10 rounded-md border border-gray-700 object-cover" 
                        alt="cf-pfp" 
                      />
                      <div>
                        <p className="text-white text-xs font-bold capitalize">{integrations?.codeforces?.rank || "Unrated"}</p>
                        <p className="text-[10px] text-gray-500">Current Rating: {integrations?.codeforces?.rating || 0}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="bg-[#151515] p-2 rounded text-center">
                        <p className="text-yellow-500 font-bold text-sm capitalize">{integrations?.codeforces?.rank || "N/A"}</p>
                        <p className="text-[8px] uppercase text-gray-500">Rank</p>
                      </div>
                      <div className="bg-[#151515] p-2 rounded text-center">
                        <p className="text-yellow-500 font-bold text-sm">{integrations?.codeforces?.rating || 0}</p>
                        <p className="text-[8px] uppercase text-gray-500">Rating</p>
                      </div>
                    </div>
                    <a href={`https://codeforces.com/profile/${codeforcesHandle}`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1 text-[10px] text-yellow-500 hover:underline">
                      Open Profile <FaExternalLinkAlt className="text-[8px]" />
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>

          {loggedInUserId !== _id && (
            <div className="flex justify-between gap-2 mt-4">
              <button
                className="btn btn-sm flex-1 bg-gradient-to-br to-[#026e1fcd] from-[#0fc418] border-none text-white text-[10px]"
                onClick={() => handleStatus("interested", _id)}
              >
                INTERESTED
              </button>
              <button
                className="btn btn-sm flex-1 bg-gradient-to-br to-[#6e0202cd] from-[#c40f12] border-none text-white text-[10px]"
                onClick={() => handleStatus("ignored", _id)}
              >
                IGNORE
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserCard;