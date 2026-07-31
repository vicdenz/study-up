import { useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";

const subscribe = (notify: () => void) => {
  window.addEventListener("online", notify);
  window.addEventListener("offline", notify);

  return () => {
    window.removeEventListener("online", notify);
    window.removeEventListener("offline", notify);
  };
};

const getSnapshot = () => navigator.onLine;
const getServerSnapshot = () => true;

const NetworkStatus = () => {
  const isOnline = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  if (isOnline) return null;

  return (
    <div
      className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-2 bg-amber-100 px-4 py-2 text-sm font-medium text-amber-950 shadow-sm"
      role="status"
      aria-live="polite"
    >
      <WifiOff className="h-4 w-4" aria-hidden="true" />
      You are offline. Unsaved changes may not be available until you reconnect.
    </div>
  );
};

export default NetworkStatus;
