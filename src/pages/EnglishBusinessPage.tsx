import BusinessPage from "@/pages/BusinessPage";
import type { BusinessFrontend } from "@/types/database";

type EnglishBusinessPageProps = {
  initialBusiness?: BusinessFrontend | null;
  initialBusinesses?: BusinessFrontend[];
  initialSimilarBusinesses?: BusinessFrontend[];
};

export default function EnglishBusinessPage(props: EnglishBusinessPageProps = {}) {
  return <BusinessPage {...props} locale="en" />;
}