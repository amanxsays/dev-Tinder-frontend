import axios from 'axios';
import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux';
import { addRequests } from '../utils/requestsSlice'
import { BASE_URL } from '../utils/constants'
import RequestCard from './RequestCard';

const Requests = () => {
  const requests = useSelector((store) => store.request);
  const dispatch = useDispatch();

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests= async () => {
    if(requests) return;
    try {
      const res = await axios.get( BASE_URL + "/user/requests/received",{
        withCredentials: true,
      });
      dispatch(addRequests(res.data));
    } catch (error) {error
    }
  };
  if (requests==null) return;
  if (requests.length == 0) return <div className="text-3xl font-mono pt-2 flex justify-center"><p>No Request !</p></div>;
  return (
    <div>
      <div className="text-3xl font-mono pt-2 flex justify-center"><p>Requests</p></div>
      {requests.map((user) => (
        <RequestCard user={user.fromUserId} time={user.updatedAt} />
      ))}
    </div>
  );
}

export default Requests