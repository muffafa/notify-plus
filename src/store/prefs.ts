import { Notify } from '../native/NotifyModule';

/**
 * Small app preferences, persisted via the native module's SharedPreferences (so we avoid a
 * separate key-value native dependency). Rules and diagnostic mode have dedicated native methods.
 */

const ONBOARDING_COMPLETE = 'onboardingComplete';

export async function getOnboardingComplete(): Promise<boolean> {
  return (await Notify.getPref(ONBOARDING_COMPLETE)) === 'true';
}

export function setOnboardingComplete(value: boolean): Promise<boolean> {
  return Notify.setPref(ONBOARDING_COMPLETE, value ? 'true' : 'false');
}
