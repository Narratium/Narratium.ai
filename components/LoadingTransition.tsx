/**
 * LoadingTransition Component
 * 
 * The animation in this component is inspired by the open-source project by JIEJOE'S WEB Tutorial:
 * https://github.com/JIEJOE-WEB-Tutorial/014-snake-loading
 * 
 * Original Author: JIEJOE'S WEB Tutorial  
 * License: MIT License
 * 
 * This implementation adapts and extends the original animation by adding sound effects,
 * auto-redirect functionality, GSAP timeline controls, and other enhancements.
 * It serves as a visual transition during page loading in the application.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { useSoundContext } from "@/contexts/SoundContext";

interface LoadingTransitionProps {
  onAnimationComplete?: () => void;
  redirectUrl?: string;
  autoRedirect?: boolean;
  duration?: number;
}

export default function LoadingTransition({
  onAnimationComplete,
  redirectUrl,
  autoRedirect = true,
}: LoadingTransitionProps) {
  const { soundEnabled } = useSoundContext();

  const [logoShown, setLogoShown] = useState(false);
  const logoTimerRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();
  const pathsRef = useRef<SVGPathElement[]>([]);
  const circleRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const movementSoundRef = useRef<HTMLAudioElement>(null);
  const completionSoundRef = useRef<HTMLAudioElement>(null);
  const [soundsLoaded, setSoundsLoaded] = useState(false);

  const progressBarRef = useRef<HTMLDivElement>(null);
  const progressBarFillRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (movementSoundRef.current && completionSoundRef.current) {
        Promise.all([
          new Promise(resolve => {
            if (movementSoundRef.current) {
              movementSoundRef.current.addEventListener("canplaythrough", resolve, { once: true });
            }
          }),
          new Promise(resolve => {
            if (completionSoundRef.current) {
              completionSoundRef.current.addEventListener("canplaythrough", resolve, { once: true });
            }
          }),
        ]).then(() => {
          setSoundsLoaded(true);
        });
      } else {
        setSoundsLoaded(true);
      }
    } else {
      setSoundsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!logoShown || !autoRedirect || !redirectUrl) return;

    logoTimerRef.current = setTimeout(() => {
      if (onAnimationComplete) {
        onAnimationComplete();
      }
      router.push(redirectUrl);
    }, 2000);
    
    return () => {
      if (logoTimerRef.current) {
        clearTimeout(logoTimerRef.current);
      }
    };
  }, [logoShown, autoRedirect, redirectUrl, onAnimationComplete, router]);

  useEffect(() => {
    if (!soundsLoaded) return;
    
    pathsRef.current = Array.from(document.querySelectorAll(".loading_icon path"));

    startAnimation();

    if (autoRedirect && redirectUrl) {
    }
  }, [soundsLoaded, autoRedirect, redirectUrl]);

  const startAnimation = () => {
    if (soundEnabled && soundsLoaded && movementSoundRef.current) {
      movementSoundRef.current.muted = true;
      movementSoundRef.current.currentTime = 0;
      const playPromise = movementSoundRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise.then(() => {
          if (movementSoundRef.current) {
            movementSoundRef.current.muted = false;
            movementSoundRef.current.volume = 0.8;
          }
        }).catch(e => {
          console.log("Movement sound failed:", e);
        });
      }
    }
    
    gsap.to(pathsRef.current, {
      stroke: "#fba53d",
      strokeWidth: (i: number) => i === 0 ? 2 : 4,
      duration: 0.3,
      ease: "power1.in",
    });

    const timeline = gsap.timeline()
      .fromTo(
        pathsRef.current,
        {
          strokeDashoffset: (i: number) => {
            if (i === 0) return 0;
            else return 480;
          },
        },
        {
          strokeDashoffset: (i: number) => {
            if (i === 0) return -275;
            else return 205;
          },
          duration: 0.8,
          ease: "power2.inOut",
          onComplete: () => {
            finishAnimation();
          },
        },
      );

    gsap.to(progressBarFillRef.current, {
      width: "100%",
      duration: timeline.duration(),
      ease: "power2.inOut",
    });

    gsap.to(progressBarFillRef.current, {
      background: "linear-gradient(90deg, rgba(255,215,0,0.4) 0%, rgba(255,215,0,0.8) 50%, rgba(255,215,0,0.4) 100%)",
      boxShadow: "0 0 8px rgba(255,215,0,0.6)",
      duration: timeline.duration(),
      ease: "power2.inOut",
    });

    gsap.to(textRef.current, {
      opacity: 1,
      duration: 0.5,
      delay: 0.3,
      ease: "power1.out",
    });
  };

  const finishAnimation = () => {
    if (soundEnabled && movementSoundRef.current) {
      const fadeOutMovement = gsap.to(movementSoundRef.current, {
        volume: 0,
        duration: 0.5,
        onComplete: () => {
          movementSoundRef.current?.pause();
          if (movementSoundRef.current) movementSoundRef.current.volume = 1;
        },
      });
    }
    
    const timeline = gsap.timeline()
      .to(pathsRef.current[1], {
        strokeWidth: 0,
        duration: 0.3,
        ease: "power3.out",
      })
      .to(pathsRef.current[0], {
        strokeDasharray: "150 0 0 0 0 0 0 0 0 500",
        strokeDashoffset: -300,
        duration: 0.7,
        ease: "power3.out",
      }, "<")
      .to(circleRef.current, {
        opacity: 0.9,
        duration: 0.6,
        ease: "power3.out",
        onStart: () => {
          if (soundEnabled && completionSoundRef.current) {
            completionSoundRef.current.muted = true;
            completionSoundRef.current.currentTime = 0;
            const playPromise = completionSoundRef.current.play();
            
            if (playPromise !== undefined) {
              playPromise.then(() => {
                if (completionSoundRef.current) {
                  completionSoundRef.current.muted = false;
                  completionSoundRef.current.volume = 0.2;
                }
              }).catch(e => {
                console.log("Completion sound failed:", e);
              });
            }
          }
        },
        onComplete: () => {
          gsap.to(circleRef.current, {
            scale: 1.03,
            duration: 1.2,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
          });
          
          if (logoRef.current) {
            gsap.to(logoRef.current, {
              opacity: 1,
              duration: 0.8,
              delay: 0,
              ease: "power2.out",
              onComplete: () => {
                gsap.to(logoRef.current, {
                  scale: 1.05,
                  duration: 1.5,
                  repeat: -1,
                  yoyo: true,
                  ease: "sine.inOut",
                });

                setLogoShown(true);
              },
            });
          }
          
          if (!autoRedirect && onAnimationComplete) {
            onAnimationComplete();
          }
        },
      }, "<0.3");
  };

  const fadeOut = () => {
    if (containerRef.current) {
      gsap.to(containerRef.current, {
        opacity: 0,
        duration: 0.5,
        ease: "power2.inOut",
      });
    }
  };

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "#242020FF", overflow: "hidden" }}
    >
      <div
        className="absolute inset-0 z-0 opacity-35"
        style={{
          backgroundImage: "url('/loading_yellow.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
      <div
        className="absolute inset-0 z-1 opacity-45"
        style={{
          backgroundImage: "url('/loading_red.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          mixBlendMode: "multiply",
        }}
      />
      <audio  
        ref={movementSoundRef} 
        src="/sounds/movement.mp3" 
        preload="auto"
        playsInline
      />
      <audio 
        ref={completionSoundRef} 
        src="/sounds/completion.mp3" 
        preload="auto"
        playsInline
      />
      <div className="loading" style={{ 
        position: "relative", 
        width: "min(35rem, 90vw)", 
        height: "min(35rem, 90vw)", 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        transform: "translateY(-5%)", 
      }}>
        <svg viewBox="0 0 100 50" className="loading_icon" style={{ 
          position: "absolute", 
          width: "60%",
          maxWidth: "300px",
        }}>
          <path 
            d="M50,25c0-12.14,9.84-21.99,21.99-21.99S93.98,12.86,93.98,25s-9.84,21.99-21.99,21.99S50,37.21,50,25.06
            S40.16,3.01,28.01,3.01S6.02,12.86,6.02,25s9.84,21.99,21.99,21.99S50,37.14,50,25c0-8.14,4.42-15.24,10.99-19.05
            C67.57,9.76,71.99,16.86,71.99,25c0,8.14-4.42,15.24-10.99,19.04c0,0,0,0,0,0c-3.23,1.87-6.99,2.94-10.99,2.94
            c-4.01,0-7.76-1.07-10.99-2.94h0C32.43,40.24,28.01,33.14,28.01,25c0-8.14,4.42-15.24,10.99-19.05l0,0
            C42.24,4.08,45.99,3.01,50,3.01s7.76,1.07,10.99,2.94l0,0"
            style={{ 
              fill: "none",
              strokeLinecap: "round",
              strokeWidth: 0,
              strokeDasharray: "0 5 0 5 0 5 0 5 0 500",
            }}
          />
          <path 
            d="M50,25c0-12.14,9.84-21.99,21.99-21.99S93.98,12.86,93.98,25s-9.84,21.99-21.99,21.99S50,37.21,50,25.06
            S40.16,3.01,28.01,3.01S6.02,12.86,6.02,25s9.84,21.99,21.99,21.99S50,37.14,50,25c0-8.14,4.42-15.24,10.99-19.05
            C67.57,9.76,71.99,16.86,71.99,25c0,8.14-4.42,15.24-10.99,19.04c0,0,0,0,0,0c-3.23,1.87-6.99,2.94-10.99,2.94
            c-4.01,0-7.76-1.07-10.99-2.94h0C32.43,40.24,28.01,33.14,28.01,25c0-8.14,4.42-15.24,10.99-19.05l0,0
            C42.24,4.08,45.99,3.01,50,3.01s7.76,1.07,10.99,2.94l0,0"
            style={{ 
              fill: "none",
              strokeLinecap: "round",
              strokeWidth: 0,
              strokeDasharray: "0 500 0 500",
              strokeDashoffset: 480,
            }}
          />
        </svg>
        <div 
          ref={circleRef}
          className="loading_circle"
          style={{
            position: "absolute",
            width: "min(10rem, 25vw)",
            height: "min(10rem, 25vw)",
            borderRadius: "100%",
            background: "rgba(251, 165, 61, 0.1)",
            border: "2px solid #fba53d",
            boxShadow: "0 0 15px rgba(251, 146, 60, 0.5)",
            opacity: 0,
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
          }}
        ></div>
        <img 
          ref={logoRef}
          src="/logo-narratium.png" 
          className="logo" 
          alt="Narratium Logo"
          style={{
            position: "absolute",
            width: "min(10rem, 25vw)",
            opacity: 0,
            zIndex: 10,
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
          }}
        />
        <div
          ref={progressBarRef}
          style={{
            position: "absolute",
            bottom: "25%",
            width: "70%",
            height: "min(8px, 2vw)",
            background: "rgba(251, 165, 61, 0.2)",
            borderRadius: "4px",
            overflow: "hidden",
            transform: "translate(-50%, -50%)",
            left: "50%",
            zIndex: 11,
          }}
        >
          <div
            ref={progressBarFillRef}
            style={{
              width: "0%",
              height: "100%",
              background: "linear-gradient(90deg, rgba(251,146,60,0.4) 0%, rgba(251,146,60,0.8) 50%, rgba(251,146,60,0.4) 100%)",
              boxShadow: "0 0 8px rgba(251,146,60,0.6)",
              borderRadius: "4px",
            }}
          ></div>
        </div>
        <p
          ref={textRef}
          style={{
            position: "absolute",
            bottom: "5%",
            color: "#ffd76a",
            fontSize: "clamp(0.8rem, 3vw, 1.2rem)",
            fontFamily: "var(--font-cinzel)",
            textAlign: "center",
            opacity: 0,
            zIndex: 11,
            left: "50%",
            transform: "translate(-50%, -50%)",
            whiteSpace: "nowrap",
            textShadow: "0 0 5px rgba(255,215,0,0.7)",
            padding: "0 1rem",
            maxWidth: "90vw",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          To build a time machine takes only two steps: dream it, then do it.
        </p>
      </div>
    </div>
  );
}
