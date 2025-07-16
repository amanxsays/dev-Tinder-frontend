import { useSelector } from "react-redux";

const UserCard = ({user}) => {
    const { _id, firstName, lastName, age, gender, skills, about, photoUrl}=user;
    const loggedInUserId=useSelector(store=>store.user._id);

  return (
    <div className="flex justify-center">
      <div className="card bg-[#131111] w-80 shadow-sm">
        <figure>
          <img
            src={photoUrl}
            alt="user"
            className="h-80 w-80 object-cover"
          />
        </figure>
        <div className="card-body">
          <h2 className="card-title">{firstName+" "+lastName}</h2>
          <p className="text-sm">{age}  {gender}</p>
          <p className="text-sm">{skills.join(", ")}</p>
          <p className="text-sm">{about}</p>
          {loggedInUserId!=_id && <div className="card-actions justify-end">
            <button className="btn btn-primary">Interested</button>
            <button className="btn btn-primary">Ignore</button>
          </div>}
        </div>
      </div>
    </div>
  );
};

export default UserCard;
