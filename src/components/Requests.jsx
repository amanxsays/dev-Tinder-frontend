import { useSelector } from 'react-redux';
import RequestCard from './RequestCard';

const Requests = () => {
  const requests = useSelector((store) => store.request);
  // The persistent header loads and refreshes the shared list on every route.
  if (requests==null) return <p className="text-center text-slate-400" role="status">Loading requests…</p>;
  if (requests.length == 0) return <div className="text-3xl font-mono pt-2 flex justify-center"><p>No Request !</p></div>;
  return (
    <div>
      <div className="text-3xl font-mono pt-2 flex justify-center"><p>Requests</p></div>
      {requests.map((user) => (
        <RequestCard key={user._id} user={user.fromUserId} time={user.updatedAt} />
      ))}
    </div>
  );
}

export default Requests
