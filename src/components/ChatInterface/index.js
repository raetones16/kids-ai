import React, { useState, useEffect, useRef } from "react";
import SvgWaveBackground from "../SvgWaveBackground";
import { Button } from "../ui/button";
import { Keyboard, X } from "lucide-react";
import Header from "./Header";
import MainCircle from "./MainCircle";
import TextInput from "./TextInput";
import ErrorDisplay from "./ErrorDisplay";
import SubtitleStyleDisplay from "../SubtitleStyleDisplay";
import SubtitleStyleSkeleton from "../SubtitleStyleSkeleton";
import { useChat } from "../../hooks/useChat";
import { useSpeechRecognition } from "../../hooks/useSpeechRecognition";
import "../ChildInterface.css"; // Retain original CSS for animations and layout

const ChatInterface = ({
  childId,
  childName,
  onLogout,
  assistantRef,
  useMockApi = false,
}) => {
  const [showTextInput, setShowTextInput] = useState(false);
  const [error, setError] = useState(null);
  const [audioData, setAudioData] = useState(null);
  const [audioStream, setAudioStream] = useState(null);
  const animationFrameRef = useRef(null);

  // Set up session storage as a backup for refresh
  useEffect(() => {
    // Store the current child info in sessionStorage for refresh resilience
    if (childId && childName) {
      localStorage.setItem(
        "kids-ai.session",
        JSON.stringify({ type: "child", id: childId, name: childName })
      );
      console.log("Saved child session to localStorage", { type: "child", id: childId, name: childName });
    }
    // Intentionally NOT removing on unmount to persist across refreshes
  }, [childId, childName]);

  // Initialize chat hook
  const {
    messages,
    interfaceState,
    setInterfaceState,
    processUserInput,
    getAudioData,
    conversationReady,
    tts,
    isInitialized,
  } = useChat(assistantRef, childId, childName);

  // Initialize speech recognition hook
  const {
    startListening,
    stopListening,
    error: speechError,
    isAvailable: speechAvailable,
  } = useSpeechRecognition(interfaceState, setInterfaceState, processUserInput);

  // Set error from speech recognition
  useEffect(() => {
    if (speechError) {
      setError(speechError);
      setShowTextInput(true);
    }
  }, [speechError]);

  // Set up automatic state recovery and timeout for stuck states
  useEffect(() => {
    let stateTimeoutId = null;
    
    const checkForStuckState = () => {
      if (interfaceState === "speaking") {
        // Check if TTS has actually started
        const currentTime = Date.now();
        const speakingStartTime = tts?.speakingStartTime || 0;
        const speakingDuration = currentTime - speakingStartTime;
        
        // If we've been "speaking" for more than 15 seconds with no sound, it might be stuck
        if (speakingDuration > 15000 && (!audioData || audioData.length === 0)) {
          console.log("Automatic detection of stuck speaking state");
          // Try to stop TTS and reset state
          if (tts) {
            try {
              tts.stop();
            } catch (e) {
              console.error("Error during automatic state recovery:", e);
            }
          }
          // Force browser TTS reset as well
          if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
          }
          setInterfaceState("idle");
        }
      }
    };
    
    // Check for stuck states every 5 seconds
    const intervalId = setInterval(checkForStuckState, 5000);
    
    // Also set a timeout for any active state that isn't idle
    // This ensures we never get permanently stuck in any state
    if (interfaceState !== "idle") {
      stateTimeoutId = setTimeout(() => {
        console.log(`State timeout: ${interfaceState} lasted too long, resetting to idle`);
        setInterfaceState("idle");
        if (tts) tts.stop();
        if (window.speechSynthesis) window.speechSynthesis.cancel();
      }, 60000); // 1 minute absolute maximum for any state
    }
    
    return () => {
      clearInterval(intervalId);
      if (stateTimeoutId) clearTimeout(stateTimeoutId);
    };
  }, [interfaceState, tts, audioData, setInterfaceState]);

  // Set up audio data updates
  useEffect(() => {
    console.log(`ChatInterface: State changed to ${interfaceState}`);

    // If we're in speaking state, start generating audio data
    if (interfaceState === "speaking") {
      console.log("Starting speaking animation updates");

      // Try to get the audio analyzer node from TTS service
      const getAudioAnalyzer = () => {
        if (tts && tts.ttsService && tts.ttsService.analyserNode) {
          return tts.ttsService.analyserNode;
        }
        return null;
      };

      // Create a fake audio data array if needed
      const generateFakeAudioData = () => {
        const data = new Uint8Array(64);
        const currentTime = Date.now() * 0.001; // Convert to seconds for smoother animation

        for (let i = 0; i < data.length; i++) {
          // Create wave pattern with multiple frequencies
          data[i] = Math.max(
            10,
            Math.min(
              255,
              100 + // base value
                Math.sin(currentTime * 1.5 + i * 0.1) * 40 + // slow wave
                Math.sin(currentTime * 3 + i * 0.3) * 30 + // medium wave
                Math.sin(currentTime * 5 + i * 0.5) * 15 + // fast wave
                Math.random() * 20 // random noise
            )
          );
        }
        return data;
      };

      // Update function using both real and fake data
      const updateAudioData = () => {
        // Try to get real audio data first
        const realData = getAudioData();

        if (realData && realData.length > 0) {
          setAudioData(realData);
        } else {
          // Fall back to generated data
          setAudioData(generateFakeAudioData());
        }

        // Try to get the audio stream for more accurate visualization
        const analyzer = getAudioAnalyzer();
        if (analyzer && analyzer !== audioStream) {
          setAudioStream(analyzer);
        }

        if (interfaceState === "speaking") {
          animationFrameRef.current = requestAnimationFrame(updateAudioData);
        }
      };

      // Start the animation
      animationFrameRef.current = requestAnimationFrame(updateAudioData);
    } else {
      // Clear audio stream when not speaking
      if (audioStream) {
        setAudioStream(null);
      }
    }

    return () => {
      // Clean up animation frame on state change or unmount
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [interfaceState, getAudioData, tts, audioStream]);

  // Handle microphone button click
  const handleMicrophoneClick = async () => {
    console.log("Microphone clicked, current state:", interfaceState);

    // First click should just show that we're ready to listen
    // We don't create a conversation yet - that happens when they actually ask a question
    if (!conversationReady) {
      console.log(
        "First click - preparing to listen without creating conversation"
      );
      try {
        // Reset any errors
        setError(null);

        // Start listening immediately (no need to initialize conversation first)
        // Make sure audio context is initialized
        if (tts && typeof tts.initAudioContext === "function") {
          tts.initAudioContext();
        }

        if (!speechAvailable) {
          setError("Speech recognition is not available on your device");
          setShowTextInput(true);
          return;
        }

        // Start listening right away
        const success = startListening();
        if (!success) {
          setShowTextInput(true);
        }
        return;
      } catch (error) {
        console.error("Error preparing to listen:", error);
        setError("Failed to activate microphone. Please try again.");
        setInterfaceState("idle");
      }
    }

    // Stop speaking if the circle is clicked while speaking OR tap to reset if stuck
    if (interfaceState === "speaking") {
      console.log("Stopping speech playback");
      // Track if circle has been in speaking state too long
      const currentTime = Date.now();
      const speakingStartTime = tts?.speakingStartTime || 0;
      const speakingDuration = currentTime - speakingStartTime;
      
      // Force reset if it's been in speaking state for more than 10 seconds without sound
      const isLikelyStuck = speakingDuration > 10000 && (!audioData || (audioData.length === 0));
      
      if (isLikelyStuck) {
        console.log("Detected stuck speaking state, performing force reset");
        // Force more aggressive reset
        if (tts) {
          try {
            tts.stop();
          } catch (e) {
            console.error("Error during force stop:", e);
          }
        }
        // Force browser TTS reset as well
        if (window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
        setInterfaceState("idle");
        return;
      }
      
      // Normal speech stopping behavior
      if (tts) {
        try {
          // Stop the speech
          tts.stop();

          // Reset interface state immediately
          setInterfaceState("idle");
          console.log("Speech stopped, interface reset to idle");
        } catch (error) {
          console.error("Error stopping speech:", error);
          setInterfaceState("idle");
        }
      } else {
        setInterfaceState("idle");
      }
      return;
    }

    // Normal microphone behavior after initialization
    if (interfaceState === "idle") {
      // Make sure audio context is initialized
      if (tts && typeof tts.initAudioContext === "function") {
        tts.initAudioContext();
      }

      if (!speechAvailable) {
        setError("Speech recognition is not available on your device");
        setShowTextInput(true);
        return;
      }

      // Clear any previous errors
      setError(null);

      // Start listening
      const success = startListening();
      if (!success) {
        setShowTextInput(true);
      }
    } else if (interfaceState === "listening") {
      stopListening();
    } else if (interfaceState === "thinking") {
      // If in thinking state, just log it but don't take any action
      console.log("Currently thinking, click ignored");
    }
  };

  // Handle text input submit
  const handleTextSubmit = async (text) => {
    // Make sure audio context is initialized
    if (tts && typeof tts.initAudioContext === "function") {
      tts.initAudioContext();
    }

    try {
      await processUserInput(text);
    } catch (err) {
      setError(err.message || "Failed to get a response. Please try again.");
    }
  };

  // Toggle text input visibility with improved mobile handling
  const toggleTextInput = () => {
    const newVisible = !showTextInput;
    setShowTextInput(newVisible);
    
    // On mobile, ensure we scroll to the input when it's shown
    // This helps avoid the zooming issue by ensuring the input is in view
    if (newVisible && window.innerWidth <= 640) {
      // Small delay to ensure the DOM has updated
      setTimeout(() => {
        // Scroll to the bottom of the page where the input is
        window.scrollTo({
          top: document.body.scrollHeight,
          behavior: 'smooth'
        });
      }, 100);
    }
  };

  // Define a consistent container for both subtitle and text input
  const containerClass = "w-full max-w-4xl px-8";

  // Determine if we should show the loading skeleton
  const isLoading = !isInitialized && !error;

  return (
    <div
      className={`min-h-screen flex flex-col text-foreground child-interface relative overflow-hidden`}
    >
      {/* Background Image with wave distortion effect */}
      <div className="fixed -top-[100px] sm:top-0 left-0 right-0 bottom-0 z-0 w-full h-[calc(100%+100px)] sm:h-full overflow-hidden">
        <SvgWaveBackground 
          imageUrl="/background-images/Chat.svg" 
          className="w-full h-full"
        />
      </div>

      {/* Semi-transparent overlay for better readability */}
      <div className="fixed inset-0 z-0 bg-background/40" aria-hidden="true" />

      {/* Header with higher z-index */}
      <div className="relative z-10">
        <Header childName={childName} onLogout={onLogout} />
      </div>

      <div
        className={`flex-grow flex flex-col items-center justify-start pt-4 sm:justify-center sm:pt-6 md:pt-0 relative z-10 overflow-hidden ${
          showTextInput ? "keyboard-active" : ""
        }`}
      >
        {error ? (
          <div className="w-full max-w-md px-4">
            <ErrorDisplay
              message={error}
              onRetry={() => window.location.reload()}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-start w-full h-full overflow-hidden">
            <div
              className="circle-container-wrapper mb-2 sm:mb-4 flex-shrink-0"
              style={{
                position: "relative",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                /* Disable container transitions to prevent unwanted resizing */
                transform: "translateZ(0)" /* Force GPU acceleration */,
                perspective: "1000px" /* Improve rendering performance */,
                backfaceVisibility:
                  "hidden" /* Reduce flashing during transitions */,
              }}
            >
              <MainCircle
                interfaceState={isLoading ? "thinking" : interfaceState}
                audioData={audioData}
                audioStream={audioStream}
                onClick={handleMicrophoneClick}
              />
            </div>

            <div
              className={`${containerClass} mt-2 sm:mt-4 backdrop-blur-sm py-2 sm:py-4 rounded-lg ${
                showTextInput ? "max-h-[35vh] sm:max-h-[60vh]" : "max-h-[60vh]"
              } overflow-y-auto mb-4 sm:mb-0`}
            >
              {isLoading ? (
                <SubtitleStyleSkeleton />
              ) : (
                <SubtitleStyleDisplay messages={messages} />
              )}
            </div>

            {/* Only show the text input when toggled - overlay it on mobile */}
            {showTextInput && !isLoading && (
              <div
                className={`${containerClass} fixed bottom-16 left-0 right-0 backdrop-blur-md bg-background/90 py-4 rounded-lg shadow-lg z-30 sm:shadow-none sm:static sm:mt-2 sm:backdrop-blur-sm sm:bg-transparent sm:z-10`}
              >
                <TextInput
                  onSubmit={handleTextSubmit}
                  interfaceState={interfaceState}
                  visible={true}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fixed Position Keyboard Toggle Button */}
      <div className="fixed left-4 bottom-4 z-50">
        <Button
          variant="secondary"
          onClick={toggleTextInput}
          aria-label={showTextInput ? "Hide keyboard" : "Show keyboard"}
          className="rounded-full w-12 h-12 bg-card border-border shadow-md flex items-center justify-center"
          disabled={isLoading}
        >
          {showTextInput ? (
            <X className="h-5 w-5" />
          ) : (
            <Keyboard className="h-5 w-5" />
          )}
        </Button>
      </div>

      {useMockApi && (
        <div className="fixed bottom-4 left-4 right-4 max-w-md mx-auto bg-orange-90 border border-orange-50 text-orange-30 px-4 py-2 rounded text-center text-sm z-50">
          Using Mock AI (Offline Mode)
        </div>
      )}
    </div>
  );
};

export default ChatInterface;
