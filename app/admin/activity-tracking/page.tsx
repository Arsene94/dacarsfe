"use client";

import ActivityTrackingManager from "@/components/admin/activity-tracking/ActivityTrackingManager";
import { useAuth } from "@/context/AuthContext";

const ActivityTrackingPage = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="p-6 text-sm text-gray-500">Se încarcă informațiile...</div>;
  }

  if (!user || user.id !== 1) {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-2xl rounded-lg border border-amber-200 bg-amber-50 p-6 text-center text-amber-700">
          <h2 className="text-lg font-semibold">Acces restricționat</h2>
          <p className="mt-2 text-sm">
            Modulul de activități operaționale este disponibil doar pentru administratorul principal.
          </p>
        </div>
      </div>
    );
  }

  return <ActivityTrackingManager />;
};

export default ActivityTrackingPage;
