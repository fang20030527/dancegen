type HeaderAuthUser = {
  email?: string | null;
  id: string;
  name?: string | null;
};

export type HeaderAuthStatus = {
  accountLabel: string | null;
  isSignedIn: boolean;
  statusLabel: "Signed in" | "Signed out";
};

export function getHeaderAuthStatus(user: HeaderAuthUser | null | undefined): HeaderAuthStatus {
  if (!user) {
    return {
      accountLabel: null,
      isSignedIn: false,
      statusLabel: "Signed out",
    };
  }

  return {
    accountLabel: user.email || user.name || user.id,
    isSignedIn: true,
    statusLabel: "Signed in",
  };
}
