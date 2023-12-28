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

/**
 * Creates an OAuth2 authorization URL by merging the given parameters with the default parameters.
 * @param config: IOAuth2Config
 * @param params: OAuth2UrlParams
 * @returns {string} - The OAuth2 authorization URL.
 */
export function createOAuth2AuthUrl(
  config: IOAuth2Config,
  params: OAuth2UrlParams
): string {
  // Ensure the base URL is present
  if (!config || !config.provider.authorizeUrl) {
    throw new Error(
      "Invalid OAuth2 configuration - 'authorizeUrl' is required"
    );
  }

  const url = new URL(config.provider.authorizeUrl);

  // Merge custom parameters with default parameters
  const searchParams = new URLSearchParams({
    client_id: config.credentials.id,
    redirect_uri: config.provider.callbackUri,
    scope: config.scope.join(" "),
    ...config.provider.callbackUriParams,
    ...params,
  });

  url.search = searchParams.toString();
  return url.toString();
}

/**
 * Creates an OAuth2 token verification URL by merging the given parameters with the default parameters.
 * @param config
 * @param params
 * @returns
 */
export function createOAuth2VerifyUrl(
  config: IOAuth2Config,
  params: OAuth2UrlParams
): string {
  Logger.debug(config, "createOAuth2VerifyUrl");
  Logger.debug(params, "createOAuth2VerifyUrl");
  // Ensure the base URL is present
  if (!config || !config.provider.verifyTokenUrl || !params.access_token) {
    throw new Error(
      "Invalid OAuth2 configuration - 'verifyTokenUrl' and 'access_token' are required"
    );
  }

  const url = new URL(config.provider.verifyTokenUrl);

  const searchParams = new URLSearchParams({
    access_token: params.access_token,
  });

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
    redirect_uri: config.provider.callbackUri,
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
 * @returns {Promise<any>}
 */
export async function verifyToken(
  httpService: HttpService,
  config: IOAuth2Config,
  accessToken: string
): Promise<any> {
  const verifyUrl = createOAuth2VerifyUrl(config, {
    access_token: accessToken,
  });

  try {
    await lastValueFrom(
      httpService.get(verifyUrl).pipe(map((resp) => resp.data))
    );
    return true;
  } catch (error) {
    Logger.error(error, "verifyToken");
    return false;
  }
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
