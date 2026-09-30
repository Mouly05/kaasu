import { getRequestConfig } from "next-intl/server";

import { getSessionPreferences } from "@/lib/session-preferences";

export default getRequestConfig(async () => {
  const { locale } = await getSessionPreferences();
  const messages = (await import(`../messages/${locale}.json`)).default;
  return { locale, messages };
});
