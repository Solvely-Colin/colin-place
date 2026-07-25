import { redirect } from "next/navigation";

const mobileClawdRoom =
  "https://clickclack.colin.place/app/TN9Q5RGJ7KMJ5Z456/CY2GNYQDXT4WS9X6G";

export default function ClickClackRedirect() {
  redirect(mobileClawdRoom);
}
