import { RIDE_EXPIRY_MINUTES } from '../config';

// A ride counts as active while it is flagged active and younger than the expiry window.
export const isRideActive = (ride) =>
  Boolean(ride.isActive) && Date.now() - new Date(ride.createdAt).getTime() < RIDE_EXPIRY_MINUTES * 60 * 1000;

export const RideStatus = ({ ride }) =>
  isRideActive(ride) ? (
    <span className="badge rounded-pill text-bg-success">Active</span>
  ) : (
    <span className="badge rounded-pill text-bg-secondary">Completed</span>
  );
