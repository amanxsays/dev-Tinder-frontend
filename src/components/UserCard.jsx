import axios from "axios";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { BASE_URL } from "../utils/constants";
import { toast } from "react-toastify";
import { removeCard } from "../utils/feedSlice";
import { FaGithub, FaTrophy, FaExternalLinkAlt, FaChevronDown, FaChevronUp } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, useAnimation, useMotionValue, useTransform } from "framer-motion";

const getCfColor = (rank) => {
  if (!rank) return "text-gray-500";
  const lowerRank = rank.toLowerCase();
  if (lowerRank.includes("newbie")) return "text-[#CCCCCC]";
  if (lowerRank.includes("pupil")) return "text-[#77FF77]";
  if (lowerRank.includes("specialist")) return "text-[#03A89E]";
  if (lowerRank.includes("expert")) return "text-[#0000FF]";
  if (lowerRank.includes("candidate master")) return "text-[#AA00AA]";
  if (lowerRank.includes("master")) return "text-[#FF8C00]";
  if (lowerRank.includes("grandmaster")) return "text-[#FF0000]";
  return "text-white";
};

const UserCard = ({ user }) => {
  const { _id, firstName, lastName, age, gender, skills, about, photoUrl, githubHandle, codeforcesHandle, integrations, connectionStatus } = user;
  const ghHandle = Array.isArray(githubHandle) ? githubHandle[0] : githubHandle;
  const cfHandle = Array.isArray(codeforcesHandle) ? codeforcesHandle[0] : codeforcesHandle;
  const loggedInUserId = useSelector((store) => store.user?._id);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const isProfilePage = location.pathname.includes('/profile');
  const [showGithubDrawer, setShowGithubDrawer] = useState(false);
  const [showCfDrawer, setShowCfDrawer] = useState(false);
  const [liveStats, setLiveStats] = useState(integrations || {});
  const [isSyncingGithub, setIsSyncingGithub] = useState(false);
  const [isSyncingCf, setIsSyncingCf] = useState(false);

  const controls = useAnimation();
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]);
  const backgroundColor = useTransform(x, [-150, 0, 150], ["rgba(239, 68, 68, 0.15)", "rgba(0, 0, 0, 0)", "rgba(34, 197, 94, 0.15)"]);
  const interestedOpacity = useTransform(x, [50, 150], [0, 1]);
  const ignoreOpacity = useTransform(x, [-50, -150], [0, 1]);

  const handleStatus = async (status, targetId) => {
    try {
      const res = await axios.post(BASE_URL + "/request/send/" + status + "/" + targetId, {}, { withCredentials: true });
      toast.success(res.data);
      dispatch(removeCard(targetId));
      if (isProfilePage) navigate("/");
    } catch (error) {
      console.error(error);
    }
  };

  const onDragEnd = async (event, info) => {
    const threshold = 100;
    if (info.offset.x > threshold || info.velocity.x > 500) {
      await controls.start({ x: 500, opacity: 0, transition: { duration: 0.2 } });
      handleStatus("interested", _id);
    } else if (info.offset.x < -threshold || info.velocity.x < -500) {
      await controls.start({ x: -500, opacity: 0, transition: { duration: 0.2 } });
      handleStatus("ignored", _id);
    } else {
      controls.start({ x: 0, opacity: 1, transition: { type: "spring", stiffness: 500, damping: 30 } });
    }
  };

  const triggerBackgroundSync = async (platform, handle) => {
    if (!handle) return;
    const isGithub = platform === 'github';
    if (isGithub) setIsSyncingGithub(true);
    else setIsSyncingCf(true);
    
    const SPRING_BACKEND_URL = import.meta.env.VITE_STATS_SERVICE_URL || "https://dev-tinder-spring-backend.onrender.com";
    
    try {
      const response = await axios.get(
        `${SPRING_BACKEND_URL}/api/stats?${platform}=${handle}&userId=${_id}`
      );

      let fetchedStats = null;

      if (response.data[platform]) {
        fetchedStats = response.data[platform];
      } else if (response.data.integrations && response.data.integrations[platform]) {
        fetchedStats = response.data.integrations[platform];
      } else if (response.data && typeof response.data === 'object') {
        fetchedStats = response.data;
      }

      if (fetchedStats) {
        setLiveStats(prev => ({ ...prev, [platform]: fetchedStats }));
      }

    } catch (error) {
      console.error(`Failed to sync ${platform}:`, error);
    } finally {
      if (isGithub) setIsSyncingGithub(false);
      else setIsSyncingCf(false);
    }
  };

  const handleGithubClick = (e) => {
    e.stopPropagation();
    const willOpen = !showGithubDrawer;
    setShowGithubDrawer(willOpen);
    if (willOpen) triggerBackgroundSync('github', ghHandle);
  };

  const handleCfClick = (e) => {
    e.stopPropagation();
    const willOpen = !showCfDrawer;
    setShowCfDrawer(willOpen);
    if (willOpen) triggerBackgroundSync('codeforces', cfHandle);
  };

  return (
    <div className="relative flex justify-center">
      {!isProfilePage && <motion.div style={{ backgroundColor }} className="fixed inset-0 z-0 pointer-events-none transition-colors duration-300" />}
      <motion.div
        animate={controls}
        style={{ x, rotate, opacity }}
        drag={!isProfilePage ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.9}
        onDragEnd={onDragEnd}
        whileDrag={{ scale: 1.02 }}
        className="touch-none cursor-grab active:cursor-grabbing z-10 relative select-none"
      >
        {!isProfilePage && (
          <>
            <motion.div style={{ opacity: interestedOpacity }} className="absolute top-10 left-6 z-30 border-4 border-green-500 text-green-500 font-black text-2xl px-2 py-1 rounded-md rotate-[-20deg] pointer-events-none">INTERESTED</motion.div>
            <motion.div style={{ opacity: ignoreOpacity }} className="absolute top-10 right-6 z-30 border-4 border-red-500 text-red-500 font-black text-2xl px-2 py-1 rounded-md rotate-[20deg] pointer-events-none">IGNORE</motion.div>
          </>
        )}
        <div className="card bg-[#0f0f0f] w-72 md:w-80 shadow-2xl border border-gray-800 overflow-hidden">
          <div className="relative h-72 md:h-80 w-full overflow-hidden">
            <img src={photoUrl || "https://via.placeholder.com/300"} alt="user" draggable="false" className="w-full h-full object-cover pointer-events-none" />
            <motion.div onTap={() => navigate(`/profile/${_id}`)} className="absolute inset-0 z-20 cursor-pointer bg-transparent" />
          </div>
          <div className="card-body p-4 gap-2">
            <h2 className="card-title text-white">{firstName + " " + lastName}</h2>
            <p className="text-xs text-gray-400">{age} • {gender}</p>
            <p className="text-xs text-gray-300 italic mb-2 line-clamp-2">"{about}"</p>
            <div className="flex flex-wrap gap-1 mb-2">
              {skills?.map((skill, index) => <span key={index} className="badge badge-sm badge-outline text-[10px] opacity-70">{skill}</span>)}
            </div>
            <div className="flex flex-col gap-2 mt-1">
              {ghHandle && (
                <div className="bg-[#1a1a1a] rounded-md border border-gray-800 overflow-hidden">
                  <div onClick={handleGithubClick} className="flex items-center justify-between p-2 cursor-pointer hover:bg-[#222]">
                    <div className="flex items-center gap-2 text-white text-[11px] font-bold">
                      <FaGithub className="text-blue-500" /><span>Github: @{ghHandle}</span>
                    </div>
                    {isSyncingGithub ? (
                        <span className="loading loading-spinner loading-xs text-blue-500"></span>
                    ) : (
                        showGithubDrawer ? <FaChevronUp className="text-[10px]" /> : <FaChevronDown className="text-[10px]" />
                    )}
                  </div>
                  
                  {showGithubDrawer && (
                    <div className="p-3 bg-[#0a0a0a] border-t border-gray-800">
                      {!liveStats?.github && isSyncingGithub && (
                          <div className="flex flex-col items-center justify-center py-2">
                              <span className="loading loading-spinner text-blue-500 mb-2"></span>
                              <p className="text-[10px] text-gray-400">Fetching live stats...</p>
                          </div>
                      )}
                      {liveStats?.github && (
                        <div className={`transition-opacity duration-500 ${isSyncingGithub ? 'opacity-50' : 'opacity-100'}`}>
                          <div className="flex items-center gap-3 mb-3 border-b border-gray-900 pb-2">
                            <img src={liveStats.github.avatar_url || liveStats.github.avatarUrl} className="w-10 h-10 rounded-md border border-gray-700 object-cover" alt="gh" />
                            <div><p className="text-white text-xs font-bold">{liveStats.github.name || ghHandle}</p><p className="text-[10px] text-gray-500">{liveStats.github.company || "Independent Dev"}</p></div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-center">
                            <div className="bg-[#151515] p-1 rounded"><p className="text-blue-400 font-bold text-sm">{liveStats.github.public_repos || liveStats.github.publicRepos || 0}</p><p className="text-[8px] uppercase text-gray-500">Repos</p></div>
                            <div className="bg-[#151515] p-1 rounded"><p className="text-blue-400 font-bold text-sm">{liveStats.github.followers || 0}</p><p className="text-[8px] uppercase text-gray-500">Followers</p></div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              {cfHandle && (
                <div className="bg-[#1a1a1a] rounded-md border border-gray-800 overflow-hidden">
                  <div onClick={handleCfClick} className="flex items-center justify-between p-2 cursor-pointer hover:bg-[#222]">
                    <div className="flex items-center gap-2 text-white text-[11px] font-bold">
                      <FaTrophy className="text-yellow-500" /><span>Codeforces: {cfHandle}</span>
                    </div>
                    {isSyncingCf ? (
                        <span className="loading loading-spinner loading-xs text-yellow-500"></span>
                    ) : (
                        showCfDrawer ? <FaChevronUp className="text-[10px]" /> : <FaChevronDown className="text-[10px]" />
                    )}
                  </div>
                  
                  {showCfDrawer && (
                    <div className="p-3 bg-[#0a0a0a] border-t border-gray-800">
                      {!liveStats?.codeforces && isSyncingCf && (
                          <div className="flex flex-col items-center justify-center py-2">
                              <span className="loading loading-spinner text-yellow-500 mb-2"></span>
                              <p className="text-[10px] text-gray-400">Fetching live stats...</p>
                          </div>
                      )}
                      {liveStats?.codeforces && (
                        <div className={`transition-opacity duration-500 ${isSyncingCf ? 'opacity-50' : 'opacity-100'}`}>
                          <div className="flex items-center gap-3 mb-3 border-b border-gray-900 pb-2">
                            <img src={liveStats.codeforces.titlePhoto} className="w-10 h-10 rounded-md border border-gray-700 object-cover" alt="cf" />
                            <div><p className={`${getCfColor(liveStats.codeforces.rank)} text-xs font-bold capitalize`}>{liveStats.codeforces.rank || "Unrated"}</p><p className="text-[10px] text-gray-500">Rating: {liveStats.codeforces.rating || 0}</p></div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-center">
                            <div className="bg-[#151515] p-1 rounded"><p className={`${getCfColor(liveStats.codeforces.rank)} font-bold text-sm`}>{liveStats.codeforces.rank || "N/A"}</p><p className="text-[8px] uppercase text-gray-500">Rank</p></div>
                            <div className="bg-[#151515] p-1 rounded"><p className={`${getCfColor(liveStats.codeforces.rank)} font-bold text-sm`}>{liveStats.codeforces.rating || 0}</p><p className="text-[8px] uppercase text-gray-500">Rating</p></div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            {!isProfilePage && <button onClick={(e) => { e.stopPropagation(); navigate(`/profile/${_id}`); }} className="btn btn-xs btn-outline border-blue-600 text-blue-400 w-full mt-2">View Full Profile</button>}
            {loggedInUserId !== _id && !connectionStatus && (
              <div className="flex justify-between gap-2 mt-4">
                <button className="btn btn-sm flex-1 bg-green-600 border-none text-white text-[10px]" onClick={(e) => { e.stopPropagation(); handleStatus("interested", _id); }}>INTERESTED</button>
                <button className="btn btn-sm flex-1 bg-red-600 border-none text-white text-[10px]" onClick={(e) => { e.stopPropagation(); handleStatus("ignored", _id); }}>IGNORE</button>
              </div>
            )}
            {connectionStatus && isProfilePage && (
                <div className="mt-4 text-center">
                    <span className={`badge badge-outline w-full p-3 font-bold uppercase text-[10px] ${connectionStatus === 'accepted' ? 'text-green-500 border-green-500' : connectionStatus === 'interested' ? 'text-blue-500 border-blue-500' : 'text-red-500 border-red-500'}`}>Status: {connectionStatus}</span>
                </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default UserCard;