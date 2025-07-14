"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/app/i18n";
import AuthAPI from "@/lib/api/auth";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { t, fontClass, titleFontClass, serifFontClass } = useLanguage();
  const [mode, setMode] = useState<"login" | "register" | "guest">("login"); // login, register or guest mode
  const [registerStep, setRegisterStep] = useState<1 | 2>(1); // registration step: 1 = email/password/code, 2 = username
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [guestName, setGuestName] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false); // Track if email verification passed
  const [tempToken, setTempToken] = useState(""); // Store temporary token for registration

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  const resetForm = () => {
    setUsername("");
    setEmail("");
    setPassword("");
    setVerificationCode("");
    setGuestName("");
    setError("");
    setCodeSent(false);
    setEmailVerified(false);
    setRegisterStep(1);
    setTempToken("");
  };

  const handleModeSwitch = (newMode: "login" | "register" | "guest") => {
    setMode(newMode);
    resetForm();
  };

  const renderInput = (
    type: "text" | "email" | "password",
    value: string,
    onChange: (value: string) => void,
    placeholder: string,
    icon?: string,
  ) => {
    return (
      <div className="relative w-full group">
        <div className="relative magical-input min-h-[60px] flex items-center justify-center">
          <input
            type={type}
            className={`bg-transparent border-0 outline-none w-full text-center text-base text-[#eae6db] placeholder-[#a18d6f] shadow-none focus:ring-0 focus:border-0 ${serifFontClass}`}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={isLoading}
            autoComplete="off"
            style={{
              caretColor: "#f9c86d",
              caretShape: "bar",
              background: "transparent",
              boxShadow: "none",
              border: "none",
              borderWidth: "0",
              borderColor: "transparent",
              letterSpacing: "0.05em",
            }}
          />
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-32 h-0.5 opacity-100 transition-opacity duration-300">
            <div className="w-full h-full bg-gradient-to-r from-transparent via-[#c0a480] to-transparent"></div>
          </div>
        </div>
      </div>
    );
  };

  const handleSendVerificationCode = async () => {
    if (!email.trim()) {
      setError(t("auth.emailRequired"));
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await AuthAPI.sendVerificationCode(email);
      
      if (response.success) {
        setCodeSent(true);
        setError("");
      } else {
        setError(response.message || t("auth.sendCodeFailed"));
      }
    } catch (err) {
      console.error("Send verification code error:", err);
      setError(t("auth.sendCodeFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailVerification = async () => {
    if (!email.trim()) {
      setError(t("auth.emailRequired"));
      return;
    }
    if (!password.trim()) {
      setError(t("auth.passwordRequired"));
      return;
    }
    if (!verificationCode.trim()) {
      setError(t("auth.codeRequired"));
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await AuthAPI.verifyEmail(email, verificationCode, password);
      
      if (response.success && response.tempToken) {
        setEmailVerified(true);
        setTempToken(response.tempToken);
        setRegisterStep(2);
      } else {
        setError(response.message || t("auth.verificationFailed"));
      }
    } catch (err) {
      console.error("Email verification error:", err);
      setError(t("auth.verificationFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "guest") {
      // Guest login mode - only requires a name
      if (!guestName.trim()) {
        setError(t("auth.nameRequired"));
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        // Store guest data in localStorage
        localStorage.setItem("username", guestName.trim());
        localStorage.setItem("userId", `guest_${Date.now()}`);
        localStorage.setItem("email", "");
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("loginMode", "guest");

        onClose();
        resetForm();
        window.location.reload();
      } catch (err) {
        console.error("Guest login error:", err);
        setError(t("auth.loginFailed"));
      } finally {
        setIsLoading(false);
      }
    } else if (mode === "login") {
      // Login mode - only email and password
      if (!email.trim()) {
        setError(t("auth.emailRequired"));
        return;
      }
      if (!password.trim()) {
        setError(t("auth.passwordRequired"));
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        // Call login API with email and password
        const response = await AuthAPI.login(email, password);
        if (response.success && response.token && response.user) {
          // Store authentication data
          localStorage.setItem("authToken", response.token);
          localStorage.setItem("username", response.user.username);
          localStorage.setItem("userId", response.user.id);
          localStorage.setItem("email", response.user.email);
          localStorage.setItem("isLoggedIn", "true");

          onClose();
          resetForm();
          window.location.reload();
        } else {
          setError(response.message || t("auth.loginFailed"));
        }
      } catch (err) {
        console.error("Login error:", err);
        setError(t("auth.loginFailed"));
      } finally {
        setIsLoading(false);
      }
    } else {
      // Register mode
      if (registerStep === 1) {
        // First step: email verification
        await handleEmailVerification();
      } else {
        // Second step: username input and final registration
        if (!username.trim()) {
          setError(t("auth.usernameRequired"));
          return;
        }

        setIsLoading(true);
        setError("");

        try {
          const response = await AuthAPI.register(username, tempToken);
          
          if (response.success && response.token && response.user) {
            // Store authentication data
            localStorage.setItem("authToken", response.token);
            localStorage.setItem("username", response.user.username);
            localStorage.setItem("userId", response.user.id);
            localStorage.setItem("email", response.user.email);
            localStorage.setItem("isLoggedIn", "true");

            onClose();
            resetForm();
            window.location.reload();
          } else {
            setError(response.message || t("auth.registerFailed"));
          }
        } catch (err) {
          console.error("Registration error:", err);
          setError(t("auth.registerFailed"));
        } finally {
          setIsLoading(false);
        }
      }
    }
  };

  const handleBackToStep1 = () => {
    setRegisterStep(1);
    setError("");
  };

  const getTitle = () => {
    if (mode === "guest") {
      return t("auth.guestLogin");
    } else if (mode === "login") {
      return t("auth.welcomeBack");
    } else {
      if (registerStep === 1) {
        return t("auth.verifyEmail");
      } else {
        return t("auth.chooseName");
      }
    }
  };

  const getSubmitButtonText = () => {
    if (mode === "guest") {
      return isLoading ? t("auth.entering") : t("auth.enterAsGuest");
    } else if (mode === "login") {
      return isLoading ? t("auth.loggingIn") : t("auth.login");
    } else {
      if (registerStep === 1) {
        return isLoading ? t("auth.verifying") : t("auth.verifyAndContinue");
      } else {
        return isLoading ? t("auth.registering") : t("auth.completeRegistration");
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="fantasy-bg bg-opacity-75 border border-[#534741] rounded-lg shadow-lg p-4 sm:p-8 w-full max-w-sm sm:max-w-md relative z-10 backdrop-filter backdrop-blur-sm mx-4"
          >
            <button 
              onClick={onClose}
              className="absolute top-2 right-2 sm:top-4 sm:right-4 text-[#a18d6f] hover:text-[#f9c86d] transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" className="sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            
            <div className="text-center mb-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#f9c86d] mb-2 font-cinzel">
                {getTitle()}
              </h1>
              {/* Back button for register step 2 */}
              {mode === "register" && registerStep === 2 && (
                <button
                  onClick={handleBackToStep1}
                  className={`group inline-flex items-center gap-1.5 px-3 py-1 bg-transparent border border-[#a18d6f]/50 text-[#a18d6f] rounded-full text-xs font-medium transition-all duration-300 hover:border-[#c0a480] hover:text-[#c0a480] hover:shadow-sm hover:shadow-[#a18d6f]/10 ${serifFontClass}`}
                >
                  <svg className="w-3 h-3 transition-transform duration-300 group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  <span className="tracking-wide">{t("auth.backToVerification")}</span>
                </button>
              )}
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-400 text-xs sm:text-sm text-center mb-4 p-2 bg-red-900/20 rounded border border-red-500/20"
              >
                {error}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="w-full space-y-4">
              {mode === "guest" && (
                <>
                  {/* Guest: Name Input */}
                  <div>
                    {renderInput(
                      "text",
                      guestName,
                      setGuestName,
                      t("auth.guestNamePlaceholder"),
                    )}
                  </div>
                </>
              )}

              {mode === "login" && (
                <>
                  {/* Login: Email Input */}
                  <div>
                    {renderInput(
                      "email",
                      email,
                      setEmail,
                      t("auth.emailPlaceholder"),
                    )}
                  </div>

                  {/* Login: Password Input */}
                  <div>
                    {renderInput(
                      "password",
                      password,
                      setPassword,
                      t("auth.spellPlaceholder"),
                    )}
                  </div>
                </>
              )}

              {mode === "register" && registerStep === 1 && (
                <>
                  {/* Register Step 1: Email Input */}
                  <div>
                    {renderInput(
                      "email",
                      email,
                      setEmail,
                      t("auth.emailPlaceholder"),
                    )}
                  </div>

                  {/* Register Step 1: Password Input */}
                  <div>
                    {renderInput(
                      "password",
                      password,
                      setPassword,
                      t("auth.createSpellPlaceholder"),
                    )}
                  </div>

                  {/* Register Step 1: Verification Code Input */}
                  <div className="relative">
                    <div className="relative w-full group">
                      <div className="relative magical-input min-h-[60px] flex items-center justify-center">
                        <input
                          type="text"
                          className={`bg-transparent border-0 outline-none w-full text-center text-base text-[#eae6db] placeholder-[#a18d6f] shadow-none focus:ring-0 focus:border-0 pr-20 ${serifFontClass}`}
                          placeholder={t("auth.codePlaceholder")}
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value)}
                          disabled={isLoading}
                          autoComplete="off"
                          style={{
                            caretColor: "#f9c86d",
                            caretShape: "bar",
                            background: "transparent",
                            boxShadow: "none",
                            border: "none",
                            borderWidth: "0",
                            borderColor: "transparent",
                            letterSpacing: "0.05em",
                          }}
                        />
                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-32 h-0.5 opacity-100 transition-opacity duration-300">
                          <div className="w-full h-full bg-gradient-to-r from-transparent via-[#c0a480] to-transparent"></div>
                        </div>
                      </div>

                      {/* Send Code Button - positioned on the right */}
                      <button
                        type="button"
                        onClick={handleSendVerificationCode}
                        disabled={isLoading || !email.trim() || codeSent}
                        className={`group absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-transparent border border-[#a18d6f]/60 text-[#a18d6f] rounded-full text-xs font-medium transition-all duration-300 hover:border-[#c0a480] hover:text-[#c0a480] hover:shadow-md hover:shadow-[#a18d6f]/20 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden ${serifFontClass}`}
                      >
                        {/* Elegant background pulse */}
                        <div className="absolute inset-0 bg-gradient-to-r from-[#a18d6f]/0 via-[#a18d6f]/8 to-[#a18d6f]/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-600"></div>
                        
                        {/* Subtle inner glow */}
                        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-[#c0a480]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        
                        {/* Button content */}
                        <div className="relative z-10 flex items-center justify-center gap-1">
                          {codeSent ? (
                            <>
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              <span className="tracking-wide text-[10px] hidden sm:inline">{t("auth.codeSent")}</span>
                              <span className="tracking-wide text-[10px] sm:hidden">{t("auth.codeSentShort")}</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-3 h-3 transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                              </svg>
                              <span className="tracking-wide text-[10px] hidden sm:inline">{t("auth.sendCode")}</span>
                              <span className="tracking-wide text-[10px] sm:hidden">{t("auth.sendCodeShort")}</span>
                            </>
                          )}
                        </div>
                        
                        {/* Subtle border animation */}
                        <div className="absolute inset-0 rounded-full border border-[#c0a480]/30 scale-105 opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                      </button>
                    </div>
                  </div>
                </>
              )}

              {mode === "register" && registerStep === 2 && (
                <>
                  {/* Register Step 2: Username Input */}
                  <div>
                    {renderInput(
                      "text",
                      username,
                      setUsername,
                      t("auth.namePlaceholder"),
                    )}
                  </div>
                </>
              )}

              {/* Submit Button */}
              <div className="text-center mt-8">
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`group relative px-6 py-2.5 bg-transparent border border-[#c0a480] text-[#c0a480] rounded-full text-sm font-medium transition-all duration-500 hover:border-[#f9c86d] hover:text-[#f9c86d] hover:shadow-lg hover:shadow-[#c0a480]/20 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden ${serifFontClass}`}
                  >
                    {/* Animated background */}
                    <div className="absolute inset-0 bg-gradient-to-r from-[#c0a480]/0 via-[#c0a480]/10 to-[#c0a480]/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                  
                    {/* Subtle inner glow */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-[#f9c86d]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  
                    {/* Button content */}
                    <div className="relative z-10 flex items-center justify-center gap-2">
                      {isLoading ? (
                        <>
                          <div className="animate-spin w-3.5 h-3.5 border border-[#c0a480] border-t-transparent rounded-full"></div>
                          <span className="tracking-wide">{getSubmitButtonText()}</span>
                        </>
                      ) : (
                        <>
                          <span className="tracking-wide">{getSubmitButtonText()}</span>
                          {/* Elegant arrow icon */}
                          <svg 
                            className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </>
                      )}
                    </div>
                  
                    {/* Subtle border animation */}
                    <div className="absolute inset-0 rounded-full border border-[#f9c86d]/20 scale-105 opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                  </button>

                  {/* Guest Login Button - only show in login mode */}
                  {mode === "login" && (
                    <button
                      type="button"
                      onClick={() => handleModeSwitch("guest")}
                      disabled={isLoading}
                      className={`group relative p-2 bg-transparent border border-[#8a7660] text-[#8a7660] rounded-full text-xs transition-all duration-300 hover:border-[#c0a480] hover:text-[#c0a480] disabled:opacity-50 disabled:cursor-not-allowed ${fontClass}`}
                      title={t("auth.guestLogin")}
                    >
                      <svg 
                        className="w-3 h-3" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Mode Switch - only show on login or register step 1 */}
              {(mode === "login" || registerStep === 1) && (
                <div className={`text-center mt-6 text-xs text-[#a18d6f] ${fontClass}`}>
                  <span>
                    {mode === "login" ? t("auth.noAccount") : t("auth.hasAccount")}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleModeSwitch(mode === "login" ? "register" : "login")}
                    className="ml-2 text-[#c0a480] hover:text-[#f9c86d] transition-colors underline"
                  >
                    {mode === "login" ? t("auth.registerNow") : t("auth.loginNow")}
                  </button>
                </div>
              )}

              {/* Guest Login Info - only show on login mode */}
              {mode === "login" && (
                <div className={`text-center mt-3 text-xs text-[#a18d6f] ${fontClass}`}>
                  <span>
                    {t("auth.localDeployment")}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleModeSwitch("guest")}
                    className="ml-2 text-[#c0a480] hover:text-[#f9c86d] transition-colors underline"
                  >
                    {t("auth.guestLogin")}
                  </button>
                </div>
              )}

              {/* Guest Mode Back Button */}
              {mode === "guest" && (
                <div className={`text-center mt-6 text-xs text-[#a18d6f] ${fontClass}`}>
                  <button
                    type="button"
                    onClick={() => handleModeSwitch("login")}
                    className="text-[#c0a480] hover:text-[#f9c86d] transition-colors underline"
                  >
                    {t("auth.backToLogin")}
                  </button>
                </div>
              )}

              {/* Terms and Privacy - only show on login or register step 1 */}
              {(mode === "login" || registerStep === 1) && (
                <div className={`text-center mt-4 text-xs text-[#a18d6f] ${fontClass}`}>
                  <p className="text-xs">{t("auth.agreementText")}</p>
                  <div className="flex justify-center space-x-2 mt-1">
                    <a href="#" className="text-[#c0a480] hover:text-[#f9c86d] transition-colors text-xs">{t("auth.termsOfService")}</a>
                    <span>•</span>
                    <a href="#" className="text-[#c0a480] hover:text-[#f9c86d] transition-colors text-xs">{t("auth.privacyPolicy")}</a>
                  </div>
                </div>
              )}
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
