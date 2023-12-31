import { Injectable } from "@nestjs/common";
import { IOAuth2Config } from "~/external-auth-integration/auth-providers/oauth2/@types";

/**
 * Service for configuring Google V2 OAuth2.
 */
@Injectable()
export class GoogleV2Config {
  public oAuth2Config: IOAuth2Config;

  constructor() {
    // Initialize the OAuth2 configuration object
    this.oAuth2Config = {
      credentials: {
        id: process.env.GOOGLE_OAUTH_V2_CLIENT_ID,
        secret: process.env.GOOGLE_OAUTH_V2_CLIENT_SECRET,
      },
      scope: ["https://www.googleapis.com/auth/drive"],
      provider: {
        authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenUrl: "https://accounts.google.com/o/oauth2/token",
        callbackUrl: `${process.env.HOST_CONFIG_URL}/oauth/callback`,
        verifyTokenUrl: "https://oauth2.googleapis.com/tokeninfo",
        refreshTokenUrl: "https://oauth2.googleapis.com/token",
        tokenRefreshBuffer: 7776000, // 90 days
        callbackUrlParams: {
          response_type: "code",
          access_type: "offline",
        },
      },
    };
  }
}
