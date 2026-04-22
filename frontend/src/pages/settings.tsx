import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { settingsApi } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Bell, Fingerprint, Smartphone } from "lucide-react";
import type { Setting } from "@/types";
import { BulkUpload } from "@/components/BulkUpload";
import { pushNotificationService } from "@/services/push-notifications";
import { biometricAuthService } from "@/services/biometric-auth";

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: () => settingsApi.list(),
  });

  const updateMutation = useMutation({
    mutationFn: settingsApi.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast({
        title: "Success",
        description: "Settings updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  // Convert settings array to object for easier access
  const settingsMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (Array.isArray(settings)) {
      settings.forEach((s) => {
        map[s.key] = s.value || "";
      });
    }
    return map;
  }, [settings]);

  const [currency, setCurrency] = useState("₹");
  const [fiscalYearStart, setFiscalYearStart] = useState("04-01");
  const [requireApproval, setRequireApproval] = useState(false);
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    if (settingsMap) {
      setCurrency(settingsMap.currency || "₹");
      setFiscalYearStart(settingsMap.fiscal_year_start || "04-01");
      setRequireApproval(settingsMap.require_approval_to_delete === "1");
    }
  }, [settingsMap]);

  useEffect(() => {
    // Initialize push notifications and biometric auth status
    const initMobileFeatures = async () => {
      setIsInitializing(true);
      try {
        await pushNotificationService.initialize();
        const isSubscribed = await pushNotificationService.isSubscribed();
        setPushNotificationsEnabled(isSubscribed);

        const isBiometricAvailable = await biometricAuthService.isAvailable();
        const isBiometricRegistered = await biometricAuthService.isRegistered();
        setBiometricEnabled(isBiometricAvailable && isBiometricRegistered);
      } catch (error) {
        console.error("Error initializing mobile features:", error);
      } finally {
        setIsInitializing(false);
      }
    };

    initMobileFeatures();
  }, []);

  const handleSave = () => {
    const settingsToUpdate = [
      { key: "currency", value: currency, group: "branding" },
      { key: "fiscal_year_start", value: fiscalYearStart, group: "branding" },
      { key: "require_approval_to_delete", value: requireApproval ? "1" : "0", group: "safety" },
    ];

    updateMutation.mutate(settingsToUpdate);
  };

  const handleThemeToggle = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    // Optionally save theme preference
    updateMutation.mutate([
      { key: "theme", value: newTheme, group: "branding" },
    ]);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Preferences</p>
          <h1 className="text-2xl font-semibold text-white">Settings</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i} className="bg-white/5 text-white">
              <CardContent className="pt-6">
                <div className="h-64 bg-white/5 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Preferences</p>
        <h1 className="text-2xl font-semibold text-white">Settings</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-white/5 text-white">
          <CardHeader>
            <CardTitle>Branding</CardTitle>
            <CardDescription className="text-slate-300">
              Currency, fiscal year, theme
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currency" className="text-slate-200">Currency Symbol</Label>
              <Input
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                placeholder="₹"
                maxLength={5}
                className="border-white/10 bg-white/5 text-white placeholder:text-slate-400"
              />
              <p className="text-xs text-slate-400">
                Currency symbol used throughout the application
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fiscalYear" className="text-slate-200">Fiscal Year Start</Label>
              <Input
                id="fiscalYear"
                type="text"
                value={fiscalYearStart}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9-]/g, "");
                  if (value.length <= 5) {
                    setFiscalYearStart(value);
                  }
                }}
                placeholder="04-01"
                pattern="\d{2}-\d{2}"
                className="border-white/10 bg-white/5 text-white placeholder:text-slate-400"
              />
              <p className="text-xs text-slate-400">
                Start date of your financial year (format: MM-DD, e.g., 04-01 for April 1st)
              </p>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3">
              <div>
                <p className="text-sm font-semibold">Theme</p>
                <p className="text-xs text-slate-300 capitalize">{theme} mode</p>
              </div>
              <Button
                variant="outline"
                onClick={handleThemeToggle}
                className="border-white/20 text-white hover:bg-white/10"
              >
                Toggle
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 text-white">
          <CardHeader>
            <CardTitle>Safety</CardTitle>
            <CardDescription className="text-slate-300">
              Control data visibility and reset options
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3">
              <div className="space-y-0.5">
                <p className="text-sm font-semibold">Require approval to delete</p>
                <p className="text-xs text-slate-300">Prevents accidental data loss</p>
              </div>
              <Switch
                checked={requireApproval}
                onCheckedChange={setRequireApproval}
              />
            </div>
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
              <p className="text-sm font-semibold text-red-400 mb-1">Danger Zone</p>
              <p className="text-xs text-slate-300 mb-3">
                Permanently delete all transactions and loans. This action cannot be undone.
              </p>
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => {
                  if (confirm("Are you sure you want to delete ALL transactions and loans? This action cannot be undone.")) {
                    settingsApi.clearAllData().then(() => {
                      queryClient.invalidateQueries({ queryKey: ["transactions"] });
                      queryClient.invalidateQueries({ queryKey: ["loans"] });
                      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
                      toast({
                        title: "Success",
                        description: "All transactions and loans have been cleared",
                      });
                    }).catch((error: any) => {
                      toast({
                        title: "Error",
                        description: error.response?.data?.message || "Failed to clear data",
                        variant: "destructive",
                      });
                    });
                  }
                }}
              >
                Clear All Transactions & Loans
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-white/5 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Mobile App Features
            </CardTitle>
            <CardDescription className="text-slate-300">
              Push notifications and biometric authentication
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  <p className="text-sm font-semibold">Push Notifications</p>
                </div>
                <p className="text-xs text-slate-300">
                  Receive notifications for important updates
                </p>
              </div>
              {isInitializing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Switch
                  checked={pushNotificationsEnabled}
                  onCheckedChange={async (checked) => {
                    if (checked) {
                      const subscription = await pushNotificationService.subscribe();
                      if (subscription) {
                        setPushNotificationsEnabled(true);
                        toast({
                          title: "Success",
                          description: "Push notifications enabled",
                        });
                        // In production, send subscription to backend
                      } else {
                        toast({
                          title: "Error",
                          description: "Failed to enable push notifications",
                          variant: "destructive",
                        });
                      }
                    } else {
                      const unsubscribed = await pushNotificationService.unsubscribe();
                      if (unsubscribed) {
                        setPushNotificationsEnabled(false);
                        toast({
                          title: "Success",
                          description: "Push notifications disabled",
                        });
                      }
                    }
                  }}
                />
              )}
            </div>
            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Fingerprint className="h-4 w-4" />
                  <p className="text-sm font-semibold">Biometric Authentication</p>
                </div>
                <p className="text-xs text-slate-300">
                  Use fingerprint or face ID to log in
                </p>
              </div>
              {isInitializing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Switch
                  checked={biometricEnabled}
                  onCheckedChange={async (checked) => {
                    if (checked) {
                      try {
                        const credential = await biometricAuthService.register(
                          "user-id", // In production, use actual user ID
                          "User Name" // In production, use actual user name
                        );
                        if (credential) {
                          biometricAuthService.storeCredentialId(credential.id);
                          setBiometricEnabled(true);
                          toast({
                            title: "Success",
                            description: "Biometric authentication enabled",
                          });
                        }
                      } catch (error: any) {
                        toast({
                          title: "Error",
                          description: error.message || "Failed to enable biometric authentication",
                          variant: "destructive",
                        });
                      }
                    } else {
                      biometricAuthService.clearCredentialId();
                      setBiometricEnabled(false);
                      toast({
                        title: "Success",
                        description: "Biometric authentication disabled",
                      });
                    }
                  }}
                />
              )}
            </div>
          </CardContent>
        </Card>

        <BulkUpload type="transactions" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <BulkUpload type="loans" />
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="bg-primary text-primary-foreground shadow-lg shadow-primary/40"
        >
          {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Settings
        </Button>
      </div>
    </div>
  );
}
