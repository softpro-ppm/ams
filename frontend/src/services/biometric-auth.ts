// Biometric Authentication Service using WebAuthn API

export interface BiometricCredential {
  id: string;
  publicKey: string;
  counter: number;
}

class BiometricAuthService {
  async isSupported(): Promise<boolean> {
    return (
      typeof window !== "undefined" &&
      "PublicKeyCredential" in window &&
      typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function"
    );
  }

  async isAvailable(): Promise<boolean> {
    if (!(await this.isSupported())) {
      return false;
    }

    try {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
      return false;
    }
  }

  async register(userId: string, userName: string): Promise<BiometricCredential | null> {
    if (!(await this.isAvailable())) {
      throw new Error("Biometric authentication is not available on this device");
    }

    try {
      // Generate a challenge (in production, this should come from the server)
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: {
          name: "SOFTPRO Finance",
          id: window.location.hostname,
        },
        user: {
          id: new TextEncoder().encode(userId),
          name: userName,
          displayName: userName,
        },
        pubKeyCredParams: [{ alg: -7, type: "public-key" }],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
        },
        timeout: 60000,
        attestation: "direct",
      };

      const credential = (await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions,
      })) as PublicKeyCredential | null;

      if (!credential) {
        return null;
      }

      // In production, send credential to server for verification
      const response = credential.response as AuthenticatorAttestationResponse;
      const publicKey = Array.from(new Uint8Array(response.getPublicKey() || []))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      return {
        id: credential.id,
        publicKey,
        counter: 0,
      };
    } catch (error) {
      console.error("Error registering biometric credential:", error);
      return null;
    }
  }

  async authenticate(credentialId: string): Promise<boolean> {
    if (!(await this.isAvailable())) {
      return false;
    }

    try {
      // Generate a challenge (in production, this should come from the server)
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge,
        allowCredentials: [
          {
            id: Uint8Array.from(atob(credentialId), (c) => c.charCodeAt(0)),
            type: "public-key",
          },
        ],
        timeout: 60000,
        userVerification: "required",
      };

      const assertion = (await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions,
      })) as PublicKeyCredential | null;

      return assertion !== null;
    } catch (error) {
      console.error("Error authenticating with biometric:", error);
      return false;
    }
  }

  async isRegistered(): Promise<boolean> {
    const stored = localStorage.getItem("biometric_credential_id");
    return stored !== null;
  }

  getStoredCredentialId(): string | null {
    return localStorage.getItem("biometric_credential_id");
  }

  storeCredentialId(id: string): void {
    localStorage.setItem("biometric_credential_id", id);
  }

  clearCredentialId(): void {
    localStorage.removeItem("biometric_credential_id");
  }
}

export const biometricAuthService = new BiometricAuthService();

