"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  User,
  Shield,
  SlidersHorizontal,
  Info,
  AlertTriangle,
  LogOut,
  Key,
  Copy,
  Check,
  Users,
  Monitor,
  Image,
  ListMusic,
  Megaphone,
  HardDrive,
  Loader2,
  Save,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { useUser } from "@/lib/hooks/use-user";
import { createClient } from "@/lib/supabase/client";
import {
  getUserProfile,
  updateUserProfile,
  getAllProfiles,
  updateUserRole,
  getSystemStats,
  type UserProfile,
  type UserRole,
  type SystemStats,
} from "@/lib/supabase/settings-queries";
import { formatFileSize } from "@/types/media";
import { BRAND } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Default settings (stored in localStorage)
// ---------------------------------------------------------------------------

interface DefaultSettings {
  displayDuration: number;
  transitionType: string;
  transitionDuration: number;
  timezone: string;
}

const DEFAULT_SETTINGS: DefaultSettings = {
  displayDuration: 10,
  transitionType: "crossfade",
  transitionDuration: 300,
  timezone: "America/New_York",
};

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "America/Phoenix",
  "America/Puerto_Rico",
  "America/Mexico_City",
  "America/Bogota",
  "America/Sao_Paulo",
  "America/Argentina/Buenos_Aires",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Madrid",
  "Europe/Rome",
  "Europe/Moscow",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Asia/Singapore",
  "Australia/Sydney",
  "Pacific/Auckland",
];

const TRANSITION_TYPES = [
  { value: "crossfade", label: "Crossfade" },
  { value: "slide_left", label: "Slide Left" },
  { value: "slide_right", label: "Slide Right" },
  { value: "fade", label: "Fade" },
  { value: "none", label: "None" },
];

function loadDefaultSettings(): DefaultSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const stored = localStorage.getItem("elevasign-default-settings");
    if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
  } catch {
    // ignore parse errors
  }
  return DEFAULT_SETTINGS;
}

function saveDefaultSettings(settings: DefaultSettings) {
  localStorage.setItem("elevasign-default-settings", JSON.stringify(settings));
}

// ---------------------------------------------------------------------------
// Main Settings Page
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  const { user, loading: userLoading } = useUser();
  const queryClient = useQueryClient();
  const supabase = createClient();

  // Profile query
  const {
    data: profile,
    isLoading: profileLoading,
  } = useQuery({
    queryKey: ["user-profile", user?.id],
    queryFn: () => getUserProfile(supabase, user!.id),
    enabled: !!user?.id,
  });

  // All profiles (for user management)
  const {
    data: allProfiles = [],
    isLoading: profilesLoading,
  } = useQuery({
    queryKey: ["all-profiles"],
    queryFn: () => getAllProfiles(supabase),
    enabled: !!user?.id && profile?.role === "owner",
  });

  // System stats
  const {
    data: systemStats,
    isLoading: statsLoading,
  } = useQuery({
    queryKey: ["system-stats"],
    queryFn: () => getSystemStats(supabase),
    enabled: !!user?.id,
  });

  const isOwner = profile?.role === "owner";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your profile, preferences, and system configuration.
        </p>
      </div>

      {/* 1. Profile Settings */}
      <ProfileSection
        user={user}
        profile={profile}
        loading={userLoading || profileLoading}
        supabase={supabase}
        queryClient={queryClient}
      />

      {/* 2. User Management (owner only) */}
      {isOwner && (
        <UserManagementSection
          profiles={allProfiles}
          currentUserId={user?.id ?? ""}
          loading={profilesLoading}
          supabase={supabase}
          queryClient={queryClient}
        />
      )}

      {/* 3. Default Settings */}
      <DefaultSettingsSection />

      {/* 4. System Info */}
      <SystemInfoSection stats={systemStats} loading={statsLoading} />

      {/* 5. Danger Zone */}
      <DangerZoneSection />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 1. Profile Settings
// ---------------------------------------------------------------------------

