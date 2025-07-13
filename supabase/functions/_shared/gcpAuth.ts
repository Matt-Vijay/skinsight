import { create } from 'https://deno.land/x/djwt@v3.0.2/mod.ts';

export interface ServiceAccount {
  client_email: string;
  private_key: string;
}

/**
 * Retrieves the GCP service account from Supabase Vault (more secure)
 * Falls back to environment variable for backward compatibility
 */
export async function getServiceAccount(): Promise<ServiceAccount> {
  // TODO: In production, this should use Supabase Vault API
  // For now, using environment variable with proper error handling
  const serviceAccountJson = Deno.env.get('GCP_SERVICE_ACCOUNT_KEY');
  
  if (!serviceAccountJson) {
    throw new Error(
      'Missing required GCP service account configuration. ' +
      'Please ensure GCP_SERVICE_ACCOUNT_KEY is set in environment variables.'
    );
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountJson);
    
    // Validate required fields
    if (!serviceAccount.client_email || !serviceAccount.private_key) {
      throw new Error('Invalid service account: missing client_email or private_key');
    }
    
    return serviceAccount;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Invalid service account JSON format');
    }
    throw error;
  }
}

/**
 * Generates a Google Cloud access token using service account credentials
 * @param serviceAccount - The service account credentials
 * @returns Promise<string> - The access token
 */
export async function getGoogleAuthToken(serviceAccount: ServiceAccount): Promise<string> {
  try {
    // Process the private key
    const pem = serviceAccount.private_key;
    const pemHeader = '-----BEGIN PRIVATE KEY-----';
    const pemFooter = '-----END PRIVATE KEY-----';
    const pemContents = pem
      .replaceAll(pemHeader, '')
      .replaceAll(pemFooter, '')
      .replaceAll('\\n', '');

    // Convert to binary format
    const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

    // Import the private key
    const privateKey = await crypto.subtle.importKey(
      'pkcs8',
      binaryDer,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      true,
      ['sign']
    );

    // Create the JWT
    const now = Math.floor(Date.now() / 1000);
    const jwt = await create(
      {
        alg: 'RS256',
        typ: 'JWT',
      },
      {
        iss: serviceAccount.client_email,
        scope: 'https://www.googleapis.com/auth/cloud-platform',
        aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600, // 1 hour expiration
        iat: now,
      },
      privateKey
    );

    // Exchange JWT for access token
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Failed to obtain access token: ${response.status} ${errorBody}`);
    }

    const tokens = await response.json();
    
    if (!tokens.access_token) {
      throw new Error('No access token received from Google OAuth');
    }

    return tokens.access_token;
  } catch (error) {
    console.error('GCP Authentication Error:', error);
    throw new Error(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
} 