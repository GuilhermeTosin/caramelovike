import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { MessageCircle, PawPrint, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import SiteFooter from "@/components/SiteFooter";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { updateProfile } from "@/services/profiles";
import { transferBusinessOwnershipByEmail } from "@/services/ownership";
import { generateImagePath, uploadImage } from "@/services/storage";
import {
  BUSINESS_CATEGORY_OPTIONS,
  buildBusinessUrl,
  getAllBusinesses,
  getBusinessesByOwner,
  getCategoryLabel,
} from "@/services/businesses";
import type { BusinessFrontend } from "@/types/database";
import type {
  ReceivedReviewWithBusiness,
  VerificationAdminView,
} from "@/pages/user-profile/types";
import ProfileTab from "@/pages/user-profile/components/ProfileTab";
import SearchSettingsTab from "@/pages/user-profile/components/SearchSettingsTab";
import ReviewsTab from "@/pages/user-profile/components/ReviewsTab";
import MessagesTab from "@/pages/user-profile/components/MessagesTab";
import ModerationPreviewDialog from "@/pages/user-profile/components/ModerationPreviewDialog";
import EditReviewDialog from "@/pages/user-profile/components/EditReviewDialog";
import DeleteReviewDialog from "@/pages/user-profile/components/DeleteReviewDialog";
import UserProfileNavigation from "@/pages/user-profile/components/UserProfileNavigation";
import BusinessesTab from "@/pages/user-profile/components/BusinessesTab";
import AllBusinessesTab from "@/pages/user-profile/components/AllBusinessesTab";
import AdminUsersTab from "@/pages/user-profile/components/AdminUsersTab";
import EventsTab from "@/pages/user-profile/components/EventsTab";
import CommunityFindsTab from "@/pages/user-profile/components/CommunityFindsTab";
import EditCommunityFindDialog from "@/pages/user-profile/components/EditCommunityFindDialog";
import VerificationAdminTab from "@/pages/user-profile/components/VerificationAdminTab";
import BusinessModerationTab from "@/pages/user-profile/components/BusinessModerationTab";
import OwnershipAdminTab from "@/pages/user-profile/components/OwnershipAdminTab";
import ReportsAdminTab from "@/pages/user-profile/components/ReportsAdminTab";
import FeaturedPlacementsTab from "@/pages/user-profile/components/FeaturedPlacementsTab";
import UserProfileDialogs from "@/pages/user-profile/components/UserProfileDialogs";
import { useAdminSearchSettings } from "@/pages/user-profile/hooks/useAdminSearchSettings";
import { useAdminUsers, USER_MANAGEMENT_ADMIN_EMAIL } from "@/pages/user-profile/hooks/useAdminUsers";
import { useCommunityContent } from "@/pages/user-profile/hooks/useCommunityContent";
import { useVerificationAdmin } from "@/pages/user-profile/hooks/useVerificationAdmin";
import { useOwnershipAdmin } from "@/pages/user-profile/hooks/useOwnershipAdmin";
import { useReportsAdmin } from "@/pages/user-profile/hooks/useReportsAdmin";
import { useFeaturedAdmin } from "@/pages/user-profile/hooks/useFeaturedAdmin";
import { useInboxAndReviews } from "@/pages/user-profile/hooks/useInboxAndReviews";
import { useBusinessManagement } from "@/pages/user-profile/hooks/useBusinessManagement";

export default function UserProfile() {
  const navigate = useNavigate();
  const { session, user, isLoading, logout, refreshUnread, unreadMessages, refreshSession } = useAuth();
  const isAdmin = session?.role === "admin" || user?.role === "admin";
  const canManageUsers = isAdmin && String(user?.email || session?.email || "").trim().toLowerCase() === USER_MANAGEMENT_ADMIN_EMAIL;
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");

  const [activeTab, setActiveTab] = useState(tabParam || "perfil");
  const [showMissingProfileError, setShowMissingProfileError] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [myBusinesses, setMyBusinesses] = useState<BusinessFrontend[]>([]);
  const [loadingMyBusinesses, setLoadingMyBusinesses] = useState(true);
  const [myReviews, setMyReviews] = useState<ReceivedReviewWithBusiness[]>([]);
  const [allBusinesses, setAllBusinesses] = useState<BusinessFrontend[]>([]);
  const [myBusinessesPage, setMyBusinessesPage] = useState(1);
  const [allBusinessesPage, setAllBusinessesPage] = useState(1);
  const [allBusinessesSearch, setAllBusinessesSearch] = useState("");
  const [myBusinessesSearch, setMyBusinessesSearch] = useState("");
  const [moderationPreviewBusiness, setModerationPreviewBusiness] = useState<BusinessFrontend | null>(null);
  const [verificationAdminView, setVerificationAdminView] = useState<VerificationAdminView>("pendentes");

  const mobileContentRef = useRef<HTMLDivElement>(null);
  const communityEventDatePickerRef = useRef<HTMLInputElement>(null);

  const refreshOwnedBusinesses = async (ownerId = session?.userId) => {
    if (!ownerId) return;
    const businesses = await getBusinessesByOwner(ownerId);
    setMyBusinesses(businesses);
    const reviews = businesses.flatMap((business) =>
      business.reviews.map((review) => ({
        ...review,
        businessName: business.name,
        businessSlug: buildBusinessUrl(business),
        businessId: business.id,
      })),
    );
    setMyReviews(reviews);
    return businesses;
  };

  const refreshAllBusinesses = async () => {
    const businesses = await getAllBusinesses();
    setAllBusinesses(businesses);
    return businesses;
  };

  const {
    searchSynonymsConfig,
    searchSynonymsCategory,
    searchSynonymsDraft,
    followLinksBusinessIds,
    selectedFollowBusinessId,
    savingFollowLinksBusinessIds,
    setSearchSynonymsCategory,
    setSearchSynonymsDraft,
    setSelectedFollowBusinessId,
    handleSaveSearchSynonyms,
    handleResetSearchSynonyms,
    handleRefreshSitemap,
    handleEnableBusinessFollowLinks,
    handleDisableBusinessFollowLinks,
  } = useAdminSearchSettings({ isAdmin });

  const {
    users: adminUsers,
    search: adminUsersSearch,
    page: adminUsersPage,
    total: adminUsersTotal,
    totalPages: adminUsersTotalPages,
    loading: adminUsersLoading,
    error: adminUsersError,
    setSearch: setAdminUsersSearch,
    setPage: setAdminUsersPage,
    saveUser: saveAdminUser,
    deleteUser: deleteAdminUser,
    refresh: refreshAdminUsers,
  } = useAdminUsers({ enabled: canManageUsers });

  const handleTransferBusinessToAdmin = async (businessId: string) => {
    if (!canManageUsers) {
      throw new Error("Ação não autorizada.");
    }

    const result = await transferBusinessOwnershipByEmail(businessId, USER_MANAGEMENT_ADMIN_EMAIL);
    if (!result.ok) {
      throw new Error(result.error || "Não foi possível transferir o negócio.");
    }

    toast.success("Negócio transferido para sua conta.");
    await Promise.allSettled([
      refreshAdminUsers(),
      refreshAllBusinesses(),
      refreshOwnedBusinesses(session?.userId),
    ]);
  };

  const {
    myCommunityEvents,
    myCommunityFinds,
    showCommunityFindForm,
    editingCommunityFind,
    editingCommunityFindSubmitting,
    editingCommunityFindForm,
    savingCommunityEvent,
    editingCommunityEventId,
    communityEventFlyerFile,
    communityEventForm,
    setShowCommunityFindForm,
    setEditingCommunityFind,
    setEditingCommunityFindForm,
    setCommunityEventFlyerFile,
    setCommunityEventForm,
    refreshCommunityEvents,
    resetCommunityEventEditor,
    handleCreateCommunityEvent,
    handleStartEditCommunityEvent,
    handleDeleteCommunityEvent,
    handleCommunityFindCreated,
    handleDeleteCommunityFind,
    handleStartEditCommunityFind,
    handleSaveCommunityFindEdit,
  } = useCommunityContent({
    sessionUserId: session?.userId,
    onBusinessesRefresh: refreshOwnedBusinesses,
    onActivateEventsTab: () => setActiveTab("eventos"),
  });

  const {
    verificationBusiness,
    verificationSubmitting,
    instagramPostUrl,
    verificationRequests,
    verificationLoading,
    myVerificationRequests,
    pendingModerationBusinesses,
    moderationLoading,
    setVerificationBusiness,
    setInstagramPostUrl,
    loadVerificationAdminData,
    loadBusinessModerationData,
    getMyVerificationStatusByBusiness,
    handleModerationDecision,
    handleOpenVerificationModal,
    handleSubmitVerificationRequest,
    handleApproveVerification,
    handleRejectVerification,
    handleRemoveBusinessVerification,
  } = useVerificationAdmin({
    isAdmin,
    sessionUserId: session?.userId,
    onAllBusinessesRefresh: refreshAllBusinesses,
  });

  const {
    ownershipRequests,
    ownershipLoading,
    transferBusinessId,
    transferEmail,
    setTransferBusinessId,
    setTransferEmail,
    loadOwnershipAdminData,
    handleApproveOwnership,
    handleRejectOwnership,
    handleDirectTransfer,
  } = useOwnershipAdmin({
    isAdmin,
    sessionUserId: session?.userId,
    onAllBusinessesRefresh: refreshAllBusinesses,
    onOwnedBusinessesRefresh: refreshOwnedBusinesses,
  });

  const {
    reports,
    communityFindReports,
    reportsLoading,
    reportsView,
    reportsKind,
    setReportsView,
    setReportsKind,
    loadReportsAdminData,
    handleReportStatus,
    handleArchiveReport,
    handleUnarchiveReport,
    handleCommunityFindReportStatus,
    handleArchiveCommunityFindReport,
    handleUnarchiveCommunityFindReport,
  } = useReportsAdmin({
    isAdmin,
    sessionUserId: session?.userId,
  });

  const {
    featuredPlacements,
    featuredLoading,
    featuredForm,
    setFeaturedForm,
    loadFeaturedAdminData,
    handleFeaturedBusinessChange,
    handleCreateFeaturedPlacement,
    handleToggleFeaturedStatus,
    handleDeleteFeaturedPlacement,
  } = useFeaturedAdmin({
    isAdmin,
    allBusinesses,
    onAllBusinessesRefresh: refreshAllBusinesses,
  });

  const {
    conversations,
    conversationPartners,
    selectedConv,
    messages,
    messageText,
    sendingMsg,
    messagesEndRef,
    messagesContainerRef,
    givenReviews,
    subAvaliacoesTab,
    editingReview,
    confirmDeleteReview,
    setMessageText,
    setSubAvaliacoesTab,
    setEditingReview,
    setConfirmDeleteReview,
    handleSelectConversation,
    handleSendMessage,
    handleDeleteConversation,
    handleStartEditReview,
    handleSaveEditReview,
    handleDeleteReview,
  } = useInboxAndReviews({
    sessionUserId: session?.userId,
    refreshUnread,
  });

  const {
    creatingBusiness,
    editingBusiness,
    couponBusiness,
    menuBusiness,
    serviceBusiness,
    eventsBusiness,
    savingCoupon,
    savingMenu,
    savingServices,
    savingEvents,
    savingBusiness,
    couponItems,
    menuItems,
    serviceItems,
    menuNameErrors,
    serviceNameErrors,
    menuPdfUrl,
    menuPdfFile,
    eventItems,
    deleteTarget,
    couponForm,
    editFormData,
    editLogoFile,
    editHeroFile,
    existingPhotos,
    editPhotoFiles,
    eventFlyerFiles,
    eventDatePickerRefs,
    editBusinessHours,
    editBusinessHoursTouched,
    shortSlugStatus,
    shortSlugMessage,
    setCouponBusiness,
    setMenuBusiness,
    setServiceBusiness,
    setEventsBusiness,
    setMenuItems,
    setServiceItems,
    setMenuPdfUrl,
    setMenuPdfFile,
    setEventItems,
    setDeleteTarget,
    setCouponForm,
    setEditFormData,
    setEventFlyerFiles,
    closeBusinessEditor,
    normalizeShortSlugFinal,
    handleEditInputChange,
    handleFileChange,
    handleRemoveNewPhoto,
    handleRemoveExistingPhoto,
    handlePhotosChange,
    updateBusinessHour,
    handleEditPlaceSelected,
    handleSaveBusiness,
    handleDeleteMyBusiness,
    handleConfirmDeleteMyBusiness,
    handleOpenCouponModal,
    handleOpenMenuModal,
    handleSaveMenu,
    handleOpenServicesModal,
    handleSaveServices,
    handleOpenEventsModal,
    handleAddEvent,
    handleRemoveEvent,
    handleSaveEvents,
    handleOpenPdfPrivately,
    handleAddCoupon,
    handleRemoveCoupon,
    handleSaveCoupon,
    formatIsoToBr,
    normalizeDateForInput,
    getCategoryId,
    getCurrencyPrefixForCountry,
  } = useBusinessManagement({
    sessionUserId: session?.userId,
    onOwnedBusinessesRefresh: refreshOwnedBusinesses,
    onAllBusinessesRefresh: refreshAllBusinesses,
    onCommunityEventsRefresh: refreshCommunityEvents,
  });

  const isServerRender = typeof window === "undefined";

  useEffect(() => {
    if (tabParam) {
      Promise.resolve().then(() => {
        setActiveTab(tabParam);
      });
    }
  }, [tabParam]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(max-width: 767px)").matches) return;
    requestAnimationFrame(() => {
      mobileContentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [activeTab]);

  useEffect(() => {
    if (!session || user || isLoading) {
      Promise.resolve().then(() => {
        setShowMissingProfileError(false);
      });
      return;
    }

    const timer = setTimeout(() => {
      setShowMissingProfileError(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, [session, user, isLoading]);

  useEffect(() => {
    if (isLoading) return;
    if (!session) {
      navigate("/entrar?redirect=/perfil");
      return;
    }

    setLoadingMyBusinesses(true);
    void refreshOwnedBusinesses(session.userId).finally(() => {
      setLoadingMyBusinesses(false);
    });
  }, [session, user, navigate, isLoading]);

  useEffect(() => {
    setMyBusinessesPage(1);
  }, [myBusinesses.length]);

  useEffect(() => {
    setAllBusinessesPage(1);
  }, [allBusinessesSearch]);


  const handleMyBusinessesSearchChange = (value: string) => {
    setMyBusinessesSearch(value);
    setMyBusinessesPage(1);
  };

  const handleSaveProfile = async () => {
    if (!session) return;
    setIsUploading(true);

    let avatarUrl = user?.avatar || "";
    if (avatarFile) {
      const path = generateImagePath(session.userId, "photo", avatarFile.name);
      const url = await uploadImage("business-images", path, avatarFile);
      if (url) avatarUrl = url;
    }

    const success = await updateProfile(session.userId, {
      name: editName,
      bio: editBio,
      phone: editPhone,
      location: editLocation,
      avatar: avatarUrl,
    });

    if (success) {
      setIsEditing(false);
      setAvatarFile(null);
      toast.success("Perfil atualizado!");
      await refreshSession();
    } else {
      toast.error("Erro ao atualizar perfil.");
    }

    setIsUploading(false);
  };

  const handleChangePassword = async () => {
    const email = user?.email || session?.email || "";
    if (!email) {
      toast.error("Nao foi possivel identificar o e-mail da conta.");
      return;
    }
    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      toast.error("Preencha a senha atual, a nova senha e a confirmacao.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("A nova senha e a confirmacao nao conferem.");
      return;
    }

    setIsChangingPassword(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    });

    if (signInError) {
      setIsChangingPassword(false);
      toast.error("Senha atual incorreta.");
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setIsChangingPassword(false);

    if (updateError) {
      toast.error(updateError.message);
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    toast.success("Senha atualizada com sucesso.");
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
    toast.success("Voce saiu da sua conta.");
  };

  const MY_BUSINESSES_PER_PAGE = 5;
  const ALL_BUSINESSES_PER_PAGE = 5;

  const myBusinessesQuery = (myBusinessesSearch || "").trim().toLowerCase();
  const filteredMyBusinesses = myBusinesses.filter((biz) => {
    if (!myBusinessesQuery) return true;
    const name = (biz.name || "").toLowerCase();
    const city = (biz.address.city || "").toLowerCase();
    const country = (biz.address.country || "").toLowerCase();
    const countryCode = (biz.address.countryCode || "").toLowerCase();
    return (
      name.includes(myBusinessesQuery) ||
      city.includes(myBusinessesQuery) ||
      country.includes(myBusinessesQuery) ||
      countryCode.includes(myBusinessesQuery)
    );
  });
  const myBusinessesTotalPages = Math.max(1, Math.ceil(filteredMyBusinesses.length / MY_BUSINESSES_PER_PAGE));
  const safeMyBusinessesPage = Math.min(myBusinessesPage, myBusinessesTotalPages);
  const paginatedMyBusinesses = filteredMyBusinesses.slice(
    (safeMyBusinessesPage - 1) * MY_BUSINESSES_PER_PAGE,
    safeMyBusinessesPage * MY_BUSINESSES_PER_PAGE,
  );

  const allBusinessesQuery = (allBusinessesSearch || "").trim().toLowerCase();
  const filteredAllBusinesses = allBusinesses.filter((biz) => {
    if (!allBusinessesQuery) return true;
    const name = (biz.name || "").toLowerCase();
    const city = (biz.address.city || "").toLowerCase();
    const country = (biz.address.country || "").toLowerCase();
    const countryCode = (biz.address.countryCode || "").toLowerCase();
    return (
      name.includes(allBusinessesQuery) ||
      city.includes(allBusinessesQuery) ||
      country.includes(allBusinessesQuery) ||
      countryCode.includes(allBusinessesQuery)
    );
  });
  const allBusinessesTotalPages = Math.max(1, Math.ceil(filteredAllBusinesses.length / ALL_BUSINESSES_PER_PAGE));
  const safeAllBusinessesPage = Math.min(allBusinessesPage, allBusinessesTotalPages);
  const paginatedAllBusinesses = filteredAllBusinesses.slice(
    (safeAllBusinessesPage - 1) * ALL_BUSINESSES_PER_PAGE,
    safeAllBusinessesPage * ALL_BUSINESSES_PER_PAGE,
  );

  const centeredShellClassName = "min-h-screen flex items-center justify-center bg-background";

  if (isServerRender || isLoading) {
    return (
      <div className={centeredShellClassName}>
        <div className="text-center">
          <PawPrint className="mx-auto mb-4 h-16 w-16 animate-pulse text-muted-foreground/30" />
          <p className="text-muted-foreground">Carregando seu perfil...</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  if (!user) {
    if (!showMissingProfileError) {
      return (
        <div className={centeredShellClassName}>
          <div className="text-center">
            <PawPrint className="mx-auto mb-4 h-16 w-16 animate-pulse text-muted-foreground/30" />
            <p className="text-muted-foreground">Carregando seu perfil...</p>
          </div>
        </div>
      );
    }

    return (
      <div className={centeredShellClassName}>
        <div className="max-w-sm p-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
            <User className="h-8 w-8 text-amber-600" />
          </div>
          <h1 className="mb-2 text-xl font-bold">Ops! Perfil nao encontrado</h1>
          <p className="mb-6 text-muted-foreground">
            Nao conseguimos carregar suas informacoes. Isso pode acontecer se seu perfil ainda nao foi criado no banco de dados.
          </p>
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => {
                if (typeof window !== "undefined") window.location.reload();
              }}
              className="w-full border-0 caramelo-gradient text-white"
            >
              Tentar novamente
            </Button>
            <Button variant="ghost" onClick={logout} className="w-full">
              Sair da conta
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between sm:h-24">
            <Link to="/" className="group flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center sm:h-20 sm:w-20">
                <img src="/logo.webp" alt="Caramelinho logo" className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-110" />
              </div>
              <div className="min-w-0 leading-tight">
                <div className="truncate text-lg font-extrabold tracking-tight caramelo-text-gradient sm:text-2xl">Caramelinho</div>
                <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[10px] font-semibold text-foreground/75 sm:text-sm">
                  {"O SEU FARO FORA DO BRASIL"}
                </div>
              </div>
            </Link>

            <div className="flex items-center gap-1.5 sm:gap-4">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Link to="/perfil?tab=mensagens" onClick={() => setActiveTab("mensagens")} className="group relative">
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-muted-foreground hover:bg-secondary sm:h-10 sm:w-10">
                    <MessageCircle className="h-5 w-5" />
                    {unreadMessages > 0 ? (
                      <span className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-primary text-[10px] font-bold text-white">
                        {unreadMessages > 9 ? "9+" : unreadMessages}
                      </span>
                    ) : null}
                  </Button>
                </Link>
                <Link to="/perfil">
                  <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-full border-border px-2.5 hover:bg-secondary sm:h-10 sm:gap-2 sm:px-4">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10">
                      <User className="h-3 w-3 text-primary" />
                    </div>
                    <span className="max-w-[90px] truncate font-medium sm:max-w-none">{session.name?.split(" ")[0] || "Perfil"}</span>
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex-1 w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col gap-8 md:flex-row lg:gap-12">
          <UserProfileNavigation
            activeTab={activeTab}
            isAdmin={isAdmin}
            canManageUsers={canManageUsers}
            unreadMessages={unreadMessages}
            myCommunityFinds={myCommunityFinds}
            onTabChange={setActiveTab}
            onLogout={() => {
              void handleLogout();
            }}
          />

          <div ref={mobileContentRef} className="min-w-0 flex-1">
            <ProfileTab
              user={user}
              isEditing={isEditing}
              isUploading={isUploading}
              editName={editName}
              editBio={editBio}
              editPhone={editPhone}
              editLocation={editLocation}
              avatarFile={avatarFile}
              currentPassword={currentPassword}
              newPassword={newPassword}
              confirmPassword={confirmPassword}
              isChangingPassword={isChangingPassword}
              onStartEdit={() => {
                setIsEditing(true);
                setEditName(user.name);
                setEditBio(user.bio);
                setEditPhone(user.phone);
                setEditLocation(user.location);
              }}
              onCancelEdit={() => setIsEditing(false)}
              onAvatarFileChange={setAvatarFile}
              onEditNameChange={setEditName}
              onEditBioChange={setEditBio}
              onEditPhoneChange={setEditPhone}
              onEditLocationChange={setEditLocation}
              onSaveProfile={handleSaveProfile}
              onCurrentPasswordChange={setCurrentPassword}
              onNewPasswordChange={setNewPassword}
              onConfirmPasswordChange={setConfirmPassword}
              onChangePassword={handleChangePassword}
            />

            <BusinessesTab
              loadingMyBusinesses={loadingMyBusinesses}
              myBusinesses={myBusinesses}
              paginatedMyBusinesses={paginatedMyBusinesses}
              filteredMyBusinesses={filteredMyBusinesses}
              myBusinessesTotalPages={myBusinessesTotalPages}
              safeMyBusinessesPage={safeMyBusinessesPage}
              getMyVerificationStatusByBusiness={getMyVerificationStatusByBusiness}
              getCategoryLabel={getCategoryLabel}
              myBusinessesSearch={myBusinessesSearch}
              onSearchChange={handleMyBusinessesSearchChange}
              onPageChange={(page) => setMyBusinessesPage(page)}
              onOpenMenuModal={handleOpenMenuModal}
              onOpenServicesModal={handleOpenServicesModal}
              onOpenEventsModal={handleOpenEventsModal}
              onOpenCouponModal={handleOpenCouponModal}
              onOpenVerificationModal={handleOpenVerificationModal}
              onDeleteMyBusiness={handleDeleteMyBusiness}
            />

            {isAdmin ? (
              <AllBusinessesTab
                filteredAllBusinesses={filteredAllBusinesses}
                paginatedAllBusinesses={paginatedAllBusinesses}
                allBusinessesSearch={allBusinessesSearch}
                safeAllBusinessesPage={safeAllBusinessesPage}
                allBusinessesTotalPages={allBusinessesTotalPages}
                getCategoryLabel={getCategoryLabel}
                onSearchChange={setAllBusinessesSearch}
                onPageChange={(page) => setAllBusinessesPage(page)}
                onDeleteBusiness={handleDeleteMyBusiness}
              />
            ) : null}

            {canManageUsers ? (
              <AdminUsersTab
                users={adminUsers}
                search={adminUsersSearch}
                page={adminUsersPage}
                total={adminUsersTotal}
                totalPages={adminUsersTotalPages}
                loading={adminUsersLoading}
                error={adminUsersError}
                adminUserId={session?.userId}
                onSearchChange={setAdminUsersSearch}
                onPageChange={setAdminUsersPage}
                onRefresh={refreshAdminUsers}
                onSaveUser={saveAdminUser}
                onDeleteUser={deleteAdminUser}
                onTransferBusinessOwnership={handleTransferBusinessToAdmin}
              />
            ) : null}

            <EventsTab
              editingCommunityEventId={editingCommunityEventId}
              communityEventForm={communityEventForm}
              communityEventFlyerFile={communityEventFlyerFile}
              savingCommunityEvent={savingCommunityEvent}
              myCommunityEvents={myCommunityEvents}
              myBusinesses={myBusinesses}
              communityEventDatePickerRef={communityEventDatePickerRef}
              onSubmit={handleCreateCommunityEvent}
              setCommunityEventForm={setCommunityEventForm}
              setCommunityEventFlyerFile={setCommunityEventFlyerFile}
              onCancelEdit={resetCommunityEventEditor}
              onStartEditCommunityEvent={handleStartEditCommunityEvent}
              onDeleteCommunityEvent={handleDeleteCommunityEvent}
            />

            <CommunityFindsTab
              showCommunityFindForm={showCommunityFindForm}
              myCommunityFinds={myCommunityFinds}
              onToggleForm={() => setShowCommunityFindForm((prev) => !prev)}
              onCreated={handleCommunityFindCreated}
              onStartEditCommunityFind={handleStartEditCommunityFind}
              onDeleteCommunityFind={handleDeleteCommunityFind}
            />

            <EditCommunityFindDialog
              editingCommunityFind={editingCommunityFind}
              editingCommunityFindForm={editingCommunityFindForm}
              editingCommunityFindSubmitting={editingCommunityFindSubmitting}
              onClose={() => setEditingCommunityFind(null)}
              onFormChange={setEditingCommunityFindForm}
              onSave={handleSaveCommunityFindEdit}
            />

            {isAdmin ? (
              <VerificationAdminTab
                verificationAdminView={verificationAdminView}
                verificationLoading={verificationLoading}
                verificationRequests={verificationRequests}
                allBusinesses={allBusinesses}
                onVerificationAdminViewChange={setVerificationAdminView}
                onRefresh={() => {
                  void loadVerificationAdminData();
                }}
                onApproveVerification={handleApproveVerification}
                onRejectVerification={handleRejectVerification}
                onRemoveBusinessVerification={handleRemoveBusinessVerification}
              />
            ) : null}

            {isAdmin ? (
              <BusinessModerationTab
                moderationLoading={moderationLoading}
                pendingModerationBusinesses={pendingModerationBusinesses}
                onRefresh={() => {
                  void loadBusinessModerationData();
                }}
                onPreview={setModerationPreviewBusiness}
                onDecision={(business, status) => {
                  void handleModerationDecision(business, status);
                }}
              />
            ) : null}

            {isAdmin ? (
              <OwnershipAdminTab
                transferBusinessId={transferBusinessId}
                transferEmail={transferEmail}
                allBusinesses={allBusinesses}
                ownershipRequests={ownershipRequests}
                ownershipLoading={ownershipLoading}
                onTransferBusinessIdChange={setTransferBusinessId}
                onTransferEmailChange={setTransferEmail}
                onSubmitTransfer={handleDirectTransfer}
                onRefresh={() => {
                  void loadOwnershipAdminData();
                }}
                onApproveOwnership={handleApproveOwnership}
                onRejectOwnership={handleRejectOwnership}
              />
            ) : null}

            {isAdmin ? (
              <ReportsAdminTab
                reportsKind={reportsKind}
                reportsView={reportsView}
                reportsLoading={reportsLoading}
                reports={reports}
                communityFindReports={communityFindReports}
                onReportsKindChange={setReportsKind}
                onReportsViewChange={setReportsView}
                onRefresh={() => {
                  void loadReportsAdminData(reportsView);
                }}
                onReportStatus={handleReportStatus}
                onArchiveReport={handleArchiveReport}
                onUnarchiveReport={handleUnarchiveReport}
                onCommunityFindReportStatus={handleCommunityFindReportStatus}
                onArchiveCommunityFindReport={handleArchiveCommunityFindReport}
                onUnarchiveCommunityFindReport={handleUnarchiveCommunityFindReport}
              />
            ) : null}

            {isAdmin ? (
              <FeaturedPlacementsTab
                allBusinesses={allBusinesses}
                featuredForm={featuredForm}
                featuredPlacements={featuredPlacements}
                featuredLoading={featuredLoading}
                setFeaturedForm={setFeaturedForm}
                onBusinessChange={handleFeaturedBusinessChange}
                onSubmit={handleCreateFeaturedPlacement}
                onRefresh={() => {
                  void loadFeaturedAdminData();
                }}
                onToggleStatus={handleToggleFeaturedStatus}
                onDelete={handleDeleteFeaturedPlacement}
              />
            ) : null}

            {isAdmin ? (
              <SearchSettingsTab
                allBusinesses={allBusinesses}
                searchSynonymsConfig={searchSynonymsConfig}
                searchSynonymsCategory={searchSynonymsCategory}
                searchSynonymsDraft={searchSynonymsDraft}
                selectedFollowBusinessId={selectedFollowBusinessId}
                followLinksBusinessIds={followLinksBusinessIds}
                savingFollowLinksBusinessIds={savingFollowLinksBusinessIds}
                onSearchSynonymsCategoryChange={setSearchSynonymsCategory}
                onSearchSynonymsDraftChange={setSearchSynonymsDraft}
                onSelectedFollowBusinessIdChange={setSelectedFollowBusinessId}
                onSaveSearchSynonyms={handleSaveSearchSynonyms}
                onResetSearchSynonyms={handleResetSearchSynonyms}
                onRefreshSitemap={handleRefreshSitemap}
                onEnableBusinessFollowLinks={handleEnableBusinessFollowLinks}
                onDisableBusinessFollowLinks={handleDisableBusinessFollowLinks}
              />
            ) : null}

            <ReviewsTab
              subAvaliacoesTab={subAvaliacoesTab}
              onSubAvaliacoesTabChange={setSubAvaliacoesTab}
              myReviews={myReviews}
              givenReviews={givenReviews}
              userName={user.name}
              onStartEditReview={handleStartEditReview}
              onConfirmDeleteReview={setConfirmDeleteReview}
            />

            <MessagesTab
              conversations={conversations}
              conversationPartners={conversationPartners}
              selectedConv={selectedConv}
              messages={messages}
              currentUserId={session.userId}
              messageText={messageText}
              sendingMsg={sendingMsg}
              messagesContainerRef={messagesContainerRef}
              messagesEndRef={messagesEndRef}
              onSelectConversation={handleSelectConversation}
              onDeleteConversation={handleDeleteConversation}
              onMessageTextChange={setMessageText}
              onSendMessage={handleSendMessage}
            />
          </div>
        </Tabs>
      </main>

      <ModerationPreviewDialog
        business={moderationPreviewBusiness}
        onClose={() => setModerationPreviewBusiness(null)}
        onDecision={(business, status) => {
          void handleModerationDecision(business, status);
          setModerationPreviewBusiness(null);
        }}
        getCategoryLabel={getCategoryLabel}
      />

      <EditReviewDialog
        editingReview={editingReview}
        onClose={() => setEditingReview(null)}
        onChange={setEditingReview}
        onSave={handleSaveEditReview}
      />

      <DeleteReviewDialog
        confirmDeleteReview={confirmDeleteReview}
        onClose={() => setConfirmDeleteReview(null)}
        onDelete={handleDeleteReview}
      />

      <UserProfileDialogs
        businessCategoryOptions={BUSINESS_CATEGORY_OPTIONS}
        creatingBusiness={creatingBusiness}
        editingBusiness={editingBusiness}
        closeBusinessEditor={closeBusinessEditor}
        editFormData={editFormData}
        setEditFormData={setEditFormData}
        handleEditInputChange={handleEditInputChange}
        normalizeShortSlugFinal={normalizeShortSlugFinal}
        shortSlugStatus={shortSlugStatus}
        shortSlugMessage={shortSlugMessage}
        getCategoryId={getCategoryId}
        editBusinessHours={editBusinessHours}
        editBusinessHoursTouched={editBusinessHoursTouched}
        updateBusinessHour={updateBusinessHour}
        handleFileChange={handleFileChange}
        editLogoFile={editLogoFile}
        editHeroFile={editHeroFile}
        existingPhotos={existingPhotos}
        editPhotoFiles={editPhotoFiles}
        handleRemoveExistingPhoto={handleRemoveExistingPhoto}
        handleRemoveNewPhoto={handleRemoveNewPhoto}
        handlePhotosChange={handlePhotosChange}
        handleEditPlaceSelected={handleEditPlaceSelected}
        savingBusiness={savingBusiness}
        handleSaveBusiness={handleSaveBusiness}
        couponBusiness={couponBusiness}
        setCouponBusiness={setCouponBusiness}
        couponItems={couponItems}
        couponForm={couponForm}
        setCouponForm={setCouponForm}
        handleRemoveCoupon={handleRemoveCoupon}
        handleAddCoupon={handleAddCoupon}
        handleSaveCoupon={handleSaveCoupon}
        savingCoupon={savingCoupon}
        formatIsoToBr={formatIsoToBr}
        normalizeDateForInput={normalizeDateForInput}
        menuBusiness={menuBusiness}
        setMenuBusiness={setMenuBusiness}
        menuItems={menuItems}
        setMenuItems={setMenuItems}
        menuNameErrors={menuNameErrors}
        getCurrencyPrefixForCountry={getCurrencyPrefixForCountry}
        menuPdfFile={menuPdfFile}
        setMenuPdfFile={setMenuPdfFile}
        menuPdfUrl={menuPdfUrl}
        setMenuPdfUrl={setMenuPdfUrl}
        handleOpenPdfPrivately={handleOpenPdfPrivately}
        handleSaveMenu={handleSaveMenu}
        savingMenu={savingMenu}
        serviceBusiness={serviceBusiness}
        setServiceBusiness={setServiceBusiness}
        serviceItems={serviceItems}
        setServiceItems={setServiceItems}
        serviceNameErrors={serviceNameErrors}
        handleSaveServices={handleSaveServices}
        savingServices={savingServices}
        eventsBusiness={eventsBusiness}
        setEventsBusiness={setEventsBusiness}
        eventItems={eventItems}
        setEventItems={setEventItems}
        eventDatePickerRefs={eventDatePickerRefs}
        eventFlyerFiles={eventFlyerFiles}
        setEventFlyerFiles={setEventFlyerFiles}
        handleAddEvent={handleAddEvent}
        handleRemoveEvent={handleRemoveEvent}
        handleSaveEvents={handleSaveEvents}
        savingEvents={savingEvents}
        verificationBusiness={verificationBusiness}
        setVerificationBusiness={setVerificationBusiness}
        verificationSubmitting={verificationSubmitting}
        instagramPostUrl={instagramPostUrl}
        setInstagramPostUrl={setInstagramPostUrl}
        handleSubmitVerificationRequest={handleSubmitVerificationRequest}
        deleteTarget={deleteTarget}
        setDeleteTarget={setDeleteTarget}
        handleConfirmDeleteMyBusiness={handleConfirmDeleteMyBusiness}
      />

      <SiteFooter />
    </div>
  );
}