function ProfileSection({
  user,
  profile,
  loading,
  supabase,
  queryClient,
}: {
  user: ReturnType<typeof useUser>["user"];
  profile: UserProfile | null | undefined;
  loading: boolean;
  supabase: ReturnType<typeof createClient>;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const [fullName, setFullName] = useState("");
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (profile?.full_name) {
      setFullName(profile.full_name);
    } else if (user?.user_metadata?.full_name) {
      setFullName(user.user_metadata.full_name);
    }
  }, [profile, user]);

  const updateProfileMutation = useMutation({
    mutationFn: () =>
      updateUserProfile(supabase, user!.id, { full_name: fullName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      toast.success("Profile updated successfully.");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update profile: ${error.message}`);
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setChangePasswordOpen(false);
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password changed successfully.");
    },
    onError: (error: Error) => {
      toast.error(`Failed to change password: ${error.message}`);
    },
  });

  const handleSaveProfile = () => {
    if (!fullName.trim()) {
      toast.error("Name cannot be empty.");
      return;
    }
    updateProfileMutation.mutate();
  };

  const handleChangePassword = () => {
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    changePasswordMutation.mutate();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="size-5" />
            Profile Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-48" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="size-5" />
          Profile Settings
        </CardTitle>
        <CardDescription>
          Your personal information and account settings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Email (read-only) */}
        <div className="space-y-2">
          <Label>Email</Label>
          <Input
            value={user?.email ?? ""}
            disabled
            className="bg-muted"
          />
        </div>

        {/* Role (read-only) */}
        <div className="space-y-2">
          <Label>Role</Label>
          <div>
            <Badge variant="outline" className="capitalize">
              {profile?.role ?? "viewer"}
            </Badge>
          </div>
        </div>

        {/* Full name (editable) */}
        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name</Label>
          <Input
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Enter your full name"
          />
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleSaveProfile}
            disabled={updateProfileMutation.isPending}
            size="sm"
          >
            {updateProfileMutation.isPending ? (
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
            ) : (
              <Save className="mr-1.5 size-3.5" />
            )}
            Save Changes
          </Button>

          <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
            <DialogTrigger
              render={
                <Button variant="outline" size="sm">
                  <Key className="mr-1.5 size-3.5" />
                  Change Password
                </Button>
              }
            />
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Change Password</DialogTitle>
                <DialogDescription>
                  Enter a new password for your account. Minimum 6 characters.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose
                  render={<Button variant="outline" />}
                >
                  Cancel
                </DialogClose>
                <Button
                  onClick={handleChangePassword}
                  disabled={changePasswordMutation.isPending}
                >
                  {changePasswordMutation.isPending ? (
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  ) : null}
                  Update Password
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// 2. User Management (Owner Only)
// ---------------------------------------------------------------------------

function UserManagementSection({
  profiles,
  currentUserId,
  loading,
  supabase,
  queryClient,
}: {
  profiles: UserProfile[];
  currentUserId: string;
  loading: boolean;
  supabase: ReturnType<typeof createClient>;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: UserRole }) =>
      updateUserRole(supabase, userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-profiles"] });
      toast.success("User role updated.");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update role: ${error.message}`);
    },
  });

  const registerUrl = typeof window !== "undefined"
    ? `${window.location.origin}/register`
    : "/register";

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(registerUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [registerUrl]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="size-5" />
            User Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="size-5" />
              User Management
            </CardTitle>
            <CardDescription className="mt-1.5">
              Manage admin users and their roles.
            </CardDescription>
          </div>
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger
              render={
                <Button variant="outline" size="sm">
                  <UserPlus className="mr-1.5 size-3.5" />
                  Invite User
                </Button>
              }
            />
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Invite New Admin</DialogTitle>
                <DialogDescription>
                  Share this registration link with the person you want to invite
                  to the admin panel. They will need to create an account using
                  this link.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <Label>Registration Link</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={registerUrl}
                    readOnly
                    className="bg-muted font-mono text-xs"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyLink}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="size-4 text-emerald-500" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  After they register, you can assign their role from this page.
                  New users are assigned the &quot;viewer&quot; role by default.
                </p>
              </div>
              <DialogFooter showCloseButton />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {profiles.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <Users className="mb-2 size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No other users found.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {profiles.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {(p.full_name || p.email)
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {p.full_name || "Unnamed User"}
                    {p.id === currentUserId && (
                      <span className="ml-1.5 text-xs text-muted-foreground">
                        (you)
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {p.email}
                  </p>
                  <p className="text-xs text-muted-foreground/60">
                    Joined {format(new Date(p.created_at), "MMM d, yyyy")}
                  </p>
                </div>
                <div className="shrink-0">
                  {p.id === currentUserId ? (
                    <Badge variant="outline" className="capitalize">
                      {p.role}
                    </Badge>
                  ) : (
                    <Select
                      value={p.role}
                      onValueChange={(val) =>
                        val &&
                        updateRoleMutation.mutate({
                          userId: p.id,
                          role: val as UserRole,
                        })
                      }
                    >
                      <SelectTrigger size="sm" className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="owner">Owner</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// 3. Default Settings
// ---------------------------------------------------------------------------

function DefaultSettingsSection() {
  const [settings, setSettings] = useState<DefaultSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setSettings(loadDefaultSettings());
    setLoaded(true);
  }, []);

  const handleSave = () => {
    saveDefaultSettings(settings);
    toast.success("Default settings saved.");
  };

  if (!loaded) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SlidersHorizontal className="size-5" />
            Default Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SlidersHorizontal className="size-5" />
          Default Settings
        </CardTitle>
        <CardDescription>
          Default values applied when creating new playlists and content.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Display Duration */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Default Image Display Duration</Label>
            <span className="text-sm font-medium tabular-nums">
              {settings.displayDuration}s
            </span>
          </div>
          <Slider
            value={[settings.displayDuration]}
            onValueChange={(val) =>
              setSettings((s) => ({
                ...s,
                displayDuration: Array.isArray(val) ? val[0] : val,
              }))
            }
            min={5}
            max={60}
            step={1}
          />
          <p className="text-xs text-muted-foreground">
            How long each image is displayed before transitioning (5-60 seconds).
          </p>
        </div>

        <Separator />

        {/* Transition Type */}
        <div className="space-y-2">
          <Label>Default Transition Type</Label>
          <Select
            value={settings.transitionType}
            onValueChange={(val) =>
              val && setSettings((s) => ({ ...s, transitionType: val }))
            }
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRANSITION_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Transition Duration */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Default Transition Duration</Label>
            <span className="text-sm font-medium tabular-nums">
              {settings.transitionDuration}ms
            </span>
          </div>
          <Slider
            value={[settings.transitionDuration]}
            onValueChange={(val) =>
              setSettings((s) => ({
                ...s,
                transitionDuration: Array.isArray(val) ? val[0] : val,
              }))
            }
            min={100}
            max={1000}
            step={50}
          />
          <p className="text-xs text-muted-foreground">
            Duration of the transition animation (100-1000ms).
          </p>
        </div>

        <Separator />

        {/* Timezone */}
        <div className="space-y-2">
          <Label>Building Timezone</Label>
          <Select
            value={settings.timezone}
            onValueChange={(val) =>
              val && setSettings((s) => ({ ...s, timezone: val }))
            }
          >
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((tz) => (
                <SelectItem key={tz} value={tz}>
                  {tz.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Timezone used for scheduling content on screens.
          </p>
        </div>

        <Button onClick={handleSave} size="sm">
          <Save className="mr-1.5 size-3.5" />
          Save Default Settings
        </Button>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// 4. System Info
// ---------------------------------------------------------------------------

function SystemInfoSection({
  stats,
  loading,
}: {
  stats: SystemStats | undefined;
  loading: boolean;
}) {
  const infoItems = stats
    ? [
        {
          icon: Monitor,
          label: "Registered Screens",
          value: `${stats.totalScreens} (${stats.onlineScreens} online)`,
        },
        {
          icon: Image,
          label: "Media Items",
          value: stats.totalMedia.toString(),
        },
        {
          icon: HardDrive,
          label: "Total Storage Used",
          value: formatFileSize(stats.totalStorageBytes),
        },
        {
          icon: ListMusic,
          label: "Playlists",
          value: stats.totalPlaylists.toString(),
        },
        {
          icon: Megaphone,
          label: "Announcements",
          value: stats.totalAnnouncements.toString(),
        },
        {
          icon: Users,
          label: "Admin Users",
          value: stats.totalProfiles.toString(),
        },
      ]
    : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="size-5" />
          System Info
        </CardTitle>
        <CardDescription>
          Overview of your {BRAND.name} deployment.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {/* App info */}
            <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
              <span className="text-sm text-muted-foreground">App Version</span>
              <Badge variant="outline">v0.1.0</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
              <span className="text-sm text-muted-foreground">Platform</span>
              <span className="text-sm font-medium">
                {BRAND.name} Admin Panel
              </span>
            </div>

            <Separator />

            {/* Stats */}
            {infoItems.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between px-3 py-1"
              >
                <div className="flex items-center gap-2">
                  <item.icon className="size-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {item.label}
                  </span>
                </div>
                <span className="text-sm font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// 5. Danger Zone
// ---------------------------------------------------------------------------

function DangerZoneSection() {
  const supabase = createClient();
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="size-5" />
          Danger Zone
        </CardTitle>
        <CardDescription>
          Irreversible actions. Proceed with caution.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/5 p-4">
          <div>
            <p className="text-sm font-medium">Sign out of your account</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              You will be redirected to the login page.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-destructive/30 text-destructive hover:bg-destructive/10"
            onClick={handleLogout}
          >
            <LogOut className="mr-1.5 size-3.5" />
            Sign Out
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
