"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, UserPlus, Crown, Shield, Eye } from "lucide-react";
import { useUser } from "@clerk/nextjs";

export default function TeamPage() {
  const { user } = useUser();
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Mock data - will be replaced with real data
  const teamMembers = [
    {
      id: "1",
      name: user?.fullName || "You",
      email: user?.primaryEmailAddress?.emailAddress || "",
      role: "owner",
      joinedAt: new Date().toISOString(),
      avatar: user?.imageUrl || "",
    }
  ];

  const getRoleIcon = (role: string) => {
    switch(role) {
      case "owner":
        return <Crown className="w-4 h-4" />;
      case "admin":
        return <Shield className="w-4 h-4" />;
      default:
        return <Eye className="w-4 h-4" />;
    }
  };

  const getRoleBadge = (role: string) => {
    return (
      <Badge variant={role === "owner" ? "default" : "secondary"} className="flex items-center gap-1">
        {getRoleIcon(role)}
        <span className="capitalize">{role}</span>
      </Badge>
    );
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Team Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Collaborate with your team on shared prompts
          </p>
        </div>
        <Button 
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Invite Member
        </Button>
      </div>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            Manage your team members and their permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {teamMembers.length > 0 ? (
            <div className="space-y-4">
              {teamMembers.map((member) => (
                <div 
                  key={member.id} 
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <img
                      src={member.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.email}`}
                      alt={member.name}
                      className="w-10 h-10 rounded-full"
                    />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {member.name}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {member.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    {getRoleBadge(member.role)}
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Joined {new Date(member.joinedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                No team members yet. Invite someone to collaborate!
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Features Coming Soon */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Team Features</CardTitle>
          <CardDescription>
            Coming soon - Enterprise plan required
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Shared Folders
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Create team folders to organize and share prompts across your organization
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Role-Based Access
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Control who can view, edit, or manage prompts with granular permissions
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Activity Logs
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Track all team activities and changes to maintain accountability
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Approval Workflows
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Set up review processes for critical prompts before they go live
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invite Modal Placeholder */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Invite Team Member</CardTitle>
              <CardDescription>
                Team features are available on the Enterprise plan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Upgrade to Enterprise to invite team members and collaborate on prompts.
              </p>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowInviteModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => window.location.href = "/settings/billing"}
                >
                  Upgrade Plan
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}