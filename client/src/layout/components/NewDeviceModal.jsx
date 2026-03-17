import React, { useEffect, useMemo, useState } from "react";
import { FiCpu, FiMapPin, FiX } from "react-icons/fi";
import { FaCarSide } from "react-icons/fa";
import { MdDirectionsBike } from "react-icons/md";
import { TbDrone } from "react-icons/tb";

import styles from "../AppShell.module.css";

const DEFAULT_DEVICE_NAME = "New Device";

function getProfileMeta(type) {
  if (type === "drone") {
    return {
      label: "Drone",
      Icon: TbDrone,
      description: "Aerial missions and mobile telemetry",
    };
  }

  if (type === "bicycle") {
    return {
      label: "Bicycle",
      Icon: MdDirectionsBike,
      description: "Ground movement and route tracking",
    };
  }

  if (type === "car") {
    return {
      label: "Car",
      Icon: FaCarSide,
      description: "Road-based missions and transport",
    };
  }

  if (type === "static") {
    return {
      label: "Static Station",
      Icon: FiMapPin,
      description: "Fixed monitoring and stationary sensors",
    };
  }

  return {
    label: "Drone",
    Icon: TbDrone,
    description: "Aerial missions and mobile telemetry",
  };
}

export default function NewDeviceModal({
  open = false,
  device = null,
  profiles = [],
  busy = false,
  queueIndex = null,
  queueTotal = null,
  onClose = () => {},
  onSave = () => {},
}) {
  const [nickname, setNickname] = useState("");
  const [profileType, setProfileType] = useState("drone");

  const availableProfiles = useMemo(() => {
    if (profiles?.length) return profiles;
    return [{ type: "drone", label: "Drone" }];
  }, [profiles]);

  useEffect(() => {
    if (!open || !device) return;

    setNickname(device.nickname || "");
    setProfileType(device.active_profile_type || availableProfiles[0]?.type || "drone");
  }, [open, device, availableProfiles]);

  if (!open || !device) return null;

  async function saveDevice({ selectAfterSave }) {
    const finalNickname = nickname.trim() || DEFAULT_DEVICE_NAME;

    await onSave({
      device_uuid: device.device_uuid,
      nickname: finalNickname,
      profile_type: profileType,
      profile_label: getProfileMeta(profileType).label,
      selectAfterSave,
    });
  }

  async function handleSubmit(e) {
    if (e?.preventDefault) e.preventDefault();
    await saveDevice({ selectAfterSave: true });
  }

  async function handleSaveLater() {
    await saveDevice({ selectAfterSave: false });
  }

  const showQueue = Number.isInteger(queueIndex) && Number.isInteger(queueTotal) && queueTotal > 1;

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-xl p-0 overflow-hidden max-h-[90vh]">
        <div className="flex max-h-[90vh] flex-col">
          <div className="relative border-b border-base-300 px-6 pt-6 pb-5">
            <button
              type="button"
              className="btn btn-sm btn-circle btn-ghost absolute right-3 top-3"
              onClick={onClose}
              disabled={busy}
              aria-label="Close"
            >
              <FiX className="text-base" />
            </button>

            <div className="flex items-start gap-4 pr-10">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-base-300 bg-base-100">
                <FiCpu className="text-base" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xl font-semibold leading-tight">
                    New device detected
                  </h3>

                  {showQueue ? (
                    <span className="badge badge-outline badge-sm">
                      {queueIndex + 1} / {queueTotal}
                    </span>
                  ) : null}
                </div>

                <p className="mt-1 text-sm text-base-content/65">
                  Configure this device before using it in missions.
                </p>
              </div>
            </div>
          </div>

          <div className={`flex-1 overflow-y-auto px-6 py-5 ${styles.noScrollbar}`}>
            <div className="rounded-2xl border border-base-300 bg-base-200/60 p-4">
              <div className="space-y-2.5 text-sm">
                <div className="grid gap-1 sm:grid-cols-[92px_1fr] sm:gap-3">
                  <span className="text-base-content/60">UUID</span>
                  <span className="font-mono break-all">{device.device_uuid}</span>
                </div>

                <div className="grid gap-1 sm:grid-cols-[92px_1fr] sm:gap-3">
                  <span className="text-base-content/60">Hostname</span>
                  <span>{device.hostname || device.info?.hostname || "Unknown"}</span>
                </div>

                <div className="grid gap-1 sm:grid-cols-[92px_1fr] sm:gap-3">
                  <span className="text-base-content/60">Base URL</span>
                  <span className="font-mono break-all">
                    {device.base_url || "Unknown"}
                  </span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-5">
              <div className="space-y-2">
                <label
                  htmlFor="device-nickname"
                  className="block text-sm font-medium text-base-content"
                >
                  Device nickname
                </label>

                <input
                  id="device-nickname"
                  type="text"
                  className="input input-bordered w-full"
                  placeholder="e.g. Field Node 1"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  disabled={busy}
                  maxLength={80}
                />

                <p className="text-xs text-base-content/60">
                  If left empty, the device will be saved as "{DEFAULT_DEVICE_NAME}".
                </p>
              </div>

              <div className="space-y-2.5">
                <div>
                  <label className="block text-sm font-medium text-base-content">
                    Operational profile
                  </label>
                  <p className="mt-1 text-xs text-base-content/60">
                    Choose how this device will be used.
                  </p>
                </div>

                <div className="grid gap-2.5">
                  {availableProfiles.map((profile) => {
                    const meta = getProfileMeta(profile.type);
                    const Icon = meta.Icon;
                    const isSelected = profile.type === profileType;

                    return (
                      <button
                        key={profile.type}
                        type="button"
                        onClick={() => setProfileType(profile.type)}
                        disabled={busy}
                        className={[
                          "group w-full rounded-xl border px-3.5 py-3 text-left transition-all",
                          "flex items-center gap-3",
                          "focus:outline-none focus:ring-2 focus:ring-primary/20",
                          isSelected
                            ? "border-primary bg-primary/8"
                            : "border-base-300 bg-base-100 hover:border-primary/25 hover:bg-base-200/60",
                          busy ? "cursor-not-allowed opacity-70" : "",
                        ].join(" ")}
                        aria-pressed={isSelected}
                      >
                        <div
                          className={[
                            "flex size-10 shrink-0 items-center justify-center rounded-xl border transition",
                            isSelected
                              ? "border-primary/25 bg-primary/10 text-primary"
                              : "border-base-300 bg-base-200 text-base-content/70",
                          ].join(" ")}
                        >
                          <Icon className="text-lg" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div
                            className={[
                              "text-sm font-medium transition-colors",
                              isSelected ? "text-primary" : "text-base-content",
                            ].join(" ")}
                          >
                            {profile.label || meta.label}
                          </div>

                          <div className="mt-0.5 text-xs text-base-content/60">
                            {meta.description}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </form>
          </div>

          <div className="border-t border-base-300 bg-base-100 px-6 py-4">
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleSaveLater}
                disabled={busy}
              >
                {busy ? "Saving..." : "Save later"}
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={busy}
              >
                {busy ? "Saving..." : "Save and select"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <form method="dialog" className="modal-backdrop">
        <button type="button" onClick={onClose} aria-label="Close modal">
          close
        </button>
      </form>
    </dialog>
  );
}
