export interface ZitadelUser {
  userId: string;
  userName: string;
  preferredLoginName: string;
  human?: {
    profile: {
      firstName: string;
      lastName: string;
      displayName: string;
    };
    email: {
      email: string;
      isEmailVerified: boolean;
    };
  };
  state: 'USER_STATE_ACTIVE' | 'USER_STATE_INACTIVE' | 'USER_STATE_DELETED' | 'USER_STATE_LOCKED';
  creationDate?: string;
  changeDate?: string;
  roles?: string[];
}


export interface UserGrant {
  userId: string;
  roles: string[];
  projectId: string;
  grantId: string;
}

export interface ZitadelUsersResponse {
  result: ZitadelUser[];
  details: {
    totalResult: string;
    processedSequence: string;
    viewTimestamp: string;
  };
}
