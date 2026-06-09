"use client";
import { useEffect, useState } from "react";
import { X, UserPlus, Save, KeyRound } from "lucide-react";
import { usersApi, type UserCreate, type UserUpdate } from "@/lib/api/users";
import { AerodromeCombobox } from "@/components/shared/AerodromeCombobox";
import { AirlineCombobox } from "@/components/shared/AirlineCombobox";
import { ROLE_LABELS } from "@/lib/constants";
import { getApiErrorMessage } from "@/lib/utils";
import client from "@/lib/api/client";
import type { Aerodrome, Airline, User, UserRole } from "@/types";

interface UserFormModalProps {
  open: boolean;
  user: User | null; // null = create mode
  onClose: () => void;
  onSaved: () => void;
}

const ROLE_OPTIONS: UserRole[] = [
  "atc_operator",
  "supervisor",
  "nama_management",
  "ncaa_officer",
  "faan_officer",
  "airline_user",
  "executive",
  "system_admin",
];

export function UserFormModal({ open, user, onClose, onSaved }: UserFormModalProps) {
  const isEdit = !!user;
  const [form, setForm] = useState({
    email: "",
    username: "",
    full_name: "",
    role: "atc_operator" as UserRole,
    password: "",
    phone: "",
    is_active: true,
  });
  const [aerodrome, setAerodrome] = useState<Aerodrome | null>(null);
  const [airline, setAirline] = useState<Airline | null>(null);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    setShowPasswordReset(false);
    setNewPassword("");

    if (user) {
      setForm({
        email: user.email,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        password: "",
        phone: user.phone ?? "",
        is_active: user.is_active,
      });
      // Resolve nested aerodrome/airline if needed
      if (user.aerodrome_id) {
        client.get<Aerodrome>(`/aerodromes/${user.aerodrome_id}`).then(({ data }) => setAerodrome(data)).catch(() => setAerodrome(null));
      } else {
        setAerodrome(null);
      }
      if (user.airline_id) {
        client.get<Airline>(`/airlines/${user.airline_id}`).then(({ data }) => setAirline(data)).catch(() => setAirline(null));
      } else {
        setAirline(null);
      }
    } else {
      setForm({
        email: "",
        username: "",
        full_name: "",
        role: "atc_operator",
        password: "",
        phone: "",
        is_active: true,
      });
      setAerodrome(null);
      setAirline(null);
    }
  }, [open, user]);

  const needsAerodrome = form.role === "atc_operator" || form.role === "supervisor";
  const needsAirline = form.role === "airline_user";

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      if (isEdit && user) {
        const payload: UserUpdate = {
          full_name: form.full_name,
          phone: form.phone || null,
          is_active: form.is_active,
          aerodrome_id: aerodrome?.id ?? null,
          airline_id: airline?.id ?? null,
        };
        await usersApi.update(user.id, payload);
      } else {
        if (!form.password || form.password.length < 8) {
          setError("Password must be at least 8 characters");
          setSaving(false);
          return;
        }
        const payload: UserCreate = {
          email: form.email,
          username: form.username,
          full_name: form.full_name,
          role: form.role,
          password: form.password,
          phone: form.phone || null,
          aerodrome_id: aerodrome?.id ?? null,
          airline_id: airline?.id ?? null,
        };
        await usersApi.create(payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to save user"));
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordReset() {
    if (!user || newPassword.length < 8) {
      setError("New password must be at least 8 characters");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await usersApi.resetPassword(user.id, newPassword);
      setShowPasswordReset(false);
      setNewPassword("");
      onSaved();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to reset password"));
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  const inputCls = "w-full px-3 py-2 border-l-4 border-l-navy-500 border-y border-r border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 rounded-r-md";
  const labelCls = "block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-2xl max-h-[90vh] rounded-xl shadow-2xl border-2 border-navy-500 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-navy-500 text-white px-6 py-4 flex items-center justify-between border-b-4 border-amber-adr">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-8 bg-amber-adr rounded-sm" />
            <div>
              <p className="text-[10px] text-navy-200 uppercase tracking-widest">
                {isEdit ? "Edit User" : "Create User"}
              </p>
              <h3 className="text-lg font-bold">
                {isEdit ? user.full_name : "New System User"}
              </h3>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-navy-400 rounded-full">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Identity */}
          <Section title="Identity">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  disabled={isEdit}
                  className={`${inputCls} ${isEdit ? "bg-gray-50 text-gray-500" : ""}`}
                />
              </div>
              <div>
                <label className={labelCls}>Username *</label>
                <input
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  disabled={isEdit}
                  className={`${inputCls} ${isEdit ? "bg-gray-50 text-gray-500" : ""}`}
                  pattern="[a-zA-Z0-9_.-]+"
                />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Full Name *</label>
                <input
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Phone</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className={inputCls}
                  placeholder="+234..."
                />
              </div>
              <div>
                <label className={labelCls}>Role *</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                  disabled={isEdit}
                  className={`${inputCls} ${isEdit ? "bg-gray-50 text-gray-500" : ""}`}
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
              </div>
            </div>
          </Section>

          {/* Assignment */}
          {(needsAerodrome || needsAirline) && (
            <Section title="Assignment">
              {needsAerodrome && (
                <div>
                  <label className={labelCls}>Aerodrome *</label>
                  <AerodromeCombobox value={aerodrome} onChange={setAerodrome} placeholder="Select aerodrome…" />
                </div>
              )}
              {needsAirline && (
                <div>
                  <label className={labelCls}>Airline *</label>
                  <AirlineCombobox value={airline} onChange={setAirline} placeholder="Select airline…" />
                </div>
              )}
            </Section>
          )}

          {/* Initial password (create mode only) */}
          {!isEdit && (
            <Section title="Initial Password">
              <div>
                <label className={labelCls}>Password * (min 8 chars)</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className={inputCls}
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  User can change it after first login
                </p>
              </div>
            </Section>
          )}

          {/* Status (edit mode only) */}
          {isEdit && (
            <Section title="Status & Access">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, is_active: !form.is_active })}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    form.is_active ? "bg-emerald-500" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      form.is_active ? "translate-x-5" : ""
                    }`}
                  />
                </button>
                <span className="text-sm font-medium text-gray-700">
                  {form.is_active ? "Active — can sign in" : "Inactive — sign-in blocked"}
                </span>
              </div>
            </Section>
          )}

          {/* Password reset (edit mode only) */}
          {isEdit && (
            <Section title="Password Reset">
              {!showPasswordReset ? (
                <button
                  type="button"
                  onClick={() => setShowPasswordReset(true)}
                  className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 hover:bg-gray-50 rounded text-xs font-bold uppercase tracking-widest text-gray-600"
                >
                  <KeyRound size={12} />
                  Reset Password
                </button>
              ) : (
                <div className="space-y-2">
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password (min 8 chars)"
                    className={inputCls}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setShowPasswordReset(false); setNewPassword(""); }}
                      className="px-3 py-1.5 border border-gray-300 text-xs font-bold uppercase tracking-widest text-gray-600 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handlePasswordReset}
                      disabled={saving || newPassword.length < 8}
                      className="px-3 py-1.5 bg-amber-adr text-navy-700 hover:bg-yellow-400 disabled:bg-gray-300 text-xs font-bold uppercase tracking-widest rounded"
                    >
                      {saving ? "Resetting…" : "Reset Password"}
                    </button>
                  </div>
                </div>
              )}
            </Section>
          )}

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 px-3 py-2 rounded">
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-navy-500 px-6 py-3 border-t-4 border-amber-adr flex items-center justify-between">
          <p className="text-navy-100 text-xs uppercase tracking-widest">
            {isEdit ? "Editing existing user" : "Creating new user"}
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-1.5 border border-navy-300 text-navy-100 hover:bg-navy-400 font-bold uppercase text-xs tracking-widest rounded"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-5 py-1.5 bg-amber-adr hover:bg-yellow-400 disabled:bg-gray-400 text-navy-700 font-bold uppercase text-xs tracking-widest rounded"
            >
              {isEdit ? <Save size={12} /> : <UserPlus size={12} />}
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Create User"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-[11px] font-bold text-navy-700 uppercase tracking-widest border-b-2 border-navy-500 pb-1 mb-3">
        {title}
      </h4>
      {children}
    </div>
  );
}
