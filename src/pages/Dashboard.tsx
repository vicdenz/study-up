import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { BookOpen, Calendar, FileText, Brain, CheckCircle, AlertCircle } from "lucide-react";
import Navigation from "@/components/Navigation";
import ActionButton from "@/components/ActionButton";
import PageHeader from "@/components/PageHeader";
import UserMenu from "@/components/UserMenu";
import { useNavigate } from "@/lib/router";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useActivities } from "@/hooks/useActivities";
import { ScrollArea } from "@/components/ui/scroll-area";

const Dashboard = () => {
  const navigate = useNavigate();
  const { stats, isLoading } = useDashboardStats();
  const { activities, isLoading: activitiesLoading } = useActivities();

  const statsData = [
    {
      title: "Active Courses",
      value: isLoading ? "-" : stats.activeCourses.toString(),
      description: "Currently enrolled",
      icon: BookOpen,
      color: "text-blue-600"
    },
    {
      title: "Completed Tasks",
      value: isLoading ? "-" : stats.completedAssignments.toString(),
      description: "All time",
      icon: CheckCircle,
      color: "text-green-600"
    },
    {
      title: "Assignments Due",
      value: isLoading ? "-" : stats.assignmentsDue.toString(),
      description: "This week",
      icon: AlertCircle,
      color: "text-orange-600"
    },
    {
      title: "Current Progress",
      value: isLoading || stats.totalAssignments === 0 ? "-" : `${stats.completedAssignments} / ${stats.totalAssignments}`,
      description: "Assignments completed",
      icon: Brain,
      color: "text-purple-600"
    }
  ];

  const formatActivityTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minutes ago`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
  };

  return (
    <div className="app-background min-h-screen flex">
      <Navigation />
      
      <main className="min-w-0 flex-1">
        <PageHeader actions={<UserMenu />}>
          <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        </PageHeader>

        <div className="app-page-content">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome back!</h2>
            <p className="text-gray-600">Here's what you've accomplished and what's coming up.</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statsData.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.title}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                        <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                        <p className="text-xs text-gray-500">{stat.description}</p>
                      </div>
                      <Icon className={`h-8 w-8 ${stat.color}`} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <ActionButton
                  icon={BookOpen}
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => navigate("/courses")}
                >
                  View All Courses
                </ActionButton>
                <ActionButton
                  icon={FileText}
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => navigate("/notebook")}
                >
                  Create New Note
                </ActionButton>
                <ActionButton
                  icon={Calendar}
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => navigate("/planner")}
                >
                  Plan Study Session
                </ActionButton>
                <ActionButton
                  icon={Brain}
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => navigate("/ai-tutor")}
                >
                  Ask AI Tutor
                </ActionButton>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-60 w-full pr-2">
                  <div className="space-y-4">
                    {activitiesLoading ? (
                      <div className="text-sm text-gray-500">Loading activities...</div>
                    ) : activities.length > 0 ? (
                      activities.slice(0, 4).map((activity) => (
                        <div key={activity.id} className="flex items-start space-x-3">
                          <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{activity.activity_description}</p>
                            <p className="text-xs text-gray-500">
                              {activity.related_course_name && `${activity.related_course_name} • `}
                              {formatActivityTime(activity.created_at)}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-gray-500">No recent activity. Start by creating a course or assignment!</div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* AI Features */}
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Unlock AI-Powered Learning
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Get personalized study plans, instant help, and smart insights to boost your academic performance.
                  </p>
                  <ActionButton icon={Brain} onClick={() => navigate("/ai-tutor")}>Explore AI Features</ActionButton>
                </div>
                <Brain className="h-16 w-16 text-blue-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
