import axios from "axios";
import { useState } from "react";
import { BASE_URL } from "../utils/constants";
import { toast } from "react-toastify";
import { useDispatch } from "react-redux";
import { addUser } from "../utils/userSlice";
import UserCard from "./UserCard";

const ProfileEdit = ({ user }) => {
  const dispatch = useDispatch();
  const [firstName, setFirstName] = useState(user.firstName || "");
  const [lastName, setLastName] = useState(user.lastName || "");
  const [age, setAge] = useState(user.age || "");
  const [gender, setGender] = useState(user.gender || "");
  const [skills, setSkills] = useState(user.skills);
  const [about, setAbout] = useState(user.about || "");
  const [photoUrl, setPhotoUrl] = useState(user.photoUrl);

  const handleUpdate = async () => {
    try {
      const res = await axios.patch(
        BASE_URL + "/profile/edit",
        { firstName, lastName, age, skills, gender, about, photoUrl },
        { withCredentials: true }
      );
      dispatch(addUser(res.data.data));
      toast.success(res.data.message);
    } catch (err) {
      toast.error(err.response.data);
    }
  };

  return (
    <div className="flex justify-center gap-10">
      <div><UserCard user={ {_id:user._id, firstName, lastName, age, skills, gender, about, photoUrl} }/></div>
      <div className="card w-96 bg-[#0f0f10] card-lg shadow-sm">
        <form className="card-body" onSubmit={(e) =>{
          e.preventDefault();
          handleUpdate();
        }}>
          <h2 className="card-title mb-1 text-2xl">Update Profile</h2>
          <div>
            <fieldset className="fieldset">
              <p>First Name</p>
              <input
                type="text"
                className="input"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </fieldset>
            <fieldset className="fieldset">
              <p>Last Name</p>
              <input
                type="text"
                className="input"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </fieldset>
            <fieldset className="fieldset">
              <p>Age</p>
              <input
                type="text"
                className="input"
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />
            </fieldset>
            <fieldset className="fieldset">
              <p>Gender</p>
              <select
                className="select"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                <option value=""></option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Others">Others</option>
              </select>
            </fieldset>
            <fieldset className="fieldset">
              <p>Skills</p>
              <input
                type="text"
                className="input"
                value={skills}
                onChange={(e) => setSkills(e.target.value.split(","))}
              />
            </fieldset>
            <fieldset className="fieldset">
              <p>About</p>
              <input
                type="text"
                className="input"
                value={about}
                onChange={(e) => setAbout(e.target.value)}
              />
            </fieldset>
            <fieldset className="fieldset">
              <p>Photo Url</p>
              <input
                type="text"
                className="input"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
              />
            </fieldset>
          </div>
          <div className="flex justify-center card-actions">
            <button
              className="btn bg-gradient-to-br to-[#020b6ecd] from-[#0F5BC4] mt-8 mb-10 w-full hover:from-[#0818cbd8] transition-colors duration-500"
            >
              Update Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileEdit;
