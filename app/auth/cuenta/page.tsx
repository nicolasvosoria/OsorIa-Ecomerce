import { AccountPageClient } from "./account-page-client";
import { loadAccountPageView } from "./load-account-view";

export default async function AccountPage() {
  const view = await loadAccountPageView();

  return <AccountPageClient view={view} />;
}
