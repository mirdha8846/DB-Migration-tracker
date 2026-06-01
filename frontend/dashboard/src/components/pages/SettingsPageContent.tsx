"use client";

import { useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

const tabs = [
  { id: "profile", label: "Profile", icon: "person" },
  { id: "notifications", label: "Notifications", icon: "notifications" },
  { id: "integrations", label: "Integrations", icon: "hub" },
  { id: "security", label: "Security", icon: "shield" },
] as const;

type TabId = (typeof tabs)[number]["id"];

export function SettingsPageContent() {
  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [slackAlerts, setSlackAlerts] = useState(true);
  const [criticalOnly, setCriticalOnly] = useState(false);

  return (
    <DashboardShell
      variant="detail"
      active="settings"
      pageTitle="Settings"
      pageSubtitle="Account & Preferences"
      mainClassName="ml-64 mt-16 min-h-screen p-margin-desktop"
    >
      <div className="mx-auto max-w-[1440px]">
        <div className="mb-stack-lg">
          <h1 className="font-headline-lg text-headline-lg text-primary">Settings</h1>
          <p className="mt-1 font-body-md text-on-surface-variant/80">
            Configure your account, alert preferences, and platform integrations.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-gutter lg:grid-cols-12">
          <div className="lg:col-span-3">
            <div className="glass-panel rounded-2xl p-4">
              <nav className="space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-all ${
                      activeTab === tab.id
                        ? "bg-primary-container text-on-primary shadow-sm"
                        : "text-on-surface-variant hover:bg-primary/5 hover:text-primary"
                    }`}
                  >
                    <MaterialIcon name={tab.icon} size={20} />
                    <span className="font-label-md text-label-md">{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          <div className="lg:col-span-9">
            {activeTab === "profile" && (
              <div className="glass-panel space-y-6 rounded-2xl p-8">
                <h2 className="font-headline-md text-headline-md text-primary">Profile</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block font-label-sm uppercase tracking-wider text-on-surface-variant">
                      Full Name
                    </span>
                    <input
                      defaultValue="Admin User"
                      className="w-full rounded-xl border border-primary/10 bg-primary/5 px-4 py-3 font-body-md focus:border-primary/30 focus:outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block font-label-sm uppercase tracking-wider text-on-surface-variant">
                      Role
                    </span>
                    <input
                      defaultValue="Security Architect"
                      className="w-full rounded-xl border border-primary/10 bg-primary/5 px-4 py-3 font-body-md focus:border-primary/30 focus:outline-none"
                    />
                  </label>
                  <label className="md:col-span-2">
                    <span className="mb-2 block font-label-sm uppercase tracking-wider text-on-surface-variant">
                      Email
                    </span>
                    <input
                      defaultValue="admin@schemaguard.io"
                      className="w-full rounded-xl border border-primary/10 bg-primary/5 px-4 py-3 font-body-md focus:border-primary/30 focus:outline-none"
                    />
                  </label>
                </div>
                <button className="rounded-xl bg-primary px-6 py-2.5 font-label-md text-label-md text-on-primary hover:brightness-110">
                  Save Profile
                </button>
              </div>
            )}

            {activeTab === "notifications" && (
              <div className="glass-panel space-y-6 rounded-2xl p-8">
                <h2 className="font-headline-md text-headline-md text-primary">Notifications</h2>
                {[
                  { label: "Email alerts for migration risks", checked: emailAlerts, set: setEmailAlerts },
                  { label: "Slack alerts for critical changes", checked: slackAlerts, set: setSlackAlerts },
                  { label: "Critical risks only", checked: criticalOnly, set: setCriticalOnly },
                ].map((item) => (
                  <label
                    key={item.label}
                    className="flex cursor-pointer items-center justify-between rounded-xl border border-primary/10 bg-primary/5 px-4 py-4"
                  >
                    <span className="font-body-md text-on-surface">{item.label}</span>
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={(e) => item.set(e.target.checked)}
                      className="h-5 w-5 rounded border-primary/20 text-primary focus:ring-primary"
                    />
                  </label>
                ))}
              </div>
            )}

            {activeTab === "integrations" && (
              <div className="glass-panel space-y-4 rounded-2xl p-8">
                <h2 className="mb-2 font-headline-md text-headline-md text-primary">Integrations</h2>
                {[
                  { name: "GitHub", status: "Connected", icon: "code" },
                  { name: "Slack", status: "Connected", icon: "chat" },
                  { name: "Anthropic Claude", status: "Connected", icon: "smart_toy" },
                ].map((integration) => (
                  <div
                    key={integration.name}
                    className="flex items-center justify-between rounded-xl border border-outline-variant/20 bg-white/50 px-4 py-4"
                  >
                    <div className="flex items-center gap-3">
                      <MaterialIcon name={integration.icon} className="text-primary" />
                      <div>
                        <p className="font-body-md font-semibold text-on-surface">{integration.name}</p>
                        <p className="font-label-sm text-secondary">{integration.status}</p>
                      </div>
                    </div>
                    <button className="font-label-sm font-bold text-primary hover:underline">
                      Configure
                    </button>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "security" && (
              <div className="glass-panel space-y-6 rounded-2xl p-8">
                <h2 className="font-headline-md text-headline-md text-primary">Security</h2>
                <div className="rounded-xl border border-secondary/20 bg-secondary/5 p-4">
                  <p className="font-body-md text-on-surface">
                    Multi-factor authentication is <strong>enabled</strong> for your account.
                  </p>
                </div>
                <button className="rounded-xl border border-primary/10 px-6 py-2.5 font-label-md text-label-md text-primary hover:bg-primary/5">
                  Rotate API Keys
                </button>
                <button className="rounded-xl border border-error/20 px-6 py-2.5 font-label-md text-label-md text-error hover:bg-error/5">
                  Revoke All Sessions
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
