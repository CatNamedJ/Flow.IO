import { EncryptionDecryptionService } from "src/encryption-decryption/encryption-decryption.service";
import {
  IOAuth2Config,
  OAuth2UrlParams,
} from "../auth-providers/oauth2/@types";
import { lastValueFrom } from "rxjs";
import { map } from "rxjs/operators";
import { HttpService } from "@nestjs/axios";
import { Logger } from "@nestjs/common";

/**
 * Converts a given string to a Base64 URL safe encoded string.
 * @param {string} data - The string to be encoded.
 * @returns {string} - The Base64 URL safe encoded string.
 */
export function toBase64UrlSafe(data: string): string {
  return Buffer.from(data)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Converts a Base64 URL safe encoded string to a given string.
 * @param data
 * @returns
 */
export function decodeBase64UrlToString(data: string): string {
  const standardBase64 = data
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .concat("=".repeat((4 - (data.length % 4)) % 4));

  const decodeData = Buffer.from(standardBase64, "base64").toString();
  return decodeData;
}

// /**
//  * Creates an OAuth2 authorization URL by merging the given parameters with the default parameters.
//  * @param config: IOAuth2Config
//  * @param params: OAuth2UrlParams
//  * @returns {string} - The OAuth2 authorization URL.
//  */

// // TODO: Create URL function like createOAuth2AuthUrl, createOAuth2VerifyUrl and createOAuth2RefreshUrl maybe with a generic function
// export function createOAuth2AuthUrl(
//   config: IOAuth2Config,
//   params: OAuth2UrlParams
// ): string {
//   // Ensure the base URL is present
//   if (!config || !config.provider.authorizeUrl) {
//     throw new Error(
//       "Invalid OAuth2 configuration - 'authorizeUrl' is required"
//     );
//   }

//   const url = new URL(config.provider.authorizeUrl);

//   // Merge custom parameters with default parameters
//   const searchParams = new URLSearchParams({
//     client_id: config.credentials.id,
//     redirect_uri: config.provider.callbackUrl,
//     scope: config.scope.join(" "),
//     ...config.provider.callbackUrlParams,
//     ...params,
//   });

//   url.search = searchParams.toString();
//   return url.toString();
// }

// /**
//  * Creates an OAuth2 token verification URL by merging the given parameters with the default parameters.
//  * @param config
//  * @param params
//  * @returns
//  */
// export function createOAuth2VerifyUrl(
//   config: IOAuth2Config,
//   params: OAuth2UrlParams
// ): string {
//   // Ensure the base URL is present
//   if (!config || !config.provider.verifyTokenUrl || !params.access_token) {
//     throw new Error(
//       "Invalid OAuth2 configuration - 'verifyTokenUrl' and 'access_token' are required"
//     );
//   }

//   const url = new URL(config.provider.verifyTokenUrl);

//   const searchParams = new URLSearchParams({
//     access_token: params.access_token,
//   });

//   url.search = searchParams.toString();
//   return url.toString();
// }

// /**
//  * Creates an OAuth2 token refresh URL by merging the given parameters with the default parameters.
//  * @param config
//  * @param params
//  * @returns
//  */
// export function createOAuth2RefreshUrl(
//   config: IOAuth2Config,
//   params: OAuth2UrlParams
// ): string {
//   // Ensure the base URL is present
//   if (!config || !config.provider.refreshTokenUrl || !params.refresh_token) {
//     throw new Error(
//       "Invalid OAuth2 configuration - 'refreshTokenUrl' and 'refresh_token' are required"
//     );
//   }

//   const url = new URL(config.provider.refreshTokenUrl);

//   const searchParams = new URLSearchParams({
//     refresh_token: params.refresh_token,
//   });

//   url.search = searchParams.toString();
//   return url.toString();
// }

/**
 * Creates an OAuth2 URL by merging the given parameters with the default parameters.
 * @param config
 * @param params
 * @param urlType
 * @returns
 */
export function createOAuth2Url(
  config: IOAuth2Config,
  params: OAuth2UrlParams,
  urlType: "authorize" | "verifyToken" | "refreshToken"
): string {
  let baseUrl: string;

  switch (urlType) {
    case "authorize":
      baseUrl = config.provider.authorizeUrl;
      // Merge specific params for authorization
      params = {
        client_id: config.credentials.id,
        redirect_uri: config.provider.callbackUrl,
        scope: config.scope.join(" "),
        ...config.provider.callbackUrlParams,
        ...params,
      };
      break;
    case "verifyToken":
      baseUrl = config.provider.verifyTokenUrl;
      // Additional checks or parameters for token verification can be added here
      break;
    case "refreshToken":
      baseUrl = config.provider.refreshTokenUrl;
      // Additional checks or parameters for token refresh can be added here
      break;
    default:
      throw new Error("Invalid URL type specified");
  }

  if (!baseUrl) {
    throw new Error(
      `Invalid OAuth2 configuration - '${urlType}Url' is required`
    );
  }

  const url = new URL(baseUrl);
  const searchParams = new URLSearchParams(params);
  url.search = searchParams.toString();

  return url.toString();
}

/**
 * Exchanges the given code for an OAuth2 token.
 * @param httpService  The HttpService instance.
 * @param config  The OAuth2 configuration.
 * @param code  The code to be exchanged for a token.
 * @returns  The ServerResponse.
 */
export async function exchangeCodeForToken(
  httpService: HttpService,
  config: IOAuth2Config,
  code: string
) {
  const tokenUrl = config.provider.tokenUrl;
  const GRANT_TYPE = "authorization_code";

  const payload = {
    client_id: config.credentials.id,
    client_secret: config.credentials.secret,
    redirect_uri: config.provider.callbackUrl,
    grant_type: GRANT_TYPE,
    code: code,
  };

  const response = await lastValueFrom(
    httpService.post(tokenUrl, payload).pipe(map((resp) => resp.data))
  );

  return response;
}

/**
 * Verifies the given OAuth2 token.
 * @param httpService
 * @param config
 * @param accessToken
 * @param additionalParams Additional parameters to be sent along with the token verification request.
 * @returns {Promise<any>}
 */

export async function verifyToken(
  httpService: HttpService,
  config: IOAuth2Config,
  accessToken: string,
  additionalParams?: { [key: string]: string }
): Promise<any> {
  const verifyUrl = createOAuth2Url(
    config,
    {
      access_token: accessToken,
      ...additionalParams,
    },
    "verifyToken"
  );

  const info = await lastValueFrom(
    httpService.get(verifyUrl).pipe(map((resp) => resp.data))
  );
  return info;
}

/**
 * Refreshes the given OAuth2 token.
 * @param httpService
 * @param config The OAuth2 configuration.
 * @param refreshToken
 * @param additionalParams Additional parameters to be sent along with the token refresh request.
 * @returns Response from the token refresh endpoint.
 */

export async function refreshToken(
  httpService: HttpService,
  config: IOAuth2Config,
  refreshToken: string,
  additionalParams?: { [key: string]: string }
): Promise<any> {
  const refreshUrl = createOAuth2Url(
    config,
    {
      refresh_token: refreshToken,
      ...additionalParams,
    },
    "refreshToken"
  );

  Logger.debug(`Refresh URL: ${refreshUrl}`, "OAuth2Utils");

  const payload = {
    client_id: config.credentials.id,
    client_secret: config.credentials.secret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  };

  const response = await lastValueFrom(
    httpService.post(refreshUrl, payload).pipe(map((resp) => resp.data))
  );
  Logger.debug(`Refresh response: ${JSON.stringify(response)}`, "OAuth2Utils");
  return response;
}
/**
 * Processes the OAuth2 state object by stringifying, encrypting and encoding it.
 */
export class OAuth2StateProcessor {
  private data: any;

  constructor(
    private readonly state: any,
    private readonly encryptionService: EncryptionDecryptionService
  ) {
    this.data = state;
  }

  stringify() {
    this.data = JSON.stringify(this.data);
    return Promise.resolve(this);
  }

  encrypt() {
    return this.encryptionService
      .encryptData(this.data)
      .then((encryptedData) => {
        this.data = encryptedData;
        return this;
      });
  }

  toBase64() {
    this.data = toBase64UrlSafe(this.data);
    return Promise.resolve(this);
  }

  getResult() {
    return this.data;
  }
}
