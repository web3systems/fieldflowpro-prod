import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useApp } from "@/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import NotificationSettings from "@/components/notifications/NotificationSettings";
import AdminNotificationManager from "@/components/notifications/AdminNotificationManager";
import NotificationLog from "@/components/notifications/NotificationLog";
import CustomerNotificationSettings from "@/components/notifications/CustomerNotificationSettings";

export default function Notifications() {
  const { user, activeCompany } = useApp();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin" || user?.role === "manager";

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Notifications</h1>
        <p className="text-slate-500 text-sm mt-1">Manage how and when you receive alerts</p>
      </div>

      <Tabs defaultValue="my-settings">
        <TabsList>
          <TabsTrigger value="my-settings">My Preferences</TabsTrigger>
          <TabsTrigger value="log">Activity Log</TabsTrigger>
          {isAdmin && <TabsTrigger value="customer">Customer Notifications</TabsTrigger>}
          {isAdmin && <TabsTrigger value="team">Team Settings</TabsTrigger>}
        </TabsList>

        <TabsContent value="my-settings" className="mt-4">
          <NotificationSettings user={user} company={activeCompany} />
        </TabsContent>

        <TabsContent value="log" className="mt-4">
          <NotificationLog user={user} company={activeCompany} />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="customer" className="mt-4">
            <CustomerNotificationSettings company={activeCompany} />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="team" className="mt-4">
            <AdminNotificationManager company={activeCompany} currentUser={user} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}