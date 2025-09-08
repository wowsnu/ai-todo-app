import React, { useEffect, useCallback } from 'react';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (element: HTMLElement, config: any) => void;
          prompt: () => void;
        };
      };
    };
  }
}

interface GoogleLoginProps {
  onSuccess: (credentialResponse: any) => void;
  onError: () => void;
}

const GoogleLogin: React.FC<GoogleLoginProps> = ({ onSuccess, onError }) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;

  const handleCredentialResponse = useCallback(async (response: any) => {
    setIsLoading(true);
    try {
      console.log("Google credential response:", response);
      
      // Send the Google token to our backend for verification
      const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';
      const backendResponse = await fetch(`${API_BASE}/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: response.credential
        }),
      });

      if (backendResponse.ok) {
        const data = await backendResponse.json();
        onSuccess(data);
      } else {
        console.error('Backend authentication failed');
        onError();
      }
    } catch (error) {
      console.error('Authentication error:', error);
      onError();
    } finally {
      setIsLoading(false);
    }
  }, [onSuccess, onError]);

  useEffect(() => {
    if (!clientId) {
      console.error('REACT_APP_GOOGLE_CLIENT_ID is not set');
      return;
    }
    const initializeGoogleLogin = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        // Render the Google Sign-In button
        const buttonElement = document.getElementById('google-signin-button');
        if (buttonElement) {
          window.google.accounts.id.renderButton(buttonElement, {
            theme: 'outline',
            size: 'large',
            width: '100%',
            text: 'signin_with',
            shape: 'rectangular',
          });
        }
      }
    };

    // Load Google Sign-In script
    if (!window.google) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.onload = initializeGoogleLogin;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    } else {
      initializeGoogleLogin();
    }
  }, [handleCredentialResponse, clientId]);

  return (
    <div className="google-login-container">
      <div className="google-login-box">
        <div className="login-header">
          <h2 className="login-title">투두비와 함께 시작하세요!</h2>
          <p className="login-subtitle">Google 계정으로 간편하게 로그인</p>
        </div>

        {!clientId ? (
          <div className="error-message">
            환경변수 REACT_APP_GOOGLE_CLIENT_ID가 설정되지 않았습니다. .env에 값을 설정하고 프론트를 재시작하세요.
          </div>
        ) : isLoading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <span className="loading-text">로그인 중...</span>
          </div>
        ) : (
          <div className="login-content">
            <div id="google-signin-button" className="google-button"></div>
            <p className="login-terms">
              로그인하면 서비스 약관과 개인정보 처리방침에 동의하는 것으로 간주됩니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GoogleLogin;
