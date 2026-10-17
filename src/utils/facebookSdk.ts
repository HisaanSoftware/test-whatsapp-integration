type FacebookLoginResponse = {
  status?: string;
  authResponse?: { code?: string };
};

type FacebookSdk = {
  init: (params: { appId: string; autoLogAppEvents: boolean; xfbml: boolean; version: string }) => void;
  login: (callback: (response: FacebookLoginResponse) => void, options: Record<string, unknown>) => void;
};

declare global {
  interface Window {
    FB?: FacebookSdk;
    fbAsyncInit?: () => void;
  }
}

let loading: Promise<void> | null = null;

export function loadFacebookSdk(appId: string, version: string) {
  if (window.FB) return Promise.resolve();
  if (loading) return loading;

  loading = new Promise<void>((resolve, reject) => {
    window.fbAsyncInit = () => {
      window.FB?.init({
        appId,
        autoLogAppEvents: true,
        xfbml: false,
        version,
      });
      resolve();
    };

    const existing = document.getElementById('facebook-jssdk');
    if (existing) return;

    const script = document.createElement('script');
    script.id = 'facebook-jssdk';
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    script.onerror = () => {
      loading = null;
      reject(new Error('The Facebook SDK failed to load. Check that this page can reach connect.facebook.net.'));
    };
    document.body.appendChild(script);
  });

  return loading;
}

export function launchBusinessSignup(configId: string, onCode: (code: string | null) => void) {
  if (!window.FB) {
    onCode(null);
    return;
  }

  window.FB.login(
    (response) => {
      onCode(response.authResponse?.code || null);
    },
    {
      config_id: configId,
      response_type: 'code',
      override_default_response_type: true,
      extras: {
        setup: {},
        featureType: 'whatsapp_business_app_onboarding',
        sessionInfoVersion: '3',
      },
    }
  );
}
