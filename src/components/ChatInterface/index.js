import React, { useState, useEffect, useRef } from "react";
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

  // Initialize chat hook
  const {
    messages,
    interfaceState,
    setInterfaceState,
    processUserInput,
    initializeWelcomeMessage,
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
      console.log("First click - preparing to listen without creating conversation");
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

    // Stop speaking if the circle is clicked while speaking
    if (interfaceState === "speaking") {
      console.log("Stopping speech playback");
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

  // Toggle text input visibility
  const toggleTextInput = () => {
    setShowTextInput(!showTextInput);
  };

  // Define a consistent container for both subtitle and text input
  const containerClass = "w-full max-w-4xl px-8";

  // Determine if we should show the loading skeleton
  const isLoading = !isInitialized && !error;

  return (
    <div
      className={`min-h-screen flex flex-col text-foreground child-interface relative ${
        showTextInput ? "chat-bottom-space" : ""
      }`}
    >
      {/* Background Image - using JPG as requested */}
      <div
        className="fixed inset-0 z-0 w-full h-full bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url("/background-images/Chat.jpg")',
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
        aria-hidden="true"
      />

      {/* Semi-transparent overlay for better readability */}
      <div className="fixed inset-0 z-0 bg-background/40" aria-hidden="true" />

      {/* Header with higher z-index */}
      <div className="relative z-10">
        <Header childName={childName} onLogout={onLogout} />
      </div>

      <div className="flex-grow flex flex-col items-center justify-center pb-[4rem] relative z-10">
        {error ? (
          <div className="w-full max-w-md px-4">
            <ErrorDisplay
              message={error}
              onRetry={() => window.location.reload()}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center w-full">
            <div className="circle-container-wrapper mb-4">
              <MainCircle
                interfaceState={isLoading ? "thinking" : interfaceState}
                audioData={audioData}
                audioStream={audioStream}
                onClick={handleMicrophoneClick}
              />
            </div>

            <div
              className={`${containerClass} mt-8 backdrop-blur-sm py-4 rounded-lg`}
            >
              {isLoading ? (
                <SubtitleStyleSkeleton />
              ) : (
                <SubtitleStyleDisplay messages={messages} />
              )}
            </div>

            {/* Only show the text input when toggled - use same container class */}
            {showTextInput && !isLoading && (
              <div
                className={`${containerClass} mt-4 backdrop-blur-sm py-4 rounded-lg`}
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
      <div className="fixed left-6 bottom-6 z-50">
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