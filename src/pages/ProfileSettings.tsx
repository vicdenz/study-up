import { FormEvent, useEffect, useState } from "react";
import { KeyRound, Mail, Save, UserRound } from "lucide-react";
import Navigation from "@/components/Navigation";
import PageHeader from "@/components/PageHeader";
import UserMenu from "@/components/UserMenu";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ProfileSettings = () => {
  const { profile, user, isLoading, updateProfile, isUpdating } = useProfile();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  useEffect(() => {
    setFirstName(profile?.first_name ?? "");
    setLastName(profile?.last_name ?? "");
  }, [profile]);

  const handleProfileSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await updateProfile({ first_name: firstName.trim() || null, last_name: lastName.trim() || null });
      toast.success("Profile updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update your profile");
    }
  };

  const handlePasswordSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast.error(error.message);
        return;
      }
      setPassword("");
      setConfirmPassword("");
      toast.success("Password updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update your password");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="app-background flex min-h-screen">
      <Navigation />
      <main className="min-w-0 flex-1">
        <PageHeader actions={<UserMenu />}>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Profile & settings</h1>
            <p className="hidden text-sm text-muted-foreground sm:block">Manage your account in one place.</p>
          </div>
        </PageHeader>

        <div className="app-page-content mx-auto grid max-w-5xl gap-4 sm:gap-6 lg:grid-cols-2">
          <Card className="border-violet-200/80">
            <CardHeader>
              <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><UserRound /></div>
              <CardTitle className="text-xl">Your profile</CardTitle>
              <CardDescription>Choose how your name appears across StudyUp.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-5" onSubmit={handleProfileSubmit}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2"><Label htmlFor="first-name">First name</Label><Input id="first-name" value={firstName} onChange={(event) => setFirstName(event.target.value)} disabled={isLoading} /></div>
                  <div className="space-y-2"><Label htmlFor="last-name">Last name</Label><Input id="last-name" value={lastName} onChange={(event) => setLastName(event.target.value)} disabled={isLoading} /></div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative"><Mail className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" /><Input id="email" className="pl-10" value={profile?.email ?? user?.email ?? ""} disabled /></div>
                  <p className="text-xs text-muted-foreground">Email changes require account verification.</p>
                </div>
                <Button type="submit" disabled={isLoading || isUpdating}><Save />{isUpdating ? "Saving…" : "Save profile"}</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700"><KeyRound /></div>
              <CardTitle className="text-xl">Security</CardTitle>
              <CardDescription>Set a new password for your account.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-5" onSubmit={handlePasswordSubmit}>
                <div className="space-y-2"><Label htmlFor="new-password">New password</Label><Input id="new-password" type="password" autoComplete="new-password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="confirm-password">Confirm new password</Label><Input id="confirm-password" type="password" autoComplete="new-password" minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></div>
                <Button type="submit" variant="outline" disabled={isUpdatingPassword || !password}><KeyRound />{isUpdatingPassword ? "Updating…" : "Update password"}</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default ProfileSettings;
