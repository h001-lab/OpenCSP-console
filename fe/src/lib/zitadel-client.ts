import { SignJWT } from 'jose';

interface ZitadelServiceAccount {
  type: 'serviceaccount';
  keyId: string;
  key: string;
  userId: string;
}

interface ZitadelGrant {
  roles?: string[];
  [key: string]: unknown;
}

interface ZitadelUser {
  userId: string;
  [key: string]: unknown;
}

/**
 * Zitadel API 클라이언트
 * Service Account 방식을 우선 사용하고, 없으면 User Access Token 사용
 */
export class ZitadelClient {
  private issuer: string;
  private serviceAccount?: ZitadelServiceAccount;

  constructor() {
    this.issuer = process.env.ZITADEL_ISSUER!;
    
    // Service Account 설정 확인
    if (process.env.ZITADEL_SERVICE_USER_ID && 
        process.env.ZITADEL_SERVICE_KEY_ID && 
        process.env.ZITADEL_SERVICE_KEY) {
      this.serviceAccount = {
        type: 'serviceaccount',
        keyId: process.env.ZITADEL_SERVICE_KEY_ID,
        key: process.env.ZITADEL_SERVICE_KEY,
        userId: process.env.ZITADEL_SERVICE_USER_ID,
      };
    }
  }

  /**
   * Service Account JWT 생성
   */
  private async createServiceAccountJWT(): Promise<string> {
    if (!this.serviceAccount) {
      throw new Error('Service Account not configured');
    }

    const privateKey = await crypto.subtle.importKey(
      'pkcs8',
      Buffer.from(this.serviceAccount.key, 'base64'),
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['sign']
    );

    const jwt = await new SignJWT({
      iss: this.serviceAccount.userId,
      sub: this.serviceAccount.userId,
      aud: this.issuer,
    })
      .setProtectedHeader({ 
        alg: 'RS256',
        kid: this.serviceAccount.keyId,
      })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(privateKey);

    return jwt;
  }

  /**
   * Service Account로 Access Token 획득
   */
  private async getServiceAccountToken(): Promise<string> {
    const assertion = await this.createServiceAccountJWT();

    const response = await fetch(`${this.issuer}/oauth/v2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
        scope: 'openid profile email urn:zitadel:iam:org:project:id:zitadel:aud',
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get service account token: ${response.statusText}`);
    }

    const data = await response.json();
    return data.access_token;
  }

  /**
   * Access Token 획득 (Service Account 우선, fallback to user token)
   */
  async getAccessToken(userToken?: string): Promise<string> {
    // 1. Service Account 사용 (우선)
    if (this.serviceAccount) {
      try {
        return await this.getServiceAccountToken();
      } catch (error) {
        console.warn('Service Account token failed, falling back to user token:', error);
      }
    }

    // 2. User Token 사용 (fallback)
    if (userToken) {
      return userToken;
    }

    throw new Error('No authentication method available');
  }

  /**
   * 사용자 목록 조회 (roles 포함)
   */
  async listUsers(accessToken: string, limit = 100) {
    const response = await fetch(
      `${this.issuer}/management/v1/users/_search`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          queries: [],
          limit,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch users: ${response.statusText} - ${error}`);
    }

    const data = await response.json();
    
    // 각 사용자의 grants(roles) 조회
    if (data.result && Array.isArray(data.result)) {
      const usersWithRoles = await Promise.all(
        data.result.map(async (user: ZitadelUser) => {
          try {
            const grantsData = await this.getUserGrants(accessToken, user.userId);
            const roles: string[] = [];
            
            // grants에서 roles 추출
            if (grantsData.result && Array.isArray(grantsData.result)) {
              grantsData.result.forEach((grant: ZitadelGrant) => {
                if (grant.roles && Array.isArray(grant.roles)) {
                  roles.push(...grant.roles);
                }
              });
            }
            
            return {
              ...user,
              roles: [...new Set(roles)], // 중복 제거
            };
          } catch (error) {
            console.warn(`Failed to fetch grants for user ${user.userId}:`, error);
            return {
              ...user,
              roles: [],
            };
          }
        })
      );
      
      return {
        ...data,
        result: usersWithRoles,
      };
    }

    return data;
  }

  /**
   * 사용자의 권한(grants) 조회
   */
  async getUserGrants(accessToken: string, userId: string) {
    const response = await fetch(
      `${this.issuer}/management/v1/users/${userId}/grants/_search`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          queries: [],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch user grants: ${response.statusText}`);
    }

    return response.json();
  }
}

// 싱글톤 인스턴스
export const zitadelClient = new ZitadelClient();
