import type {
  BusinessFrontend,
  BusinessReport,
  BusinessVerificationRequest,
  CommunityEvent,
  CommunityFind,
  CommunityFindReport,
  ConversationFrontend,
  FeaturedPlacementFrontend,
  MessageFrontend,
  OwnerClaimRequest,
  Review,
  UserFrontend,
} from "@/types/database";
import type { FeaturedScopeType } from "@/types/database";

export type BusinessHour = {
  day: string;
  enabled: boolean;
  open: string;
  close: string;
};

export type UserProfileUser = UserFrontend;

export type ReceivedReviewWithBusiness = BusinessFrontend["reviews"][0] & {
  businessName: string;
  businessSlug: string;
  businessId: string;
};

export type GivenReviewWithBusiness = Review & {
  businessName: string;
  businessSlug: string;
  businessId: string;
};

export type EditingReviewState = {
  review: GivenReviewWithBusiness;
  rating: number;
  comment: string;
  saving: boolean;
};

export type ConfirmDeleteReviewState = {
  reviewId: string;
  businessId: string;
};

export type ConversationPartnerMap = Record<string, { name: string; avatar: string }>;

export type MessagesTabConversation = ConversationFrontend;
export type MessagesTabMessage = MessageFrontend;

export type CommunityFindEditForm = {
  productName: string;
  locationName: string;
  category: CommunityFind["category"];
};

export type CommunityEventForm = {
  title: string;
  description: string;
  date: string;
  location: string;
  isFree: boolean;
  price: string;
  ticketUrl: string;
  flyerUrl: string;
  businessId: string;
};

export type FeaturedForm = {
  businessId: string;
  scopeType: FeaturedScopeType;
  countryCode: string;
  stateCode: string;
  city: string;
  startsAt: string;
  endsAt: string;
  priority: string;
  priceCents: string;
  notes: string;
};

export type VerificationAdminView = "pendentes" | "verificados";
export type ReportsView = "active" | "archived";
export type ReportsKind = "negocios" | "achadinhos";

export type OwnershipRequestList = OwnerClaimRequest[];
export type VerificationRequestList = BusinessVerificationRequest[];
export type BusinessReportList = BusinessReport[];
export type CommunityFindReportList = CommunityFindReport[];
export type FeaturedPlacementList = FeaturedPlacementFrontend[];
export type CommunityEventList = CommunityEvent[];
