"use client";
import type { StartAvatarResponse } from "@heygen/streaming-avatar";
import "@/styles/globals.css";

import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents,
  TaskMode,
  TaskType,
  VoiceEmotion,
} from "@heygen/streaming-avatar";
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  Divider,
  Input,
  Select,
  SelectItem,
  Spinner,
  Chip,
  Tabs,
  Tab,
} from "@nextui-org/react";
import { useEffect, useRef, useState } from "react";
import { useMemoizedFn, usePrevious } from "ahooks";

import InteractiveAvatarTextInput from "./InteractiveAvatarTextInput";

import { AVATARS, STT_LANGUAGE_LIST } from "@/app/lib/constants";

type Message = {
  text: string;
  sender: "user" | "ai";
};

export default function InteractiveAvatar() {
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [isLoadingRepeat, setIsLoadingRepeat] = useState(false);
  const [stream, setStream] = useState<MediaStream>();
  const [debug, setDebug] = useState<string>();
  const [knowledgeId, setKnowledgeId] = useState<string>("202aadc9c93a41d1a282d1ec1c16e950");
  const [avatarId, setAvatarId] = useState<string>("");
  const [language, setLanguage] = useState<string>("en");

  const [data, setData] = useState<StartAvatarResponse>();
  const [text, setText] = useState<string>("");
  const mediaStream = useRef<HTMLVideoElement | null>(null);
  const avatar = useRef<StreamingAvatar | null>(null);
  const [chatMode, setChatMode] = useState("text_mode");
  const [isUserTalking, setIsUserTalking] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [currentAiMessage, setCurrentAiMessage] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [interactionCount, setInteractionCount] = useState(0);
  const [textInteractionCount, setTextInteractionCount] = useState(0);
  // const [currentUserMessage, setCurrentUserMessage] = useState("")

  // console.log("currentAiMessage", currentAiMessage);
  const [isAvatarTalking, setIsAvatarTalking] = useState(false);
  const currentAiMessageRef = useRef("");
  const currentUserMessageRef = useRef("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoadingAccessToken, setIsLoadingAccessToken] = useState(false);

  const [messages, setMessages] = useState([
    {
      text: "",
      sender: "",
    },
  ]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    fetchAccessToken().then((data) => {
      setAccessToken(data);
    })
    return () => {
      endSession();
    }
  }, []);

  function baseApiUrl() {
    return process.env.NEXT_PUBLIC_BASE_API_URL;
  }

  async function fetchAccessToken() {
    setIsLoadingAccessToken(true);
    try {
      const response = await fetch("/api/get-access-token", {
        method: "POST",
      });
      const token = await response.text();


      return token;
    } catch (error) {
      console.error("Error fetching access token:", error);
    } finally {
      setIsLoadingAccessToken(false); // Set loading to false
    }

    return "";
  }

  const handleStartSession = async () => {
    const userId = "user_123"
    const sessionId = "session_123";
    try {
      const res = await fetch('/api/session/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, sessionId }),
      });

      const data = await res.json();

    } catch (err) {
      console.error('Error starting session:', err);
    }
  };


  async function startSession() {
    setIsLoadingSession(true);

    avatar.current = new StreamingAvatar({
      token: accessToken,
      basePath: baseApiUrl(),
    });

    avatar.current?.on(StreamingEvents.USER_START, (event) => {
      setIsVoiceMode(true);
      setIsUserTalking(true);
      setInteractionCount(interactionCount + 1);
    });

    avatar.current?.on(StreamingEvents.USER_TALKING_MESSAGE, (event) => {
      console.log(">>>>> User started talking:", event?.detail?.message);
      if (event?.detail?.message) {
        setMessages((prev) => [
          ...prev,
          { text: event?.detail?.message, sender: "user" },
        ]);
        currentUserMessageRef.current = "";
      }
    });

    avatar.current?.on(StreamingEvents.USER_STOP, (event) => {
      setIsVoiceMode(false);
      setIsUserTalking(false);
      console.log("USER-STOPPED-TALKING")

      if (currentUserMessageRef.current) {
        setMessages((prev) => [
          ...prev,
          { text: currentUserMessageRef.current, sender: "user" },
        ]);
        currentUserMessageRef.current = "";
      }
    });
    avatar.current.on(StreamingEvents.AVATAR_START_TALKING, (e) => {
      setIsAvatarTalking(true);
    });

    // avator is talking
    // avatar.current.on(StreamingEvents.AVATAR_TALKING_MESSAGE, (e) => {
    //   if (e.detail?.message) {
    //     const newMessage = currentAiMessageRef.current
    //       ? `${currentAiMessageRef.current}${e.detail.message}`
    //       : e.detail.message;
    //     currentAiMessageRef.current = newMessage;
    //     setCurrentAiMessage(newMessage);
    //   }
    // });

    avatar.current.on(StreamingEvents.AVATAR_TALKING_MESSAGE, (e) => {
      if (e.detail?.message) {
        const newMessage = currentAiMessageRef.current
          ? `${currentAiMessageRef.current} ${e.detail.message}`
          : e.detail.message;

        currentAiMessageRef.current = newMessage;

        // Update the last AI message dynamically
        setMessages((prev) => {
          const updatedMessages = [...prev];
          if (
            updatedMessages.length > 0 &&
            updatedMessages[updatedMessages.length - 1].sender === "ai"
          ) {
            // Update the last AI message
            updatedMessages[updatedMessages.length - 1].text = newMessage;
          } else {
            // Add a new AI message if none exists
            updatedMessages.push({ text: newMessage, sender: "ai" });
          }
          return updatedMessages;
        });

        // Update the current AI message state
        console.log("MESSAGE", newMessage);
        setCurrentAiMessage(newMessage);
      }
    });

    // this  is stope talking
    avatar.current.on(StreamingEvents.AVATAR_STOP_TALKING, (e) => {
      console.log("Avatar stopped talking", e);
      setIsAvatarTalking(false);
    });

    avatar.current.on(StreamingEvents.STREAM_DISCONNECTED, () => {
      console.log("Stream disconnected");
      endSession();
    });

    avatar.current?.on(StreamingEvents.STREAM_READY, (event) => {
      console.log(">>>>> Stream ready:", event.detail);
      setStream(event.detail);
    });

    try {
      const res = await avatar.current.createStartAvatar({
        quality: AvatarQuality.Low,
        avatarName: "5f062eb00a3d4ed2aaba9078965d8b68",
        knowledgeId: knowledgeId, // Or use a custom `knowledgeBase`.
        voice: {
          rate: 1.5, // 0.5 ~ 1.5
          emotion: VoiceEmotion.EXCITED,
          // elevenlabsSettings: {
          //   stability: 1,
          //   similarity_boost: 1,
          //   style: 1,
          //   use_speaker_boost: false,
          // },
        },
        language: language,
        disableIdleTimeout: true,
      });
      setData(res);
      // default to voice mode
      await avatar.current?.startVoiceChat({
        useSilencePrompt: false,
      });
      setChatMode("voice_mode");
    } catch (error) {
      console.error("Error starting avatar session:", error);
    } finally {
      setIsLoadingSession(false);
    }
  }

  // useEffect(() => {
  //   if (currentAiMessageRef.current) {
  //     setMessages((prev) => [
  //       ...prev,
  //       { text: currentAiMessageRef.current, sender: "ai" },
  //     ]);
  //     if (!isAvatarTalking) {
  //       currentAiMessageRef.current = "";
  //     }
  //   }
  // }, [isAvatarTalking]);

  async function handleSpeak() {
    setIsLoadingRepeat(true);
    if (!avatar.current) {
      setDebug("Avatar API not initialized");
      return;
    }

    // speak({ text: text, task_type: TaskType.REPEAT })
    await avatar.current
      .speak({ text: text, taskType: TaskType.TALK, taskMode: TaskMode.SYNC })
      .catch((e) => {
        setDebug(e.message);
      });

    setTextInteractionCount(textInteractionCount + 1);
    setIsLoadingRepeat(false);
    setText("");
  }

  async function handleInterrupt() {
    if (!avatar.current) {
      setDebug("Avatar API not initialized");

      return;
    }
    await avatar.current.interrupt().catch((e) => {
      setDebug(e.message);
    });
  }

  async function endSession() {
    await avatar.current?.stopAvatar();
    avatar.current = null;
    mediaStream.current = null;
    setStream(undefined);
    setIsAvatarTalking(false);
    setIsUserTalking(false);
  }

  const handleChangeChatMode = useMemoizedFn(async (v) => {
    if (v === chatMode) {
      return;
    }
    if (v === "text_mode") {
      avatar.current?.closeVoiceChat();
      setIsVoiceMode(false);
    } else {
      await avatar.current?.startVoiceChat();
    }
    setChatMode(v);
  });

  const previousText = usePrevious(text);

  useEffect(() => {
    if (!previousText && text) {
      avatar.current?.startListening();
    } else if (previousText && !text) {
      avatar?.current?.stopListening();
    }
  }, [text, previousText]);

  console.log("previousText", previousText, text)

  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  useEffect(() => {
    if (stream && mediaStream.current) {
      mediaStream.current.srcObject = stream;
      mediaStream.current.onloadedmetadata = () => {
        mediaStream.current?.play();
        setDebug("Playing");
      };
    }
  }, [mediaStream, stream]);

  // console.log("current message", currentAiMessage);
  const handlePlayVideo = () => {
    if (mediaStream.current) {
      mediaStream.current
        .play()
        .then(() => {
          setDebug("Playing");

          setIsVideoPlaying(true);
        })
        .catch((error) => {
          console.error("Error playing video:", error);
          setDebug("Error playing video");
        });
    }
  };

  const [timeElapsed, setTimeElapsed] = useState(0);

  useEffect(() => {
    if (interactionCount) {
      let timer: any;
      if (!isAvatarTalking && !isUserTalking) {
        timer = setInterval(() => {
          setTimeElapsed(prevTime => prevTime + 1);
        }, 1000)

        return () => clearInterval(timer);
      }

      setTimeElapsed(0)
    }
  }, [isAvatarTalking, isUserTalking])

  useEffect(() => {
    if (timeElapsed >= 60) {
      endSession();
      window.location.reload()
    }
  }, [timeElapsed])

  const [timeElapsedKeypress, setTimeElapsedKeypress] = useState(0);

  useEffect(() => {
    if (textInteractionCount) {
      let timer: any;
      if (!isAvatarTalking && !text) {
        timer = setInterval(() => {
          setTimeElapsedKeypress(prevTime => prevTime + 1);
        }, 1000)

        return () => clearInterval(timer);
      }

      setTimeElapsedKeypress(0)
    }
  }, [isAvatarTalking, text])

  useEffect(() => {
    if (timeElapsedKeypress >= 60) {
      endSession();
      window.location.reload()
    }
  }, [timeElapsedKeypress])

  const formatMessageText = (text?: string): string => {
    if (!text) return '';

    // First handle Markdown links [text](url)
    let formattedText = text.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      (_, text, url) => {
        const cleanUrl = url.replace(/\s+/g, '');
        return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-500 underline">${cleanUrl}</a>`;
      }
    );

    // Then handle plain URLs with protocols
    formattedText = formattedText.replace(
      /(https?:\/\/[^\s]+)/gi,
      (match) => {
        const cleanUrl = match.replace(/\s+/g, '');
        return `<a href="${cleanUrl}">${cleanUrl}</a>`;
      }
    );
    // Finally handle domain names without protocols - ensure no spaces in domain names
    formattedText = formattedText.replace(
      /\b([a-zA-Z0-9-]+\.(?:com|in|org|uk|net|io)[^\s,.]*)\b/gi,
      (match) => {
        if (match.startsWith('http')) return match; // Skip if already processed
        const cleaned = match.replace(/\s+/g, '');
        return `<a href="https://${cleaned}" target="_blank" rel="noopener noreferrer" class="text-blue-500 underline">${cleaned}</a>`;
        // return `${cleaned}`;
      }
    );
    console.log("formattedText", formattedText)
    return formattedText;
  };

  const processTextWithUrls = (text: string): string => {
    // Match either:
    // 1. Markdown-style links [text](url)
    // 2. Plain URLs (http/https or domain with TLD)
    const urlRegex = /(\[(.*?)\]\((.*?)\))|(https?:\/\/[^\s]*|(?:www\.)?[a-zA-Z0-9-]+\s*\.[a-zA-Z]{2,}(?:\.[a-zA-Z]{2})?[^\s]*)/gi;

    return text.replace(urlRegex, (match: string, ...groups: any[]): string => {
      // Handle markdown-style links [text](url)
      if (groups[0]) {  // First capture group exists (markdown link)
        const displayText = groups[1] || '';
        let url = groups[2] || '';

        // Clean URL and ensure proper protocol
        url = url.replace(/\s+/g, '');
        if (!url.startsWith('http')) {
          url = `https://${url}`;
        }

        return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-500 underline">${displayText.trim()}</a>`;
      }

      // Handle plain URLs
      let cleanedUrl = match.replace(/\s+/g, '');

      // Add protocol if missing
      if (!cleanedUrl.startsWith('http')) {
        cleanedUrl = `https://${cleanedUrl}`;
      }

      // Fix any protocol duplication
      cleanedUrl = cleanedUrl
        .replace(/^http(s?):\/\/http(s?):\/\//, 'http$1://')
        .replace(/^https:\/\/https:\/\//, 'https://');

      return `<a href="${cleanedUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-500 underline">${cleanedUrl}</a>`;
    });
  };



  // console.log("isLoadingAccessToken", messagesEndRef, messages)
  return (
    <>
      {/* {!isVideoPlaying && !isLoadingSession && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-md z-50">
          <button
            onClick={async () => {
              await startSession()
              handlePlayVideo();
              ; // Start the session when the button is clicked
            }}
            className="bg-emerald-700 text-white px-6 py-3 rounded-lg text-lg font-semibold shadow-lg hover:bg-emerald-800 transition"
          >
            Chat Now
          </button>
        </div>
      )} */}
      {!isVideoPlaying && !isLoadingSession && (
        <div
          className="absolute inset-0 flex items-center justify-center z-50 w-[100vw]  md:w-full lg:w-full overflow-hidden"
        >

          <div className="h=[75vh] bg-black text-white font-sans">
            {/* Header */}
            {/* Avatar Card */}
            <div className="flex justify-center items-center w-[100%] mt-3 lg:mt-20 md:mt-32">
              <div className="bg-gradient-to-b from-gray-800 to-green-900 pb-4 rounded-[1rem] md:rounded-[2rem] w-[95vw] h-[83vh] md:w-[300px]  md:h-full text-center">
                <div className="pt-6 md:pt-0 bg-gradient-to-b from-[#2c2c2c] to-[#003d2e] rounded-[1rem] md:rounded-[2rem]  mb-4 border-[#046C59] border-[0.5px] h-[73vh] md:h-[60vh]">
                  <img
                    src="/gk_image.png" // Replace with your avatar image or avatar streaming component
                    alt="Avatar"
                    className="rounded-[2rem] mx-auto h-[60vh] md:h-[60vh]"
                  />
                </div>
                {/* <button 
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-md font-semibold mt-4"
          onClick={async () => {
            await startSession()
            handlePlayVideo();
            ; // Start the session when the button is clicked
          }}
          >
            Chat Now
          </button> */}
                <button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white
                   px-6 py-3 rounded-md font-semibold
                    mt-4 relative bottom-4
                       w-[90%]
                     md:mt-4"
                  onClick={async () => {
                    await startSession();
                    handlePlayVideo();
                    // Start the session when the button is clicked
                  }}
                  disabled={isLoadingAccessToken}
                >
                  {isLoadingAccessToken && <svg aria-hidden="true" role="status" className="inline w-6 h-6 me-3 text-white animate-spin" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path  strokeWidth="2" d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="#E5E7EB" />
                    <path  strokeWidth="2" d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentColor" />
                  </svg>}
                  Chat Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {
        isLoadingSession && (
          // <div className="absolute top-0 left-0 w-full h-full bg-black z-10">
          //   {/* <h2 className="text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">

          //   </h2> */}
          //    <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          //    <span className="text-sm text-emerald-600">Loading...</span>
          // </div>
          <div className="absolute top-0 left-0 w-full h-full bg-black z-10 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm text-emerald-600 ml-2">Loading...</span>
          </div>

        )
      }

      <div className={`flex h-screen bg-emerald-950 text-white p-4 font-sans ${!isVideoPlaying && !isLoadingSession ? 'opacity-0' : 'opacity-100'}`}>
        <div className="flex flex-col w-full max-w-6xl mx-auto rounded-lg bg-emerald-950 border border-emerald-800">
          <div className="flex flex-col md:flex-row flex-1 overflow-auto md:overflow-hidden">
            {/* Left Side */}
            <div className="w-full md:w-1/3 border-b md:border-r border-emerald-800 flex flex-col items-center justify-center bg-emerald-950 p-4">
              {stream ? (
                <>
                  <div className="pl-6 bg-black  md:overflow-hidden rounded-[3%] md:rounded-[5%] w-[10rem] md:w-[11rem] lg:w-[17rem] h-[12rem] md:h-[23rem] mt-5 md:my-8 border-4 border-emerald-700 relative ">
                    <video
                      ref={mediaStream}
                      autoPlay
                      playsInline
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        borderRadius: "5%",
                        // marginTop: "2rem"
                      }}
                    >
                      <track kind="captions" />
                    </video>

                  </div>
                  <div className="relative w-24 md:w-32 h-24 md:h-32 flex items-center justify-center">
                    <div className="absolute w-14 md:w-24 h-14 md:h-24 bg-cyan-400 opacity-20 rounded-full blur-xl"></div>
                    <div className="absolute w-10 md:w-20 h-1 md:h-1 bg-cyan-400 opacity-30"></div>
                    <div className="absolute transform rotate-45 w-10 md:w-20 h-1 md:h-1 bg-cyan-400 opacity-30"></div>
                    <div className="absolute transform -rotate-45 w-10 md:w-20 h-1 md:h-1 bg-cyan-400 opacity-30"></div>
                  </div>
                </>
              ) : (
                <div className="w-full flex justify-center items-center h-[13rem]">
                  <Spinner color="success" size="lg" />
                  {/* <p>Loading...</p> */}
                </div>
              )}
            </div>

            {/* Chat Area */}
            <div className="w-full md:w-2/3 flex flex-col h-screen md:h-auto mb-[3rem] md:mb-0">
              {/* <div className="flex-1 overflow-y-auto p-4">
                {messages.map((message, index) => (
                  <>
                    {message?.text && (
                      <div
                        key={index}
                        className={`mb-4 flex ${message.sender === "user"
                          ? "justify-end"
                          : "justify-start"
                          }`}
                      >
                        <div
                          className={`rounded-lg p-4 max-w-md ${message.sender === "user"
                            ? "bg-green-200 text-black"
                            : "bg-white text-gray-800"
                            }`}
                        >
                          <div
                            dangerouslySetInnerHTML={{
                              __html: message.text
                                .replace(/\s+/g, " ") // Normalize spaces in the text
                                .replace(
                                  /(https?:\/\/[^\s]+|[a-zA-Z0-9.-]+\s*\.com\b)/g, // Match URLs starting with http/https or domains ending with .com
                                  (match) => {
                                    const cleanedMatch = match.replace(/\s+/g, ""); // Remove spaces from the match
                                    const url = cleanedMatch.startsWith("http") ? cleanedMatch : `https://${cleanedMatch}`;
                                    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-500 underline">${cleanedMatch}</a>`;
                                  }
                                ),
                            }}
                            className="text-[0.8rem] md:text-sm leading-relaxed"
                          ></div>
                        </div>
                      </div>
                    )}
                  </>
                ))}

                {isUserTalking && (
                  <div className="flex justify-center items-center my-4">
                    <div className="bg-emerald-800 rounded-full px-6 py-2 flex items-center animate-pulse">
                      <div className="mr-2 w-2 h-2 bg-red-500 rounded-full"></div>
                      <span className="text-sm">Listening...</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>  */}

              {/* <div className="flex-1 overflow-y-auto p-4">
                {messages.map((message, index) => (
                  <>
                    {message?.text && (
                      <div
                        key={index}
                        className={`mb-4 flex ${message.sender === "user" ? "justify-end" : "justify-start"
                          }`}
                      >
                        <div
                          className={`rounded-lg p-4 max-w-md ${message.sender === "user"
                              ? "bg-green-200 text-black"
                              : "bg-white text-gray-800"
                            }`}
                        >
                          <div
                            dangerouslySetInnerHTML={{
                              __html: message.text
                                .replace(/\s+/g, " ") // Normalize spaces
                                // First convert Markdown links [text](url)
                                .replace(
                                  /\[([^\]]+)\]\(([^)]+)\)/g,
                                  (match, text, url) => {
                                    const cleanUrl = url.replace(/\s+/g, '');
                                    return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-500 underline">${text}</a>`;
                                    // return "Sajal";
                                  }
                                )
                                // Then handle plain URLs with protocols
                                .replace(
                                  /(https?:\/\/[^\s]+)/gi,
                                  (match) => `
                                  <a href="${match.replace(/\s+/g, '')}" target="_blank" rel="noopener noreferrer" class="text-blue-500 underline">
                                  
                                  ${match.replace(/\s+/g, '')}
                                  
                                  </a>`
                                )
                                // Finally handle domain names without protocols
                                .replace(
                                  /\b([a-zA-Z0-9-]+\.(?:com|in|org|uk|net|io)[^\s]*)\b/gi,
                                  (match) => {
                                    const cleaned = match.replace(/\s+/g, '');
                                    return `<a href="https://${cleaned}" target="_blank" rel="noopener noreferrer" class="text-blue-500 underline">${cleaned}</a>`;
                                  }
                                )
                            }}
                            className="text-[0.8rem] md:text-sm leading-relaxed"
                          ></div>
                        </div>
                      </div>
                    )}
                  </>
                ))}

                {isUserTalking && (
                  <div className="flex justify-center items-center my-4">
                    <div className="bg-emerald-800 rounded-full px-6 py-2 flex items-center animate-pulse">
                      <div className="mr-2 w-2 h-2 bg-red-500 rounded-full"></div>
                      <span className="text-sm">Listening...</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div> */}
              {/* 
<div className="flex-1 overflow-y-auto p-4">
      {messages.map((message, index) => (
        <>
          {message?.text && (
            <div
              className={`mb-4 flex ${
                message.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`rounded-lg p-4 max-w-md ${
                  message.sender === "user"
                    ? "bg-green-200 text-black"
                    : "bg-white text-gray-800"
                }`}
              >
                <div
                  dangerouslySetInnerHTML={{
                    __html: formatMessageText(message.text)
                  }}
                  className="text-[0.8rem] md:text-sm leading-relaxed"
                />
              </div>
            </div>
          )}
        </>
      ))}
      
      {isUserTalking && (
        <div className="flex justify-center items-center my-4">
          <div className="bg-emerald-800 rounded-full px-6 py-2 flex items-center animate-pulse">
            <div className="mr-2 w-2 h-2 bg-red-500 rounded-full"></div>
            <span className="text-sm">Listening...</span>
          </div>
        </div>
      )}
      
      <div ref={messagesEndRef} />
    </div> */}

              <div className="flex-1 overflow-y-auto p-4">
                {messages.map((message, index) => (
                  <>
                    {message?.text && (
                      <div
                        key={index}
                        className={`mb-4 flex ${message.sender === "user" ? "justify-end" : "justify-start"
                          }`}
                      >
                        <div
                          className={`rounded-lg p-4 max-w-md ${message.sender === "user"
                            ? "bg-green-200 text-black"
                            : "bg-white text-gray-800"
                            }`}
                        >
                          <div
                            dangerouslySetInnerHTML={{
                              __html: processTextWithUrls(message.text),
                            }}
                            className="text-[0.8rem] md:text-sm leading-relaxed"
                          ></div>
                        </div>
                      </div>
                    )}
                  </>
                ))}
                <div ref={messagesEndRef} />
              </div>











              <div className="fixed bottom-0 right-0 md:relative w-full  p-4 bg-emerald-950 border-t border-emerald-800">
                <div className="flex items-center">
                  <div className="hidden w-10 h-10 bg-emerald-700 rounded-full flex-shrink-0 md:flex md:items-center md:justify-center">
                    <span className="text-xs">You</span>
                  </div>
                  <div className="flex-1 mx-3">
                    <div className="bg-emerald-900 rounded-full px-4 py-2 flex items-center">
                      <input
                        type="text"
                        placeholder="Ask me Anything?"
                        className="bg-transparent border-none outline-none w-full text-white"
                        value={text}
                        onChange={(e) => {
                          setText(e.target.value);
                          setTimeout(() => {
                            handleChangeChatMode("text_mode");
                          }, 1000);
                        }}
                        onKeyDown={(e) => e.key === "Enter" && handleSpeak()}
                        disabled={!stream}
                      />
                      {isLoadingRepeat ? (
                        <Spinner color="success" size="sm" />
                      ) : (
                        // "Load"
                        <button
                          className="ml-2 text-white hover:text-emerald-300 transition-colors"
                          onClick={handleSpeak}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                          </svg>
                        </button>
                      )}
                      <button
                        className={`ml-2 transition-colors ${isVoiceMode
                          ? "text-red-500"
                          : "text-white hover:text-emerald-300"
                          }`}
                        onClick={() => {
                          handleChangeChatMode("voice_mode");
                          setIsVoiceMode(true);
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
