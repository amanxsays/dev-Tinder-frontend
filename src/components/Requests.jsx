import { useSelector } from 'react-redux';
import RequestCard from './RequestCard';

const Requests = () => {
  const requests = useSelector((store) => store.request);
  // The persistent header loads and refreshes the shared list on every route.
  return (
    <section aria-labelledby="dt-requests-heading">
      <h1 id="dt-requests-heading" className="dt-section-title text-3xl font-mono pt-2 text-center">Requests</h1>
      {requests == null && <p className="text-center text-slate-400 py-8" role="status">Loading requests…</p>}
      {Array.isArray(requests) && requests.length === 0 && <p className="text-center text-slate-400 py-8">No pending requests.</p>}
      {Array.isArray(requests) && requests.map((user) => (
        <RequestCard key={user._id} user={user.fromUserId} time={user.updatedAt} />
      ))}
    </section>
  );
}

export default Requests
