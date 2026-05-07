import type { UserProfile } from "@/lib/user";

/** Common props passed to each settings card component. */
export interface SettingsCardProps {
  readonly userId: string;
  readonly profile: UserProfile;
}
